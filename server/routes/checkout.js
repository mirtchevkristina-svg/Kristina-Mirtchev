'use strict';
// Kauf des Prüfungspasses (Kapitel 7) mit FAGG-Nachweis (Kapitel 13).
//
// Zahlungsanbindung: Der Provider ist gekapselt. `mock` legt die Bestellung an und
// markiert sie sofort als bezahlt - für Entwicklung und Beta. Für den echten
// Verkauf ist in lib/payments.js ein Anbieter zu ergänzen; Apple Pay und Google Pay
// müssen dort als primäre Methoden konfiguriert sein (Ein-Tap-Bezahlung, Kapitel 6).

const express = require('express');
const db = require('../db');
const config = require('../config');
const auth = require('../lib/auth');
const pricing = require('../lib/pricing');
const analytics = require('../lib/analytics');
const { id, now, addDays } = require('../lib/util');

const router = express.Router();

// Der Text, dem die Käuferin ausdrücklich zustimmen muss, damit das
// Rücktrittsrecht bei digitalen Inhalten vorzeitig erlischt. Wird mit der
// Bestellung gespeichert - ohne diesen Nachweis besteht das Rücktrittsrecht fort.
const FAGG_TEXT =
  'Ich verlange ausdrücklich, dass mit der Ausführung vor Ablauf der ' +
  'Rücktrittsfrist begonnen wird, und nehme zur Kenntnis, dass ich mit ' +
  'vollständiger Vertragserfüllung mein Rücktrittsrecht verliere.';

/**
 * Nächster Termin, für den überhaupt verkauft wird.
 * Der Oktober-Termin ist bewusst ein Beta-Zyklus ohne Verkauf (Kapitel 15) -
 * ein Nutzer, der darauf eingestellt ist, bekommt hier trotzdem einen Preis
 * zu sehen, nämlich den des nächsten verkaeuflichen Termins.
 */
function verkaufsTermin(gewuenscht) {
  const e = pricing.examById(gewuenscht);
  if (e && e.sellable && new Date(e.date) > new Date()) return { exam: e, gewechselt: false };
  const nächster = config.EXAM_DATES.find((x) => x.sellable && new Date(x.date) > new Date());
  return nächster ? { exam: nächster, gewechselt: !!gewuenscht } : null;
}

router.get('/preise', (req, res) => {
  const t = verkaufsTermin(req.query.examId || req.user?.exam_id);
  if (!t) return res.status(400).json({ error: 'kein_verkaufstermin' });
  const liste = pricing.priceList(t.exam.id);
  if (!liste) return res.status(400).json({ error: 'termin_unbekannt' });
  res.json({
    ...liste,
    terminGewechselt: t.gewechselt,
    terminHinweis: t.gewechselt
      ? 'Für deinen aktuell eingestellten Termin wird nichts verkauft. ' +
        'Angezeigt ist der nächste Termin mit Kursangebot.'
      : null,
    faggText: FAGG_TEXT,
    produkte: [
      { key: 'pass', name: 'PASS', cents: liste.pass,
        enthalten: ['Tagesplan bis zum Prüftermin', 'Alle Lektionen und Fragen',
                    'Wiederholungen', 'Ergebnisprofil'] },
      { key: 'pro', name: 'PRO', cents: liste.pro,
        enthalten: ['Alles aus PASS', 'Falltraining mit Bewertungsraster',
                    'Mock Exams', 'Hörfassungen'] }
    ],
    // Kein Abo im Zyklus 1 - bewusste Entscheidung, siehe Kapitel 7.
    abo: null,
    abohinweis: 'Kein Abo. Einmalzahlung mit Zugang bis zum gewählten Prüftermin.'
  });
});

/** Lerngruppe anlegen: drei Personen, geteilter Link (Kapitel 7). */
router.post('/gruppe', auth.requireUser, (req, res) => {
  const examId = req.body.examId || req.user.exam_id;
  if (!pricing.examById(examId)) return res.status(400).json({ error: 'termin_unbekannt' });
  const tier = req.body.produkt === 'pro' ? 'pro' : 'pass';
  const code = id('g').slice(1, 7).toUpperCase();
  const gid = id('grp');
  db.prepare(`INSERT INTO study_groups (id, code, exam_id, tier, size, created_by, created_at)
              VALUES (?,?,?,?,?,?,?)`)
    .run(gid, code, examId, tier, config.GROUP.size, req.user.id, now());
  res.json({ code, groupId: gid, size: config.GROUP.size,
             preisCents: tier === 'pro' ? config.GROUP.proCents : config.GROUP.passCents,
             hinweis: `Teilt diesen Code. Sobald ${config.GROUP.size} Personen gekauft haben, gilt der Gruppenpreis für alle.` });
});

