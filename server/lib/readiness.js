'use strict';
// Readiness-Score.
//
// WICHTIG (Kapitel 17): Dieser Wert ist bis zur Kalibrierung an echten
// Prüfungsergebnissen ein INTERNES Fortschrittsmaß. Er darf im UI nicht als
// Bestehenswahrscheinlichkeit dargestellt werden. Die API liefert ihn deshalb
// zusammen mit `calibrated: false` und einem verbindlichen Anzeigehinweis aus.

const { clamp } = require('./util');

/**
 * @param {Array<{value:number, exam_weight:number, attempts:number}>} rows Mastery je Thema
 * @param {number} coveredTopics  Themen mit mindestens einem Versuch
 * @param {number} totalTopics    prüfungsrelevante Themen insgesamt
 */
function score(rows, coveredTopics, totalTopics) {
  const weightSum = rows.reduce((s, r) => s + r.exam_weight, 0) || 1;
  const weighted = rows.reduce((s, r) => s + r.value * r.exam_weight, 0) / weightSum;
  const coverage = totalTopics ? coveredTopics / totalTopics : 0;
  // Abdeckung deckelt den Score: wer die Hälfte der Themen nie gesehen hat,
  // ist nicht zu 90 % vorbereitet, egal wie gut die gesehenen sitzen.
  const raw = weighted * (0.45 + 0.55 * coverage);
  return Math.round(clamp(raw, 0, 1) * 100);
}

const DISPLAY_NOTE =
  'Interner Fortschrittswert, keine Bestehensprognose. Er wird erst kalibriert, ' +
  'wenn genügend echte Prüfungsergebnisse vorliegen.';

module.exports = { score, DISPLAY_NOTE, calibrated: false };
