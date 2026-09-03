'use strict';
// Wiederholungsplanung (SM-2 in verkürzter Form) und Tagesplanbau.
//
// Der Tagesplan ist der Kern der Produktthese (Kapitel 3): Die Nutzerin
// entscheidet nicht, welches Kapitel sie liest - das System entscheidet aus
// Prüftermin, verfügbaren Minuten, Mastery und Fehlerprofil.

const { addDays, clamp, daysBetween, now } = require('./util');

/** Nächste Fälligkeit nach einer Antwort. Qualität 0..5 wie bei SM-2. */
function nextReview(srs, quality) {
  let { ease = 2.5, interval_d = 0, reps = 0, lapses = 0 } = srs || {};
  if (quality < 3) {
    reps = 0; lapses += 1; interval_d = 0.25;      // in ~6 Stunden erneut
    ease = clamp(ease - 0.2, 1.3, 3.0);
  } else {
    reps += 1;
    if (reps === 1) interval_d = 1;
    else if (reps === 2) interval_d = 3;
    else interval_d = Math.round(interval_d * ease);
    ease = clamp(ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)), 1.3, 3.0);
  }
  return { ease, interval_d, reps, lapses, due_at: addDays(now(), interval_d) };
}

/** Antwortqualität aus Richtigkeit und Antwortzeit. */
function quality(correct, ms) {
  if (!correct) return ms < 4000 ? 1 : 2;          // schnell falsch = geraten
  if (ms < 8000) return 5;
  if (ms < 20000) return 4;
  return 3;
}

/**
 * Baut den Tagesplan.
 *
 * Reihenfolge der Blockarten ist bewusst festgelegt:
 *   1. fällige Wiederholungen  - sonst zerfällt bereits Gelerntes
 *   2. schwächstes prüfungsrelevantes Thema - größter Hebel
 *   3. neue Lektion             - Fortschrittsgefühl
 *   4. Falltraining             - erst ab brauchbarer Mastery, sonst frustrierend
 *
 * Jeder Block bleibt unter `maxBlockMinutes` (Kapitel 6: U-Bahn-Fahrt).
 */
function buildPlan({ availableMinutes, maxBlockMinutes, daysToExam, dueCount, topics, nextLesson, caseCandidate }) {
  const blocks = [];
  let left = Math.max(5, availableMinutes);

  const push = (b) => {
    if (left < 3) return false;
    b.minutes = Math.min(b.minutes, maxBlockMinutes, left);
    blocks.push(b); left -= b.minutes; return true;
  };

  // Endspurt: in den letzten zehn Tagen verschiebt sich das Gewicht von
  // "Neues lernen" zu "Abrufen und Anwenden".
  const endspurt = daysToExam !== null && daysToExam <= 10;

  if (dueCount > 0) {
    const items = Math.min(dueCount, endspurt ? 30 : 20);
    push({ kind: 'wiederholung', titel: 'Fällige Wiederholungen',
           untertitel: `${items} Karten`, minutes: Math.ceil(items * 0.4) + 2, payload: { limit: items } });
  }

  const weak = topics.slice().sort((a, b) =>
    (a.value * a.exam_weight) - (b.value * b.exam_weight));

  const weakest = weak[0];
  if (weakest) {
    push({ kind: 'schwachstelle', titel: 'Schwachstelle schließen',
           untertitel: weakest.name, minutes: endspurt ? 10 : 8,
           payload: { topicId: weakest.id, limit: 10 } });
  }

  if (nextLesson && !endspurt) {
    push({ kind: 'lektion', titel: 'Neue Lektion', untertitel: nextLesson.title,
           minutes: nextLesson.minutes, payload: { lessonId: nextLesson.id } });
  }

  if (caseCandidate && (endspurt || (weakest && weakest.value > 0.45))) {
    push({ kind: 'fall', titel: 'Falltraining', untertitel: caseCandidate.title,
           minutes: caseCandidate.minutes, payload: { caseId: caseCandidate.id } });
  }

  // Restminuten in gemischtes Abrufen gießen statt verfallen zu lassen.
  if (left >= 5) {
    push({ kind: 'mix', titel: 'Gemischtes Abrufen', untertitel: 'Quer durch alle Fächer',
           minutes: left, payload: { limit: Math.ceil(left * 2) } });
  }

  return blocks;
}

module.exports = { nextReview, quality, buildPlan, daysBetween };
