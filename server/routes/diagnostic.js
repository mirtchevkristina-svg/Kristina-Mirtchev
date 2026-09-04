'use strict';
// Der kostenlose Diagnostic - der einzige Umfang für den 2. Oktober 2026 (Kapitel 15).
// Kein Konto, keine Paywall. Zweck ist ausschließlich: messen.

const express = require('express');
const db = require('../db');
const config = require('../config');
const content = require('../lib/content');
const analytics = require('../lib/analytics');
const { id, now, shuffle, json, clamp } = require('../lib/util');

const router = express.Router();

/**
 * Zieht `count` Fragen geschichtet nach Fach, damit jedes Fach im Ergebnisprofil
 * eine belastbare Basis hat. Innerhalb des Fachs wird nach Schwierigkeit gemischt:
 * leicht beginnen, damit der Abbruch in den ersten Fragen niedrig bleibt.
 */
function pickQuestions(count) {
  const pool = content.questions('in_diagnostic = 1');
  const bySubject = new Map();
  const topicSubject = new Map(
    db.prepare('SELECT id, subject FROM topics').all().map((t) => [t.id, t.subject])
  );
  for (const q of pool) {
    const s = topicSubject.get(q.topic_id) || 'sonstiges';
    if (!bySubject.has(s)) bySubject.set(s, []);
    bySubject.get(s).push(q);
  }
  const subjects = [...bySubject.keys()];
  const perSubject = Math.floor(count / subjects.length);
  let picked = [];
  for (const s of subjects) picked.push(...shuffle(bySubject.get(s)).slice(0, perSubject));
  // Rest auffüllen
  const rest = shuffle(pool.filter((q) => !picked.find((p) => p.id === q.id)));
  picked.push(...rest.slice(0, Math.max(0, count - picked.length)));

  // Leichte Fragen zuerst, danach durchmischt.
  picked.sort((a, b) => a.difficulty - b.difficulty);
  const head = picked.slice(0, 3);
  return [...head, ...shuffle(picked.slice(3))];
}

router.post('/start', (req, res) => {
  const examId = req.body.examId || config.EXAM_DATES.find((e) => new Date(e.date) > new Date())?.id;
  const qs = pickQuestions(config.diagnostic.questionCount);
  if (qs.length < 5) {
    return res.status(503).json({ error: 'zu_wenig_fragen',
      hinweis: 'Der Fragenbestand reicht für einen Diagnostic nicht aus. npm run seed ausführen.' });
  }
  const runId = id('d');
  db.prepare(`INSERT INTO diagnostic_runs (id, anon_id, user_id, exam_id, question_ids, started_at)
              VALUES (?,?,?,?,?,?)`)
    .run(runId, req.anonId, req.user?.id || null, examId, JSON.stringify(qs.map((q) => q.id)), now());

  analytics.track('diagnostic_gestartet', { anonId: req.anonId, userId: req.user?.id, props: { examId } });

  res.json({
    runId, examId,
    exam: config.EXAM_DATES.find((e) => e.id === examId) || null,
    zielSekunden: config.diagnostic.targetSeconds,
    warnung: content.warnung(),
    fragen: qs.map(content.publicQuestion)
  });
});

/** Antwort speichern. Bewertung erfolgt hier, damit das Frontend keine Loesung kennt. */
router.post('/answer', (req, res) => {
  const { runId, questionId, choice, ms } = req.body;
  const run = db.prepare('SELECT * FROM diagnostic_runs WHERE id = ?').get(runId);
  if (!run) return res.status(404).json({ error: 'lauf_unbekannt' });
  if (run.anon_id !== req.anonId) return res.status(403).json({ error: 'kein_zugang' });
  if (run.finished_at) return res.status(409).json({ error: 'bereits_abgeschlossen' });
  if (!json(run.question_ids, []).includes(questionId))
    return res.status(400).json({ error: 'frage_nicht_teil_des_laufs' });

  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!q) return res.status(404).json({ error: 'frage_unbekannt' });

  const correct = grade(q, choice);
  const answers = json(run.answers, []).filter((a) => a.questionId !== questionId);
  answers.push({ questionId, choice, correct, ms: Number(ms) || 0, topicId: q.topic_id });
  db.prepare('UPDATE diagnostic_runs SET answers = ? WHERE id = ?')
    .run(JSON.stringify(answers), runId);
  db.prepare(`INSERT INTO attempts (user_id, anon_id, question_id, correct, ms, context, created_at)
              VALUES (?,?,?,?,?, 'diagnostic', ?)`)
    .run(run.user_id, req.anonId, questionId, correct ? 1 : 0, Number(ms) || 0, now());

  // Im Diagnostic bewusst OHNE sofortige Aufloesung: das Ergebnis kommt am Ende.
  res.json({ ok: true, beantwortet: answers.length });
});

function grade(q, choice) {
  const answer = json(q.answer, null);
  if (q.type === 'norm') {
    const normalise = (s) => String(s || '').toLowerCase().trim()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
    const given = normalise(choice);
    return (Array.isArray(answer) ? answer : [answer]).some((a) => normalise(a) === given);
  }
  return Number(choice) === Number(answer);
}

