'use strict';
// Mastery je Thema, 0..1.
//
// Modell: logistische Trefferwahrscheinlichkeit aus Mastery und Aufgabenschwierigkeit,
// Aktualisierung nach dem Fehler zwischen Erwartung und Ergebnis (Elo-Prinzip).
// Bewusst schlank gehalten - eine ausgewachsene IRT-Kalibrierung lohnt erst,
// wenn echte Antwortdaten aus dem Oktober-Zyklus vorliegen (Kapitel 19).

const { clamp } = require('./util');

const LEARNING_RATE_MIN = 0.06;
const LEARNING_RATE_MAX = 0.22;
const DECAY_PER_DAY = 0.004;      // Vergessen ohne Kontakt

/** Wahrscheinlichkeit, dass eine Nutzerin mit `mastery` eine Frage der Schwierigkeit `d` löst. */
function predict(mastery, difficulty = 0) {
  const ability = (mastery - 0.5) * 6;           // 0..1 -> -3..+3 Logit
  return 1 / (1 + Math.exp(-(ability - difficulty)));
}

/** Neue Mastery nach einem Versuch. Frühe Versuche wirken stärker als späte. */
function update(mastery, attempts, correct, difficulty = 0, guessRate = 0) {
  const p = predict(mastery, difficulty);
  // Ratekorrektur: eine richtige MC-Antwort mit vier Optionen ist weniger wert.
  const observed = correct ? 1 : 0;
  const expected = guessRate + (1 - guessRate) * p;
  const k = LEARNING_RATE_MAX - (LEARNING_RATE_MAX - LEARNING_RATE_MIN) *
            clamp(attempts / 30, 0, 1);
  return clamp(mastery + k * (observed - expected), 0.02, 0.99);
}

/** Zeitlicher Verfall seit dem letzten Kontakt mit dem Thema. */
function decay(mastery, daysSinceSeen) {
  if (!daysSinceSeen || daysSinceSeen <= 0) return mastery;
  return clamp(mastery - DECAY_PER_DAY * daysSinceSeen, 0.02, 0.99);
}

/** Ratewahrscheinlichkeit je Fragetyp. */
function guessRate(type, optionCount) {
  if (type === 'tf') return 0.5;
  if (type === 'mc' && optionCount > 1) return 1 / optionCount;
  return 0;                                       // Normzuordnung: freie Eingabe
}

module.exports = { predict, update, decay, guessRate };
