'use strict';
const path = require('path');

// Preise und Termine stammen aus dem Business Case v2 (Kapitel 4, 7, 10).
// Sie sind Modellannahmen, keine fixierten Marktpreise - vor Launch bestaetigen.

const EXAM_DATES = [
  { id: 'steop-2026-10-02', label: 'StEOP 2. Oktober 2026', date: '2026-10-02', cycle: 'beta',   sellable: false },
  { id: 'steop-2027-01-29', label: 'StEOP 29. Jänner 2027', date: '2027-01-29', cycle: 'haupt', sellable: true  },
  { id: 'steop-2027-04-23', label: 'StEOP 23. April 2027',   date: '2027-04-23', cycle: 'neben', sellable: true  },
  { id: 'steop-2027-06-24', label: 'StEOP 24. Juni 2027',    date: '2027-06-24', cycle: 'neben', sellable: true  }
];

// Frühbucher-Staffel (Kapitel 7). Schwellen in Tagen vor dem Prüftermin.
const PRICE_TIERS = [
  { minDaysBefore: 56, pass: 3900, pro: 5900, label: 'Frühbucher' },
  { minDaysBefore: 7,  pass: 4900, pro: 6900, label: 'Regulär'    },
  { minDaysBefore: 0,  pass: 5900, pro: 7900, label: 'Endspurt'    }
];

// Lerngruppen-Preis: drei Personen kaufen gemeinsam.
const GROUP = { size: 3, passCents: 3900, proCents: 5900 };

module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-nicht-für-produktion',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),

  // Kapitel 8: nur geprüftes Material darf in Scores und Tutor-Antworten fließen.
  allowUnreviewed: process.env.CONTENT_ALLOW_UNREVIEWED !== 'false',

  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock',
    stripeKey: process.env.STRIPE_SECRET_KEY || ''
  },

  ai: {
    enabled: process.env.AI_TUTOR_ENABLED === 'true',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    budgetCentsPerUser: Number(process.env.AI_BUDGET_CENTS_PER_USER) || 300
  },

  adminToken: process.env.ADMIN_TOKEN || 'lokaler-dev-token',

  EXAM_DATES,
  PRICE_TIERS,
  GROUP,

  // Diagnostic: 25 Fragen, Zielzeit unter 6 Minuten (Kapitel 15).
  diagnostic: { questionCount: 25, targetSeconds: 360 },

  // Mobile Bauprinzip: keine Lerneinheit über 12 Minuten (Kapitel 6).
  maxBlockMinutes: 12
};
