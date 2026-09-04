'use strict';
// Tagesplan, Lernsessions, Lektionen, Fälle, Fortschritt.
// Die Paywall sitzt genau dort, wo der personalisierte Tagesplan entsteht (Kapitel 7).

const express = require('express');
const db = require('../db');
const config = require('../config');
const auth = require('../lib/auth');
const content = require('../lib/content');
const mastery = require('../lib/mastery');
const scheduler = require('../lib/scheduler');
const readiness = require('../lib/readiness');
const casescore = require('../lib/casescore');
const analytics = require('../lib/analytics');
const { grade } = require('./diagnostic');
const { now, json, daysBetween, shuffle, id } = require('../lib/util');

const router = express.Router();
router.use(auth.requireUser);

// --------------------------------------------------------------------------
// Fortschritt
// --------------------------------------------------------------------------
function masteryRows(userId) {
  const rows = db.prepare(`
    SELECT t.id, t.name, t.subject, t.exam_weight,
           COALESCE(m.value, 0.25) value, COALESCE(m.attempts, 0) attempts, m.updated_at
    FROM topics t LEFT JOIN mastery m ON m.topic_id = t.id AND m.user_id = ?
    ORDER BY t.ord`).all(userId);
  // Zeitlichen Verfall beim Lesen anwenden, nicht per Hintergrundjob.
  for (const r of rows) {
    if (r.updated_at) r.value = mastery.decay(r.value, daysBetween(r.updated_at, now()));
  }
  return rows;
}

router.get('/fortschritt', (req, res) => {
  const rows = masteryRows(req.user.id);
  const beruehrt = rows.filter((r) => r.attempts > 0).length;
  const fällig = db.prepare('SELECT COUNT(*) c FROM srs WHERE user_id = ? AND due_at <= ?')
    .get(req.user.id, now()).c;

  res.json({
    themen: rows.map((r) => ({ id: r.id, name: r.name, subject: r.subject,
      mastery: Math.round(r.value * 100), gewicht: r.exam_weight, versuche: r.attempts })),
    readiness: {
      wert: readiness.score(rows, beruehrt, rows.length),
      kalibriert: readiness.calibrated,
      anzeigehinweis: readiness.DISPLAY_NOTE
    },
    faelligeWiederholungen: fällig,
    abdeckung: { beruehrt, gesamt: rows.length }
  });
});

// --------------------------------------------------------------------------
// Tagesplan
// --------------------------------------------------------------------------
router.get('/plan', (req, res) => {
  const rows = masteryRows(req.user.id);
  const exam = config.EXAM_DATES.find((e) => e.id === req.user.exam_id) || null;
  const tage = exam ? daysBetween(now(), exam.date) : null;
  const fällig = db.prepare('SELECT COUNT(*) c FROM srs WHERE user_id = ? AND due_at <= ?')
    .get(req.user.id, now()).c;

  // Nächste noch nicht abgeschlossene Lektion im schwächsten relevanten Thema.
  const schwach = rows.slice().sort((a, b) => a.value * a.exam_weight - b.value * b.exam_weight);
  const gesehen = new Set(db.prepare(`
      SELECT DISTINCT q.lesson_id l FROM attempts a JOIN questions q ON q.id = a.question_id
      WHERE a.user_id = ? AND q.lesson_id IS NOT NULL`).all(req.user.id).map((r) => r.l));
  let nextLesson = null;
  for (const t of schwach) {
    const l = content.lessons('topic_id = ?', [t.id]).find((x) => !gesehen.has(x.id));
    if (l) { nextLesson = l; break; }
  }
  const caseCandidate = content.cases('topic_id = ?', [schwach[0]?.id || ''])[0]
    || content.cases()[0] || null;

  const blocks = scheduler.buildPlan({
    availableMinutes: req.user.daily_minutes,
    maxBlockMinutes: config.maxBlockMinutes,
    daysToExam: tage,
    dueCount: fällig,
    topics: rows,
    nextLesson,
    caseCandidate
  });

  const bezahlt = auth.hasPaidAccess(req.user);
  if (!bezahlt) analytics.track('paywall_gesehen', { userId: req.user.id });

  res.json({
    exam, tageBisPruefung: tage, tagesminuten: req.user.daily_minutes,
    warnung: content.warnung(),
    bezahlt,
    // Freemium: der erste Block bleibt offen, der Rest ist der Kaufgrund.
    bloecke: bezahlt ? blocks : blocks.map((b, i) => (i === 0 ? b : { ...b, gesperrt: true, payload: null })),
    paywall: bezahlt ? null : {
      titel: 'Dein vollständiger Tagesplan',
      text: 'Der erste Block ist frei. Plan, Wiederholungen, Falltraining und Mock Exams ' +
            'sind Teil des Prüfungspasses.',
      cta: 'Prüfungspass ansehen'
    }
  });
});

