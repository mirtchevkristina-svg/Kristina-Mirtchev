'use strict';
// Preislogik nach Kapitel 7: Frühbucher-Staffel, PASS/PRO, Lerngruppen-Preis.
const config = require('../config');
const { daysBetween } = require('./util');

function examById(examId) {
  return config.EXAM_DATES.find((e) => e.id === examId) || null;
}

/** Aktuelle Preisstufe für einen Prüftermin. */
function tierFor(examId, at = new Date()) {
  const exam = examById(examId);
  if (!exam) return null;
  const days = daysBetween(at, exam.date);
  const stufe = config.PRICE_TIERS.find((t) => days >= t.minDaysBefore) || config.PRICE_TIERS[config.PRICE_TIERS.length - 1];
  return { ...stufe, daysToExam: days, exam };
}

/**
 * Preis in Cent.
 * Der Lerngruppen-Preis ersetzt die Staffel, er wird nicht zusätzlich rabattiert -
 * sonst entstehen Preise, die unter den variablen Kosten liegen.
 */
function priceCents(examId, product, { group = false } = {}) {
  const t = tierFor(examId);
  if (!t) return null;
  if (group) return { cents: product === 'pro' ? config.GROUP.proCents : config.GROUP.passCents, label: 'Lerngruppe' };
  return { cents: product === 'pro' ? t.pro : t.pass, label: t.label };
}

/** Preisliste für die Anzeige, inkl. Hinweis auf die nächste Stufe. */
function priceList(examId) {
  const t = tierFor(examId);
  if (!t) return null;
  // PRICE_TIERS ist absteigend nach Vorlaufzeit sortiert: der nächste (teurere)
  // Tarif steht daher an der FOLGENDEN Position, nicht an der vorherigen.
  const idx = config.PRICE_TIERS.findIndex((x) => x.minDaysBefore === t.minDaysBefore);
  const nächste = config.PRICE_TIERS[idx + 1] || null;
  return {
    exam: t.exam,
    daysToExam: t.daysToExam,
    stufe: t.label,
    pass: t.pass,
    pro: t.pro,
    gruppe: { size: config.GROUP.size, pass: config.GROUP.passCents, pro: config.GROUP.proCents },
    naechsteStufe: nächste
      ? { label: nächste.label, pass: nächste.pass, pro: nächste.pro,
          abTagenVorPruefung: nächste.minDaysBefore }
      : null,
    // Kapitel 11: Solange die Kleinunternehmerregelung greift, ist der Preis brutto = netto.
    ustHinweis: 'Preis in Euro inkl. allfälliger Steuern. Steuerstatus vor Verkaufsstart prüfen (§ 6 Abs 1 Z 27 UStG).'
  };
}

module.exports = { priceCents, priceList, tierFor, examById };
