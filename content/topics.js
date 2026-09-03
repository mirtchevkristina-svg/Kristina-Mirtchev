'use strict';
// Themenlandkarte der StEOP.
//
// exam_weight steuert Tagesplan und Readiness-Score. Die Gewichte folgen der
// Priorisierung aus Kapitel 8 des Business Case: zuerst die Kernfächer in
// Prüfungsbreite, historische und rechtsphilosophische Kapitel zuletzt.
// Die Werte sind SCHAETZUNGEN und vom Kursgeber vor dem Launch zu bestätigen.

module.exports = [
  // --- Juristische Methodenlehre: das eigentliche Herz der Prüfung ---
  { id: 'm-rechtsquellen',    subject: 'methodenlehre',   name: 'Rechtsquellen und Stufenbau',        exam_weight: 1.5, ord: 10 },
  { id: 'm-auslegung',        subject: 'methodenlehre',   name: 'Auslegungsmethoden',                 exam_weight: 1.6, ord: 11 },
  { id: 'm-lueckenschluss',   subject: 'methodenlehre',   name: 'Analogie und Umkehrschluss',         exam_weight: 1.4, ord: 12 },
  { id: 'm-subsumtion',       subject: 'methodenlehre',   name: 'Subsumtion und Gutachtenstil',       exam_weight: 1.6, ord: 13 },
  { id: 'm-geltung',          subject: 'methodenlehre',   name: 'Geltungsbereich und Derogation',     exam_weight: 1.0, ord: 14 },

  // --- Zivilrecht ---
  { id: 'z-privatautonomie',  subject: 'zivilrecht',      name: 'Privatautonomie und Privatrecht',    exam_weight: 1.3, ord: 20 },
  { id: 'z-rechtssubjekte',   subject: 'zivilrecht',      name: 'Rechts- und Handlungsfähigkeit',    exam_weight: 1.2, ord: 21 },
  { id: 'z-rechtsgeschaeft',  subject: 'zivilrecht',      name: 'Rechtsgeschäft und Willenserklärung', exam_weight: 1.4, ord: 22 },
  { id: 'z-vertrag',          subject: 'zivilrecht',      name: 'Vertragsabschluss',                  exam_weight: 1.4, ord: 23 },
  { id: 'z-schadenersatz',    subject: 'zivilrecht',      name: 'Schadenersatz in Grundzügen',       exam_weight: 1.1, ord: 24 },

  // --- Öffentliches Recht ---
  { id: 'o-baugesetze',       subject: 'oeffentliches',   name: 'Baugesetze der Bundesverfassung',    exam_weight: 1.3, ord: 30 },
  { id: 'o-gesetzgebung',     subject: 'oeffentliches',   name: 'Gesetzgebungsverfahren des Bundes',  exam_weight: 1.2, ord: 31 },
  { id: 'o-grundrechte',      subject: 'oeffentliches',   name: 'Grundrechte in Grundzügen',         exam_weight: 1.2, ord: 32 },
  { id: 'o-verwaltung',       subject: 'oeffentliches',   name: 'Verwaltungshandeln und Bescheid',    exam_weight: 1.0, ord: 33 },
  { id: 'o-rechtsschutz',     subject: 'oeffentliches',   name: 'Gerichtshöfe des öffentlichen Rechts', exam_weight: 1.1, ord: 34 },

  // --- Strafrecht ---
  { id: 's-aufbau',           subject: 'strafrecht',      name: 'Aufbau der Strafbarkeitsprüfung',   exam_weight: 1.4, ord: 40 },
  { id: 's-tatbestand',       subject: 'strafrecht',      name: 'Tatbestand und Kausalität',         exam_weight: 1.2, ord: 41 },
  { id: 's-rechtswidrigkeit', subject: 'strafrecht',      name: 'Rechtswidrigkeit und Notwehr',       exam_weight: 1.2, ord: 42 },
  { id: 's-schuld',           subject: 'strafrecht',      name: 'Schuld, Vorsatz und Fahrlässigkeit', exam_weight: 1.3, ord: 43 },
  { id: 's-versuch',          subject: 'strafrecht',      name: 'Versuch und Beteiligung',            exam_weight: 1.0, ord: 44 },

  // --- Grundlagenfächer: kommen laut Kapitel 8 bewusst zuletzt ---
  { id: 'g-rechtsbegriff',    subject: 'grundlagen',      name: 'Recht, Moral und Rechtsordnung',     exam_weight: 0.8, ord: 50 },
  { id: 'g-roemisch',         subject: 'grundlagen',      name: 'Römisches Recht und Rezeption',     exam_weight: 0.6, ord: 51 },
  { id: 'g-abgb',             subject: 'grundlagen',      name: 'Kodifikation und das ABGB',          exam_weight: 0.6, ord: 52 }
];
