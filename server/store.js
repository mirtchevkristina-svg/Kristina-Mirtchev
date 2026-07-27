// Einfacher JSON-Datei-Speicher – keine nativen Abhängigkeiten, läuft überall (auch auf Replit).
// Für den produktiven Betrieb kann dies später gegen eine echte Datenbank (z. B. Postgres) getauscht werden.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY_DB = {
  users: [],
  sessions: [],       // { token, userId }
  messages: [],       // Team-Chat + Direktnachrichten { id, channel, authorId, text, createdAt }
  projects: [],       // { id, name, description, color, createdBy, createdAt }
  projectItems: [],   // { id, projectId, type, title, content, dueDate, status, fileName, fileUrl, createdBy, createdAt }
  events: [],         // Kalender { id, title, description, start, end, allDay, projectId, createdBy, createdAt }
  announcements: [],  // Pinnwand { id, type, title, text, authorId, pinned, createdAt, comments:[], likes:[] }
  honorarnotes: [],   // { id, number, clientName, ..., positions:[], net, vat, gross, createdBy, createdAt }
  settings: null,     // Kanzlei-Stammdaten (Header/Bank) für Honorarnoten
  counters: { honorar: 0 },
};

let db = null;
let writeTimer = null;

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
  }
}

export function load() {
  if (db) return db;
  ensure();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = { ...structuredClone(EMPTY_DB), ...JSON.parse(raw) };
  } catch (e) {
    console.error('DB konnte nicht gelesen werden, starte mit leerer DB:', e.message);
    db = structuredClone(EMPTY_DB);
  }
  return db;
}

// Debounced/atomic write, damit parallele Schreibvorgänge die Datei nicht zerstören.
export function save() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      const tmp = DB_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
      fs.renameSync(tmp, DB_FILE);
    } catch (e) {
      console.error('DB Schreibfehler:', e.message);
    }
  }, 120);
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function db_() {
  return load();
}