router.post('/kaufen', auth.requireUser, (req, res) => {
  const examId = req.body.examId || req.user.exam_id;
  const exam = pricing.examById(examId);
  if (!exam) return res.status(400).json({ error: 'termin_unbekannt' });
  if (!exam.sellable)
    return res.status(400).json({ error: 'termin_nicht_verkaeuflich',
      hinweis: 'Für diesen Termin läuft die kostenlose Beta. Es wird nichts verkauft.' });

  const produkt = req.body.produkt === 'pro' ? 'pro' : 'pass';

  // FAGG: ohne ausdrückliche Zustimmung kein sofortiger Zugang.
  if (req.body.faggZustimmung !== true)
    return res.status(400).json({ error: 'fagg_zustimmung_fehlt', faggText: FAGG_TEXT,
      hinweis: 'Ohne diese Erklaerung bleibt das Rücktrittsrecht bestehen und der Zugang ' +
               'kann nicht sofort freigeschaltet werden.' });

  let group = null;
  if (req.body.gruppencode) {
    group = db.prepare('SELECT * FROM study_groups WHERE code = ? AND exam_id = ?')
      .get(String(req.body.gruppencode).toUpperCase(), examId);
    if (!group) return res.status(400).json({ error: 'gruppencode_unbekannt' });
  }

  const preis = pricing.priceCents(examId, produkt, { group: !!group });
  const orderId = id('o');
  analytics.track('checkout_gestartet', { userId: req.user.id, props: { produkt, gruppe: !!group } });

  db.prepare(`INSERT INTO orders (id, user_id, exam_id, tier, price_cents, price_label, group_id,
                status, provider, fagg_consent, fagg_consent_text, fagg_consent_at, created_at)
              VALUES (?,?,?,?,?,?,?, 'offen', ?, 1, ?, ?, ?)`)
    .run(orderId, req.user.id, examId, produkt, preis.cents, preis.label,
         group?.id || null, config.payment.provider, FAGG_TEXT, now(), now());

  if (config.payment.provider !== 'mock') {
    // Hier gehört die Weiterleitung an den Zahlungsanbieter hin. Bewusst nicht
    // erraten - die Anbindung hängt vom gewählten Anbieter und den Konditionen ab.
    return res.status(501).json({ error: 'zahlungsanbieter_nicht_angebunden', orderId,
      hinweis: 'PAYMENT_PROVIDER ist gesetzt, aber es ist kein Anbieter implementiert. ' +
               'Siehe server/lib/payments.js.' });
  }

  freischalten(orderId);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ ok: true, orderId, bezahlt: true, tier: u.tier, zugangBis: u.access_until,
             preisCents: preis.cents, preisStufe: preis.label,
             hinweis: config.payment.provider === 'mock'
               ? 'Testkauf ohne Zahlungsfluss (PAYMENT_PROVIDER=mock).' : undefined });
});

/** Bestellung als bezahlt markieren und Zugang bis zum Prüftermin gewähren. */
function freischalten(orderId) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!o || o.status === 'bezahlt') return;
  const exam = pricing.examById(o.exam_id);
  // Zugang bis 3 Tage nach dem Prüftermin - Puffer für Nachbesprechung.
  const bis = addDays(exam.date, 3);
  db.prepare("UPDATE orders SET status = 'bezahlt', paid_at = ? WHERE id = ?").run(now(), orderId);
  db.prepare('UPDATE users SET tier = ?, access_until = ?, exam_id = ? WHERE id = ?')
    .run(o.tier, bis, o.exam_id, o.user_id);
  analytics.track('kauf_abgeschlossen', { userId: o.user_id,
    props: { tier: o.tier, cents: o.price_cents, stufe: o.price_label } });
}

/**
 * Verlängerung bei Nichtbestehen (Kapitel 7: "Bestehens-Rückkehr").
 * Ausdrücklich als ZUGANGSverlängerung formuliert, nie als Erfolgsgarantie -
 * das ist die Grenze, die das UWG zieht (Kapitel 13).
 */
router.post('/verlaengerung', auth.requireUser, (req, res) => {
  const letzte = db.prepare(`SELECT * FROM orders WHERE user_id = ? AND status = 'bezahlt'
                             ORDER BY paid_at DESC LIMIT 1`).get(req.user.id);
  if (!letzte) return res.status(400).json({ error: 'kein_kauf_vorhanden' });

  const nächster = config.EXAM_DATES.find((e) => new Date(e.date) > new Date(letzte.exam_id
    ? pricing.examById(letzte.exam_id).date : now()));
  if (!nächster) return res.status(400).json({ error: 'kein_folgetermin' });

  db.prepare('UPDATE users SET access_until = ?, exam_id = ? WHERE id = ?')
    .run(addDays(nächster.date, 3), nächster.id, req.user.id);
  res.json({ ok: true, zugangBis: addDays(nächster.date, 3), termin: nächster,
    hinweis: 'Dein Zugang gilt bis zum nächsten Termin. Das ist eine Zugangsverlängerung, ' +
             'kein Versprechen über das Prüfungsergebnis.' });
});

router.get('/bestellungen', auth.requireUser, (req, res) => {
  res.json(db.prepare(`SELECT id, exam_id, tier, price_cents, price_label, status, created_at, paid_at
                       FROM orders WHERE user_id = ? ORDER BY created_at DESC`).all(req.user.id));
});

module.exports = router;
module.exports.FAGG_TEXT = FAGG_TEXT;