// --------------------------------------------------------------------------
// Lernsession
// --------------------------------------------------------------------------
router.post('/session/start', (req, res) => {
  const kind = String(req.body.kind || 'mix');
  const limit = Math.min(40, Math.max(3, Number(req.body.limit) || 10));
  if (kind !== 'mix' && !auth.hasPaidAccess(req.user) && req.body.blockIndex > 0)
    return res.status(402).json({ error: 'zahlung_erforderlich' });

  let qs = [];
  if (kind === 'wiederholung') {
    const due = db.prepare(`SELECT question_id FROM srs WHERE user_id = ? AND due_at <= ?
                            ORDER BY due_at LIMIT ?`).all(req.user.id, now(), limit);
    const ids = due.map((d) => d.question_id);
    if (ids.length) qs = content.questions(`id IN (${ids.map(() => '?').join(',')})`, ids);
  } else if (kind === 'schwachstelle' && req.body.topicId) {
    qs = shuffle(content.questions('topic_id = ?', [req.body.topicId])).slice(0, limit);
  } else {
    // Gemischtes Abrufen, gewichtet zugunsten schwacher und prüfungsrelevanter Themen.
    const rows = masteryRows(req.user.id);
    const gewichtet = rows.flatMap((r) => {
      const n = Math.max(1, Math.round((1 - r.value) * r.exam_weight * 4));
      return Array(n).fill(r.id);
    });
    const ziehung = shuffle(gewichtet).slice(0, limit * 2);
    const pool = content.questions(
      `topic_id IN (${[...new Set(ziehung)].map(() => '?').join(',')})`, [...new Set(ziehung)]);
    qs = shuffle(pool).slice(0, limit);
  }

  if (!qs.length) return res.json({ sessionId: null, fragen: [], hinweis: 'Nichts fällig. Gut so.' });

  const sessionId = id('ls');
  analytics.track('session_gestartet', { userId: req.user.id, props: { kind, anzahl: qs.length } });
  res.json({ sessionId, kind, fragen: qs.map(content.publicQuestion), warnung: content.warnung() });
});

router.post('/session/ende', (req, res) => {
  analytics.track('session_abgeschlossen', {
    userId: req.user.id,
    props: { kind: String(req.body.kind || 'mix').slice(0, 24),
             beantwortet: Number(req.body.beantwortet) || 0 }
  });
  const erste = db.prepare(`SELECT COUNT(*) c FROM events WHERE user_id = ? AND name = 'session_abgeschlossen'`)
    .get(req.user.id).c;
  if (erste === 1) analytics.track('erste_session', { userId: req.user.id });
  res.json({ ok: true });
});

/** Antwort bewerten, Mastery und Wiederholungsplan fortschreiben. */
router.post('/antwort', (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(String(req.body.questionId || ''));
  if (!q) return res.status(404).json({ error: 'frage_unbekannt' });

  const ms = Math.max(0, Number(req.body.ms) || 0);
  const correct = grade(q, req.body.choice);

  db.prepare(`INSERT INTO attempts (user_id, anon_id, question_id, correct, ms, context, created_at)
              VALUES (?,?,?,?,?,?,?)`)
    .run(req.user.id, req.anonId, q.id, correct ? 1 : 0, ms,
         String(req.body.context || 'plan').slice(0, 16), now());

  // Mastery nur aus geprüftem Content fortschreiben, sofern die Sperre aktiv ist.
  const zählt = q.status === 'geprueft' || config.allowUnreviewed;
  let neu = null;
  if (zählt) {
    const cur = db.prepare('SELECT * FROM mastery WHERE user_id = ? AND topic_id = ?')
      .get(req.user.id, q.topic_id) || { value: 0.25, attempts: 0 };
    const value = mastery.update(cur.value, cur.attempts, correct, q.difficulty,
      mastery.guessRate(q.type, json(q.options, []).length));
    db.prepare(`INSERT INTO mastery (user_id, topic_id, value, attempts, updated_at)
                VALUES (?,?,?,?,?)
                ON CONFLICT(user_id, topic_id) DO UPDATE SET value=excluded.value,
                  attempts = mastery.attempts + 1, updated_at = excluded.updated_at`)
      .run(req.user.id, q.topic_id, value, cur.attempts + 1, now());
    neu = Math.round(value * 100);

    const srs = db.prepare('SELECT * FROM srs WHERE user_id = ? AND question_id = ?')
      .get(req.user.id, q.id);
    const next = scheduler.nextReview(srs, scheduler.quality(correct, ms));
    db.prepare(`INSERT INTO srs (user_id, question_id, ease, interval_d, reps, lapses, due_at)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(user_id, question_id) DO UPDATE SET ease=excluded.ease,
                  interval_d=excluded.interval_d, reps=excluded.reps,
                  lapses=excluded.lapses, due_at=excluded.due_at`)
      .run(req.user.id, q.id, next.ease, next.interval_d, next.reps, next.lapses, next.due_at);
  }

  res.json({
    richtig: correct,
    loesung: json(q.answer, null),
    erklaerung: q.explanation,
    mastery: neu,
    geprueft: q.status === 'geprueft'
  });
});

