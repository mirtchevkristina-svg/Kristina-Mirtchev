'use strict';
// Anmeldung per Einmal-Link. Kein Passwort - die Zielgruppe tippt am Handy keines.
//
// HINWEIS: Der Versand ist bewusst NICHT implementiert. In der Entwicklung wird
// der Link in der Antwort und in der Konsole ausgegeben. Vor dem Launch ist ein
// Versanddienst anzubinden; der Link darf dann NICHT mehr in der Antwort stehen.

const express = require('express');
const db = require('../db');
const config = require('../config');
const auth = require('../lib/auth');
const analytics = require('../lib/analytics');
const { id, now, addDays, json } = require('../lib/util');

const router = express.Router();
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

router.post('/anfordern', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'email_ungueltig' });

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const neu = !user;
  if (!user) {
    const uid = id('u');
    db.prepare(`INSERT INTO users (id, email, created_at, anon_id, age_bracket)
                VALUES (?,?,?,?,?)`)
      .run(uid, email, now(), req.anonId, req.body.ueber18 === true ? '18plus' : null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    analytics.track('registriert', { userId: uid, anonId: req.anonId });
    uebernehmeDiagnostic(uid, req.anonId);
  }

  const token = id('m');
  db.prepare(`INSERT INTO auth_tokens (token, user_id, purpose, created_at, expires_at)
              VALUES (?,?,'login',?,?)`)
    .run(token, user.id, now(), addDays(now(), 0.02)); // ~30 Minuten

  const link = `/api/auth/einloesen?token=${token}`;
  if (!config.isProd) console.log(`\n[Anmeldelink für ${email}] ${link}\n`);
  res.json({
    ok: true, neu,
    // Nur in der Entwicklung. In Produktion verschickt ein Mailversand den Link.
    entwicklungsLink: config.isProd ? undefined : link,
    hinweis: config.isProd
      ? 'Wir haben dir einen Anmeldelink geschickt.'
      : 'Entwicklungsmodus: Der Anmeldelink steht in der Antwort und in der Serverkonsole.'
  });
});

/** Diagnostic-Ergebnis in Mastery übersetzen, sobald ein Konto entsteht. */
function uebernehmeDiagnostic(userId, anonId) {
  const run = db.prepare(`SELECT * FROM diagnostic_runs WHERE anon_id = ? AND result IS NOT NULL
                          ORDER BY finished_at DESC LIMIT 1`).get(anonId);
  if (!run) return;
  db.prepare('UPDATE diagnostic_runs SET user_id = ? WHERE id = ?').run(userId, run.id);
  db.prepare('UPDATE attempts SET user_id = ? WHERE anon_id = ? AND user_id IS NULL').run(userId, anonId);

  const answers = json(run.answers, []);
  const perTopic = {};
  for (const a of answers) {
    (perTopic[a.topicId] ||= { r: 0, g: 0 });
    perTopic[a.topicId].g++; if (a.correct) perTopic[a.topicId].r++;
  }
  const ins = db.prepare(`INSERT INTO mastery (user_id, topic_id, value, attempts, updated_at)
                          VALUES (?,?,?,?,?) ON CONFLICT(user_id, topic_id) DO NOTHING`);
  for (const [topicId, v] of Object.entries(perTopic)) {
    // Wenige Fragen je Thema: Startwert bewusst zur Mitte gezogen, nicht 0 oder 1.
    const roh = v.r / v.g;
    const value = 0.25 + (roh - 0.25) * Math.min(1, v.g / 4);
    ins.run(userId, topicId, Math.max(0.05, Math.min(0.9, value)), v.g, now());
  }
  if (run.exam_id) db.prepare('UPDATE users SET exam_id = ? WHERE id = ?').run(run.exam_id, userId);
}

router.get('/einloesen', (req, res) => {
  const row = db.prepare(`SELECT * FROM auth_tokens WHERE token = ? AND purpose = 'login'`)
    .get(String(req.query.token || ''));
  if (!row || row.used_at || new Date(row.expires_at) < new Date())
    return res.status(400).send('Der Anmeldelink ist abgelaufen oder wurde bereits verwendet.');

  db.prepare('UPDATE auth_tokens SET used_at = ? WHERE token = ?').run(now(), row.token);
  auth.setSessionCookie(res, auth.createSession(row.user_id));
  res.redirect('/#/plan');
});

router.post('/abmelden', (req, res) => {
  res.clearCookie(auth.COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/ich', (req, res) => {
  if (!req.user) return res.json({ angemeldet: false });
  const { id: uid, email, exam_id, daily_minutes, tier, access_until, age_bracket } = req.user;
  res.json({
    angemeldet: true,
    nutzer: { id: uid, email, examId: exam_id, tagesminuten: daily_minutes, tier,
              zugangBis: access_until, altersgruppe: age_bracket,
              zahlenderZugang: auth.hasPaidAccess(req.user) }
  });
});

router.post('/einstellungen', auth.requireUser, (req, res) => {
  const minutes = Math.max(5, Math.min(120, Number(req.body.tagesminuten) || req.user.daily_minutes));
  const examId = config.EXAM_DATES.find((e) => e.id === req.body.examId)?.id || req.user.exam_id;
  db.prepare('UPDATE users SET daily_minutes = ?, exam_id = ? WHERE id = ?')
    .run(minutes, examId, req.user.id);
  res.json({ ok: true, tagesminuten: minutes, examId });
});

/** Löschung des eigenen Kontos (Art 17 DSGVO). Kaskadiert über die Fremdschlüssel. */
router.post('/konto-loeschen', auth.requireUser, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.clearCookie(auth.COOKIE, { path: '/' });
  res.json({ ok: true, hinweis: 'Konto und Lerndaten wurden gelöscht.' });
});

module.exports = router;
