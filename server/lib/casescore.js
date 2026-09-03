'use strict';
// Fall-Scoring auf vier Dimensionen: Issue, Regel, Subsumtion, Ergebnis (Kapitel 5).
//
// EHRLICHE EINORDNUNG DES VERFAHRENS:
// Das hier ist deterministisches Anker-Matching gegen ein vom Pruefer gepflegtes
// Bewertungsraster - kein Sprachverständnis. Es erkennt, OB die erwarteten
// Anker (Anspruchsgrundlage, Tatbestandsmerkmale, Ergebnis) vorkommen und ob die
// Antwort die Form des Gutachtenstils hat. Es erkennt NICHT, ob richtig
// argumentiert wurde. Deshalb:
//   - Das Ergebnis wird der Nutzerin als "Selbstkontrolle" ausgewiesen, nicht als Note.
//   - Es fließt mit reduziertem Gewicht in die Mastery ein.
//   - Eine echte Bewertung braucht entweder menschliches Review oder ein
//     evaluiertes Sprachmodell (Kapitel 16: KI-Tutor steht bewusst am Ende).

const { clamp } = require('./util');

const DIMENSIONS = [
  { key: 'issue',      label: 'Problem erkannt',   weight: 0.20 },
  { key: 'regel',      label: 'Regel benannt',     weight: 0.30 },
  { key: 'subsumtion', label: 'Subsumtion',        weight: 0.35 },
  { key: 'ergebnis',   label: 'Ergebnis',          weight: 0.15 }
];

// Formmarker des Gutachtenstils. Ihr Fehlen ist ein Hinweis, kein Fehler.
const GUTACHTEN_MARKER = [
  'fraglich ist', 'in betracht kommt', 'könnte', 'könnte', 'voraussetzung',
  'dazu müsste', 'dazu müsste', 'somit', 'folglich', 'im ergebnis', 'daher'
];

function normalise(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

/** Ein Anker gilt als getroffen, wenn eine seiner Varianten im Text vorkommt. */
function hit(text, anchor) {
  const variants = Array.isArray(anchor) ? anchor : [anchor];
  return variants.some((v) => text.includes(normalise(v)));
}

/**
 * @param {string} answer Freitext der Nutzerin
 * @param {object} rubric { issue:[], regel:[], subsumtion:[], ergebnis:[], minWords?:number }
 */
function score(answer, rubric) {
  const text = normalise(answer);
  const words = text.split(' ').filter(Boolean).length;
  const minWords = rubric.minWords || 60;

  const detail = DIMENSIONS.map((d) => {
    const anchors = rubric[d.key] || [];
    const found = anchors.filter((a) => hit(text, a));
    const missed = anchors.filter((a) => !hit(text, a));
    let value = anchors.length ? found.length / anchors.length : 0;

    // Subsumtion verlangt zusätzlich erkennbare Argumentation, nicht nur Stichworte.
    if (d.key === 'subsumtion') {
      const markers = GUTACHTEN_MARKER.filter((m) => text.includes(normalise(m))).length;
      const formFactor = clamp(0.5 + markers * 0.15, 0.5, 1);
      const lengthFactor = clamp(words / minWords, 0.3, 1);
      value = value * formFactor * lengthFactor;
    }

    return {
      key: d.key,
      label: d.label,
      value: Math.round(clamp(value, 0, 1) * 100),
      getroffen: found.map((a) => (Array.isArray(a) ? a[0] : a)),
      fehlt: missed.map((a) => (Array.isArray(a) ? a[0] : a))
    };
  });

  const total = Math.round(
    detail.reduce((s, d, i) => s + (d.value / 100) * DIMENSIONS[i].weight, 0) * 100
  );

  const hinweise = [];
  if (words < minWords) hinweise.push(`Die Loesung ist mit ${words} Wörtern kurz. Richtwert: ${minWords}.`);
  if (!GUTACHTEN_MARKER.some((m) => text.includes(normalise(m))))
    hinweise.push('Es fehlen die Formulierungen des Gutachtenstils (fraglich ist, könnte, somit).');
  const weakest = detail.slice().sort((a, b) => a.value - b.value)[0];
  if (weakest && weakest.value < 60) hinweise.push(`Schwächste Dimension: ${weakest.label}.`);

  return {
    total,
    dimensionen: detail,
    hinweise,
    verfahren: 'anker-matching',
    hinweis_zur_bewertung:
      'Automatische Selbstkontrolle gegen das Bewertungsraster. Sie prüft die ' +
      'Vollständigkeit der erwarteten Punkte, nicht die Richtigkeit der Argumentation.'
  };
}

module.exports = { score, DIMENSIONS };
