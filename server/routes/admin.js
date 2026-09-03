'use strict';
// Backoffice für das juristische Review (Kapitel 8: der Engpass ist Review, nicht Code)
// und für die Kennzahlen aus Kapitel 17.
//
// Zugang über ADMIN_TOKEN. Das ist für ein Zweipersonenteam angemessen, aber
// KEIN Ersatz für echte Rollen, sobald zugekaufte Reviewkapazität mitarbeitet.

const express = require('express');
const db = require('../db');
const config = require('../config');
const auth = require('../lib/auth');
const analytics = require('../lib/analytics');
const { now } = require('../lib/util');

const router = express.Router();
router.use(auth.requireAdmin);

const TABELLEN = { question: 'questions', lesson: 'lessons', case: 'cases' };
const STATUS = ['entwurf', 'ki_erstellt', 'in_pruefung', 'geprueft', 'gesperrt'];

/** Warteschlange: was fehlt bis zur vollständigen Freigabe? */
router.get('/queue', (req, res) => {
  const zaehl = (t) => db.prepare(
    `SELECT status, COUNT(*) c FROM ${t} GROUP BY status`).all()
    .reduce((o, r) => (o[r.status] = r.c, o), {});

  const offen = db.prepare(`
    SELECT 'question' typ, id, topic_id, stem titel, status, version FROM questions WHERE status != 'geprueft'
    UNION ALL
    SELECT 'lesson', id, topic_id, title, status, version FROM lessons WHERE status != 'geprueft'
    UNION ALL
    SELECT 'case', id, topic_id, title, status, version FROM cases WHERE status != 'geprueft'
    LIMIT 500`).all();

  // Kapazitätsrechnung aus Kapitel 8 - der eigentliche Projektplan.
  const prüfzeit = { question: 3, lesson: 60, case: 35 };  // Minuten je Einheit, Mittelwerte
  const minuten = offen.reduce((s, o) => s + (prüfzeit[o.typ] || 5), 0);

  res.json({
    bestand: { fragen: zaehl('questions'), lektionen: zaehl('lessons'), faelle: zaehl('cases') },
    offen: offen.slice(0, 200),
    offenGesamt: offen.length,
    geschaetzterPruefaufwand: {
      stunden: Math.round(minuten / 60 * 10) / 10,
      hinweis: 'SCHAETZUNG auf Basis der Kapazitätsrechnung in Kapitel 8. ' +
               'Bei 8 bis 10 Stunden je Woche entspricht das ' +
               Math.ceil(minuten / 60 / 9) + ' Wochen für eine Person.'
    },
    ausspielungUngeprueft: config.allowUnreviewed
  });
});

router.get('/objekt/:typ/:id', (req, res) => {
  const t = TABELLEN[req.params.typ];
  if (!t) return res.status(400).json({ error: 'typ_unbekannt' });
  const row = db.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'unbekannt' });
  res.json(row);
});

/** Freigabe oder Sperre. Der Pruefer wird namentlich festgehalten (Kapitel 5 und 8). */
router.post('/review', (req, res) => {
  const t = TABELLEN[req.body.typ];
  if (!t) return res.status(400).json({ error: 'typ_unbekannt' });
  if (!STATUS.includes(req.body.status)) return res.status(400).json({ error: 'status_unbekannt' });
  const pruefer = String(req.body.pruefer || '').trim();
  if (req.body.status === 'geprueft' && !pruefer)
    return res.status(400).json({ error: 'pruefer_erforderlich',
      hinweis: 'Eine Freigabe ohne benannten Pruefer ist wertlos - das Versprechen lautet ' +
               '"KI-erstellt, anwaltlich geprueft".' });

  const info = db.prepare(`UPDATE ${t} SET status = ?, reviewer = ?, source = COALESCE(?, source),
                           reviewed_at = ? WHERE id = ?`)
    .run(req.body.status, pruefer || null, req.body.quelle || null, now(), String(req.body.id));
  if (!info.changes) return res.status(404).json({ error: 'unbekannt' });
  res.json({ ok: true });
});

/** Stapelfreigabe eines ganzen Themas - spart im Review echte Zeit. */
router.post('/review-thema', (req, res) => {
  const pruefer = String(req.body.pruefer || '').trim();
  if (!pruefer) return res.status(400).json({ error: 'pruefer_erforderlich' });
  const topicId = String(req.body.topicId || '');
  let n = 0;
  for (const t of Object.values(TABELLEN)) {
    n += db.prepare(`UPDATE ${t} SET status = 'geprueft', reviewer = ?, reviewed_at = ?
                     WHERE topic_id = ? AND status != 'gesperrt'`)
      .run(pruefer, now(), topicId).changes;
  }
  res.json({ ok: true, freigegeben: n });
});

