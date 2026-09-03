'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new Database(path.join(config.dataDir, 'subsumo.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- ---------------------------------------------------------------------------
-- Nutzer und Zugang
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT UNIQUE,
  created_at     TEXT NOT NULL,
  exam_id        TEXT,
  daily_minutes  INTEGER NOT NULL DEFAULT 25,
  tier           TEXT NOT NULL DEFAULT 'free',   -- free | pass | pro
  access_until   TEXT,
  -- Kapitel 13: Teile der Erstsemestrigen sind minderjährig.
  age_bracket    TEXT,                           -- 'u18' | '18plus' | NULL (nicht erhoben)
  anon_id        TEXT                            -- Verknüpfung zum Diagnostic vor Registrierung
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL,                      -- login | session
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

-- ---------------------------------------------------------------------------
-- Content. Jedes Lernobjekt trägt die Statusfelder aus Kapitel 8.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topics (
  id          TEXT PRIMARY KEY,
  subject     TEXT NOT NULL,                     -- zivilrecht | oeffentliches | strafrecht | methodenlehre | grundlagen
  name        TEXT NOT NULL,
  exam_weight REAL NOT NULL DEFAULT 1.0,         -- Prüfungsrelevanz, steuert Plan und Readiness
  ord         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id           TEXT PRIMARY KEY,
  topic_id     TEXT NOT NULL REFERENCES topics(id),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  audio_script TEXT,                             -- 4-6 Minuten Hörfassung (Kapitel 6)
  minutes      INTEGER NOT NULL DEFAULT 8,
  ord          INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'entwurf',  -- entwurf | ki_erstellt | in_pruefung | geprueft | gesperrt
  version      INTEGER NOT NULL DEFAULT 1,
  reviewer     TEXT,
  source       TEXT,
  reviewed_at  TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id           TEXT PRIMARY KEY,
  topic_id     TEXT NOT NULL REFERENCES topics(id),
  lesson_id    TEXT REFERENCES lessons(id),
  type         TEXT NOT NULL,                    -- mc | tf | norm
  stem         TEXT NOT NULL,
  options      TEXT NOT NULL DEFAULT '[]',       -- JSON
  answer       TEXT NOT NULL,                    -- JSON: Index oder Wert
  explanation  TEXT NOT NULL DEFAULT '',
  difficulty   REAL NOT NULL DEFAULT 0.0,        -- -2 leicht .. +2 schwer
  in_diagnostic INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'entwurf',
  version      INTEGER NOT NULL DEFAULT 1,
  reviewer     TEXT,
  source       TEXT,
  reviewed_at  TEXT
);

CREATE TABLE IF NOT EXISTS cases (
  id          TEXT PRIMARY KEY,
  topic_id    TEXT NOT NULL REFERENCES topics(id),
  title       TEXT NOT NULL,
  facts       TEXT NOT NULL,
  question    TEXT NOT NULL,
  rubric      TEXT NOT NULL,                     -- JSON: vier Dimensionen (Kapitel 5)
  minutes     INTEGER NOT NULL DEFAULT 12,
  status      TEXT NOT NULL DEFAULT 'entwurf',
  version     INTEGER NOT NULL DEFAULT 1,
  reviewer    TEXT,
  source      TEXT,
  reviewed_at TEXT
);

-- ---------------------------------------------------------------------------
-- Lernfortschritt
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  anon_id     TEXT,
  question_id TEXT NOT NULL REFERENCES questions(id),
  correct     INTEGER NOT NULL,
  ms          INTEGER NOT NULL DEFAULT 0,
  context     TEXT NOT NULL DEFAULT 'plan',      -- diagnostic | plan | wiederholung | mock
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_anon ON attempts(anon_id, created_at);

CREATE TABLE IF NOT EXISTS mastery (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id  TEXT NOT NULL REFERENCES topics(id),
  value     REAL NOT NULL DEFAULT 0.25,          -- 0..1
  attempts  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS srs (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  ease        REAL NOT NULL DEFAULT 2.5,
  interval_d  REAL NOT NULL DEFAULT 0,
  reps        INTEGER NOT NULL DEFAULT 0,
  lapses      INTEGER NOT NULL DEFAULT 0,
  due_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs(user_id, due_at);

CREATE TABLE IF NOT EXISTS case_submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id    TEXT NOT NULL REFERENCES cases(id),
  answer     TEXT NOT NULL,
  score      TEXT NOT NULL,                      -- JSON: vier Dimensionen
  created_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Diagnostic (kein Konto nötig, Kapitel 15)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_runs (
  id           TEXT PRIMARY KEY,
  anon_id      TEXT NOT NULL,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  exam_id      TEXT,
  question_ids TEXT NOT NULL,                    -- JSON
  answers      TEXT NOT NULL DEFAULT '[]',       -- JSON
  result       TEXT,                             -- JSON
  share_token  TEXT UNIQUE,
  started_at   TEXT NOT NULL,
  finished_at  TEXT
);

CREATE TABLE IF NOT EXISTS waitlist (
  email      TEXT PRIMARY KEY,
  exam_id    TEXT,
  anon_id    TEXT,
  consent    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Erlös (Kapitel 7) inkl. FAGG-Nachweis (Kapitel 13)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_groups (
  id         TEXT PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  exam_id    TEXT NOT NULL,
  tier       TEXT NOT NULL,
  size       INTEGER NOT NULL DEFAULT 3,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id           TEXT NOT NULL,
  tier              TEXT NOT NULL,               -- pass | pro
  price_cents       INTEGER NOT NULL,
  price_label       TEXT NOT NULL,
  group_id          TEXT REFERENCES study_groups(id),
  status            TEXT NOT NULL DEFAULT 'offen', -- offen | bezahlt | storniert | widerrufen
  provider          TEXT NOT NULL,
  provider_ref      TEXT,
  -- FAGG: ausdrückliche Zustimmung zum vorzeitigen Beginn + Kenntnis des Erlöschens
  fagg_consent      INTEGER NOT NULL DEFAULT 0,
  fagg_consent_text TEXT,
  fagg_consent_at   TEXT,
  created_at        TEXT NOT NULL,
  paid_at           TEXT
);

CREATE TABLE IF NOT EXISTS referrals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  inviter_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  invitee_anon TEXT,
  redeemed_at TEXT,
  created_at  TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Qualität und Messung (Kapitel 14 und 17)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_flags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  object_type TEXT NOT NULL,                     -- question | lesson | case
  object_id   TEXT NOT NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  anon_id     TEXT,
  reason      TEXT NOT NULL,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'offen',     -- offen | bestaetigt | verworfen
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,
  name     TEXT NOT NULL,
  user_id  TEXT,
  anon_id  TEXT,
  props    TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, ts);

CREATE TABLE IF NOT EXISTS exam_results (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id    TEXT NOT NULL,
  passed     INTEGER,
  points     REAL,
  readiness_at_exam REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cents      REAL NOT NULL,
  kind       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

module.exports = db;