router.post('/finish', (req, res) => {
  const run = db.prepare('SELECT * FROM diagnostic_runs WHERE id = ?').get(req.body.runId);
  if (!run) return res.status(404).json({ error: 'lauf_unbekannt' });
  if (run.anon_id !== req.anonId) return res.status(403).json({ error: 'kein_zugang' });

  const result = run.finished_at ? json(run.result, null) : buildResult(run);
  if (!run.finished_at) {
    const token = id('k');
    db.prepare('UPDATE diagnostic_runs SET result = ?, finished_at = ?, share_token = ? WHERE id = ?')
      .run(JSON.stringify(result), now(), token, run.id);
    result.shareToken = token;
    analytics.track('diagnostic_abgeschlossen', {
      anonId: req.anonId, userId: run.user_id,
      props: { gesamt: result.gesamt, fragen: result.beantwortet }
    });
    analytics.track('ergebniskarte_erzeugt', { anonId: req.anonId, userId: run.user_id });
  } else {
    result.shareToken = run.share_token;
  }
  res.json(result);
});

/** Fachprofil, schwächste Themen und Empfehlung. */
function buildResult(run) {
  const answers = json(run.answers, []);
  const topics = db.prepare('SELECT id, name, subject, exam_weight FROM topics').all();
  const byId = new Map(topics.map((t) => [t.id, t]));

  const perSubject = {};
  const perTopic = {};
  for (const a of answers) {
    const t = byId.get(a.topicId); if (!t) continue;
    (perSubject[t.subject] ||= { richtig: 0, gesamt: 0, name: t.subject });
    perSubject[t.subject].gesamt++; if (a.correct) perSubject[t.subject].richtig++;
    (perTopic[t.id] ||= { richtig: 0, gesamt: 0, name: t.name, weight: t.exam_weight });
    perTopic[t.id].gesamt++; if (a.correct) perTopic[t.id].richtig++;
  }

  const faecher = Object.entries(perSubject).map(([key, v]) => ({
    key, label: SUBJECT_LABEL[key] || key,
    prozent: Math.round((v.richtig / v.gesamt) * 100), richtig: v.richtig, gesamt: v.gesamt
  })).sort((a, b) => a.prozent - b.prozent);

  const schwaechen = Object.entries(perTopic)
    .map(([tid, v]) => ({ topicId: tid, name: v.name,
      prozent: Math.round((v.richtig / v.gesamt) * 100), hebel: (1 - v.richtig / v.gesamt) * v.weight }))
    .sort((a, b) => b.hebel - a.hebel).slice(0, 3);

  const richtig = answers.filter((a) => a.correct).length;
  const gesamt = answers.length || 1;
  const exam = config.EXAM_DATES.find((e) => e.id === run.exam_id);
  const tage = exam ? Math.max(0, Math.round((new Date(exam.date) - new Date()) / 86400000)) : null;

  return {
    runId: run.id,
    beantwortet: answers.length,
    richtig,
    gesamt: Math.round((richtig / gesamt) * 100),
    faecher, schwaechen,
    tageBisPruefung: tage,
    exam: exam || null,
    // Kapitel 17: ausdrücklich KEINE Bestehensprognose.
    hinweis: 'Momentaufnahme über ' + answers.length + ' Fragen. Das ist ein Ausgangswert, ' +
             'keine Prognose über das Bestehen der Prüfung.',
    empfehlung: schwaechen.length
      ? `Beginne bei "${schwaechen[0].name}" - dort liegt gemessen an der Prüfungsrelevanz der größte Hebel.`
      : 'Zu wenige Antworten für eine Empfehlung.'
  };
}

const SUBJECT_LABEL = {
  methodenlehre: 'Methodenlehre', zivilrecht: 'Zivilrecht',
  oeffentliches: 'Öffentliches Recht', strafrecht: 'Strafrecht', grundlagen: 'Grundlagen'
};

router.get('/result/:token', (req, res) => {
  const run = db.prepare('SELECT * FROM diagnostic_runs WHERE share_token = ?').get(req.params.token);
  if (!run || !run.result) return res.status(404).json({ error: 'unbekannt' });
  const r = json(run.result, {});
  // Geteilte Karte zeigt nur aggregierte Werte - keine Einzelantworten.
  res.json({ gesamt: r.gesamt, faecher: r.faecher, tageBisPruefung: r.tageBisPruefung,
             exam: r.exam, beantwortet: r.beantwortet });
});

router.post('/shared', (req, res) => {
  analytics.track('ergebniskarte_geteilt', { anonId: req.anonId, props: { kanal: String(req.body.kanal || 'unbekannt').slice(0, 24) } });
  res.json({ ok: true });
});

/** Warteliste - der eigentliche Ertrag des Oktober-Zyklus (Kapitel 15). */
router.post('/warteliste', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email))
    return res.status(400).json({ error: 'email_ungueltig' });
  if (req.body.consent !== true)
    return res.status(400).json({ error: 'einwilligung_erforderlich',
      hinweis: 'Ohne ausdrückliche Einwilligung keine Speicherung (Art 6 Abs 1 lit a DSGVO).' });

  db.prepare(`INSERT INTO waitlist (email, exam_id, anon_id, consent, created_at) VALUES (?,?,?,1,?)
              ON CONFLICT(email) DO UPDATE SET exam_id = excluded.exam_id`)
    .run(email, req.body.examId || null, req.anonId, now());
  analytics.track('warteliste_eingetragen', { anonId: req.anonId });
  res.json({ ok: true });
});

module.exports = router;
module.exports.grade = grade;
module.exports.SUBJECT_LABEL = SUBJECT_LABEL;
