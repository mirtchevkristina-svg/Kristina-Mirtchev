'use strict';
// Öffentliche Metadaten: Termine, Rechtstexte, Statusanzeige.
const express = require('express');
const db = require('../db');
const config = require('../config');
const content = require('../lib/content');
const { FAGG_TEXT } = require('./checkout');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    termine: config.EXAM_DATES,
    maxBlockMinuten: config.maxBlockMinutes,
    diagnostic: config.diagnostic,
    warnung: content.warnung(),
    kiTutor: {
      aktiv: config.ai.enabled,
      hinweis: config.ai.enabled
        ? 'Antworten des Tutors werden maschinell erzeugt und können falsch sein.'
        : 'Der KI-Tutor ist abgeschaltet. Er steht bewusst am Ende der Roadmap (Kapitel 16).'
    },
    bestand: {
      themen: db.prepare('SELECT COUNT(*) c FROM topics').get().c,
      fragen: db.prepare('SELECT COUNT(*) c FROM questions').get().c,
      gepruefteFragen: db.prepare("SELECT COUNT(*) c FROM questions WHERE status='geprueft'").get().c,
      lektionen: db.prepare('SELECT COUNT(*) c FROM lessons').get().c
    }
  });
});

/**
 * Pflichtangaben und Rechtstexte.
 * ACHTUNG: Platzhalter. Impressum, AGB, Widerrufsbelehrung und Datenschutzerklärung
 * sind vor dem ersten Verkauf durch geprüften Text zu ersetzen (Kapitel 13).
 */
router.get('/rechtstexte', (req, res) => {
  res.json({
    platzhalter: true,
    hinweis: 'Diese Texte sind Platzhalter und vor dem ersten Verkauf zu ersetzen.',
    impressum: 'PLATZHALTER - Name, Anschrift, Kontakt, Unternehmensgegenstand, ' +
               'allfällige Firmenbuchnummer und Aufsichtsbehörde ergänzen.',
    widerruf: FAGG_TEXT,
    widerrufHinweis:
      'Bei digitalen Inhalten erlischt das Rücktrittsrecht nur, wenn die Verbraucherin dem ' +
      'vorzeitigen Beginn ausdrücklich zugestimmt UND ihre Kenntnis vom Verlust des ' +
      'Rücktrittsrechts bestaetigt hat. Beides wird mit der Bestellung protokolliert.',
    datenschutz:
      'PLATZHALTER - zu regeln sind: Zwecke und Rechtsgrundlagen der Verarbeitung von ' +
      'Lerndaten und Fehlerprofilen, Speicherdauer und Löschkonzept, ' +
      'Auftragsverarbeiter, Drittlandtransfers, Betroffenenrechte.',
    werbeaussagen:
      'Zulässig ist die Aussage, dass das Produkt auf die Prüfung vorbereitet. ' +
      'Unzulässig ist jede Zusage eines Prüfungserfolgs. Eine Garantie darf ' +
      'ausschließlich als Zugangsverlängerung ausgestaltet sein.',
    kiTransparenz:
      'Inhalte werden teilweise maschinell erstellt und anschließend juristisch geprueft. ' +
      'Der Freigabestatus und der Name des Prüfers sind an jedem Lernobjekt hinterlegt.'
  });
});

router.get('/gesundheit', (req, res) => {
  res.json({ ok: true, env: config.env, zeit: new Date().toISOString() });
});

module.exports = router;