// --------------------------------------------------------------------------
// Lektionen und Fälle
// --------------------------------------------------------------------------
router.get('/lektion/:id', (req, res) => {
  const l = content.lessons('id = ?', [req.params.id])[0];
  if (!l) return res.status(404).json({ error: 'unbekannt' });
  if (!auth.hasPaidAccess(req.user) && l.ord > 11)
    return res.status(402).json({ error: 'zahlung_erforderlich',
      hinweis: 'Die ersten Lektionen sind frei. Danach beginnt der Prüfungspass.' });
  res.json({ ...l, geprueft: l.status === 'geprueft', warnung: content.warnung() });
});

router.get('/fall/:id', (req, res) => {
  const c = content.cases('id = ?', [req.params.id])[0];
  if (!c) return res.status(404).json({ error: 'unbekannt' });
  if (!auth.hasPaidAccess(req.user))
    return res.status(402).json({ error: 'zahlung_erforderlich' });
  const { rubric, ...oeffentlich } = c;   // Raster bleibt serverseitig
  res.json({ ...oeffentlich, dimensionen: casescore.DIMENSIONS });
});

router.post('/fall/:id/abgeben', (req, res) => {
  const c = content.cases('id = ?', [req.params.id])[0];
  if (!c) return res.status(404).json({ error: 'unbekannt' });
  if (!auth.hasPaidAccess(req.user)) return res.status(402).json({ error: 'zahlung_erforderlich' });

  const antwort = String(req.body.antwort || '');
  if (antwort.trim().length < 40)
    return res.status(400).json({ error: 'zu_kurz', hinweis: 'Schreib mindestens ein paar Sätze.' });

  const bewertung = casescore.score(antwort, json(c.rubric, {}));
  db.prepare(`INSERT INTO case_submissions (user_id, case_id, answer, score, created_at)
              VALUES (?,?,?,?,?)`)
    .run(req.user.id, c.id, antwort, JSON.stringify(bewertung), now());

  // Falltraining wirkt nur gedämpft auf die Mastery - das Verfahren ist Anker-Matching,
  // keine inhaltliche Bewertung (siehe lib/casescore.js).
  const cur = db.prepare('SELECT * FROM mastery WHERE user_id = ? AND topic_id = ?')
    .get(req.user.id, c.topic_id) || { value: 0.25, attempts: 0 };
  const ziel = bewertung.total / 100;
  const value = cur.value + (ziel - cur.value) * 0.15;
  db.prepare(`INSERT INTO mastery (user_id, topic_id, value, attempts, updated_at) VALUES (?,?,?,?,?)
              ON CONFLICT(user_id, topic_id) DO UPDATE SET value=excluded.value,
                attempts = mastery.attempts + 1, updated_at = excluded.updated_at`)
    .run(req.user.id, c.topic_id, value, cur.attempts + 1, now());

  analytics.track('fall_abgegeben', { userId: req.user.id, props: { caseId: c.id, total: bewertung.total } });
  res.json(bewertung);
});

// --------------------------------------------------------------------------
// Qualitätsmeldung (Kennzahl "Sachfehler je 100 Fragen", Kapitel 17)
// --------------------------------------------------------------------------
router.post('/sachfehler', (req, res) => {
  const typ = ['question', 'lesson', 'case'].includes(req.body.typ) ? req.body.typ : null;
  if (!typ || !req.body.objektId) return res.status(400).json({ error: 'unvollständig' });
  db.prepare(`INSERT INTO content_flags (object_type, object_id, user_id, anon_id, reason, note, created_at)
              VALUES (?,?,?,?,?,?,?)`)
    .run(typ, String(req.body.objektId), req.user.id, req.anonId,
         String(req.body.grund || 'sachfehler').slice(0, 40),
         String(req.body.notiz || '').slice(0, 1000), now());
  analytics.track('sachfehler_gemeldet', { userId: req.user.id, props: { typ } });
  res.json({ ok: true, hinweis: 'Danke. Die Meldung geht in die fachliche Prüfung.' });
});

/** Freiwillig gemeldetes Prüfungsergebnis - Grundlage der Score-Kalibrierung. */
router.post('/pruefungsergebnis', (req, res) => {
  const rows = masteryRows(req.user.id);
  const beruehrt = rows.filter((r) => r.attempts > 0).length;
  db.prepare(`INSERT INTO exam_results (user_id, exam_id, passed, points, readiness_at_exam, created_at)
              VALUES (?,?,?,?,?,?)`)
    .run(req.user.id, req.user.exam_id || 'unbekannt',
         req.body.bestanden === true ? 1 : req.body.bestanden === false ? 0 : null,
         req.body.punkte === undefined ? null : Number(req.body.punkte),
         readiness.score(rows, beruehrt, rows.length), now());
  analytics.track('pruefungsergebnis_gemeldet', { userId: req.user.id });
  res.json({ ok: true, hinweis: 'Danke - das kalibriert den Score für alle nachfolgenden Jahrgänge.' });
});

module.exports = router;