router.get('/meldungen', (req, res) => {
  res.json(db.prepare(`
    SELECT f.*, COALESCE(q.stem, l.title, c.title) titel
    FROM content_flags f
    LEFT JOIN questions q ON f.object_type = 'question' AND q.id = f.object_id
    LEFT JOIN lessons   l ON f.object_type = 'lesson'   AND l.id = f.object_id
    LEFT JOIN cases     c ON f.object_type = 'case'     AND c.id = f.object_id
    ORDER BY f.created_at DESC LIMIT 200`).all());
});

router.post('/meldung/:id', (req, res) => {
  const status = ['offen', 'bestaetigt', 'verworfen'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'status_unbekannt' });
  db.prepare('UPDATE content_flags SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  // Bestätigter Sachfehler sperrt das Objekt sofort - Abbruchkriterium Kapitel 14.
  if (status === 'bestaetigt') {
    const f = db.prepare('SELECT * FROM content_flags WHERE id = ?').get(Number(req.params.id));
    const t = TABELLEN[f.object_type];
    if (t) db.prepare(`UPDATE ${t} SET status = 'gesperrt' WHERE id = ?`).run(f.object_id);
  }
  res.json({ ok: true });
});

/** Kennzahlen inkl. Deckungsbeitrag - die Rechnung aus Kapitel 9 und 10, mit Ist-Zahlen. */
router.get('/kennzahlen', (req, res) => {
  const kaeufe = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(price_cents),0) cents
                             FROM orders WHERE status = 'bezahlt'`).get();
  const VARIABEL_CENT = 480;   // EUR 4,80 je zahlendem Nutzer (Kapitel 9)
  const AUFBAU_CENT = 1500000; // EUR 15.000, Variante A Eigenentwicklung

  const db_gesamt = kaeufe.cents - kaeufe.n * VARIABEL_CENT;
  const dbJeNutzer = kaeufe.n ? Math.round(db_gesamt / kaeufe.n) : null;

  res.json({
    kpis: analytics.kpis(),
    leitkennzahl: {
      name: 'Wöchentlicher Mastery-Zuwachs',
      wert: analytics.masteryZuwachsProWoche(),
      hinweis: 'Punkte je aktiver Woche gegenüber dem Diagnostic-Ausgangswert.'
    },
    wirtschaft: {
      zahlendeNutzer: kaeufe.n,
      bruttoumsatzCent: kaeufe.cents,
      deckungsbeitragCent: db_gesamt,
      deckungsbeitragJeNutzerCent: dbJeNutzer,
      breakEvenNutzer: Math.ceil(AUFBAU_CENT / (5700 - VARIABEL_CENT)),
      annahmen: {
        variableKostenJeNutzerCent: VARIABEL_CENT,
        aufbaukostenCent: AUFBAU_CENT,
        durchschnittserloesCent: 5700,
        quelle: 'Business Case v2, Kapitel 9 und 10 - SCHAETZUNGEN, gegen Ist zu verfolgen'
      }
    },
    nutzer: {
      gesamt: db.prepare('SELECT COUNT(*) c FROM users').get().c,
      warteliste: db.prepare('SELECT COUNT(*) c FROM waitlist').get().c,
      diagnosticLaeufe: db.prepare('SELECT COUNT(*) c FROM diagnostic_runs').get().c
    }
  });
});

/** Rohdatenexport für die Auswertung des Oktober-Zyklus. */
router.get('/export/diagnostic', (req, res) => {
  const rows = db.prepare(`SELECT id, exam_id, result, started_at, finished_at
                           FROM diagnostic_runs WHERE result IS NOT NULL`).all();
  res.setHeader('content-type', 'text/csv; charset=utf-8');
  res.setHeader('content-disposition', 'attachment; filename="diagnostic.csv"');
  const zeilen = ['run_id,exam_id,gesamt,beantwortet,gestartet,beendet'];
  for (const r of rows) {
    const j = JSON.parse(r.result);
    zeilen.push([r.id, r.exam_id, j.gesamt, j.beantwortet, r.started_at, r.finished_at].join(','));
  }
  res.send(zeilen.join('\n'));
});

module.exports = router;
