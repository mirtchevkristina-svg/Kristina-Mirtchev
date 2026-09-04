'use strict';
// Ereignisprotokoll und Kennzahlen aus Kapitel 17.
// Datenminimierung: keine IP, kein User-Agent, keine Klarnamen in props.
const db = require('../db');
const { now, json } = require('./util');

const ALLOWED = new Set([
  'diagnostic_gestartet', 'diagnostic_abgeschlossen', 'diagnostic_abgebrochen',
  'ergebniskarte_geteilt', 'ergebniskarte_erzeugt',
  'warteliste_eingetragen', 'registriert', 'erste_session',
  'session_gestartet', 'session_abgeschlossen',
  'paywall_gesehen', 'checkout_gestartet', 'kauf_abgeschlossen',
  'fall_abgegeben', 'sachfehler_gemeldet', 'pruefungsergebnis_gemeldet'
]);

const insert = db.prepare(
  'INSERT INTO events (ts, name, user_id, anon_id, props) VALUES (?, ?, ?, ?, ?)'
);

function track(name, { userId = null, anonId = null, props = {} } = {}) {
  if (!ALLOWED.has(name)) return false;     // unbekannte Namen still verwerfen
  insert.run(now(), name, userId, anonId, JSON.stringify(props));
  return true;
}

const count = (name) =>
  db.prepare('SELECT COUNT(*) c FROM events WHERE name = ?').get(name).c;

const quote = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

/** Die Kennzahlentabelle aus Kapitel 17 mit Zielwerten und Ampel. */
function kpis() {
  const gestartet = count('diagnostic_gestartet');
  const fertig = count('diagnostic_abgeschlossen');
  const karten = count('ergebniskarte_erzeugt');
  const geteilt = count('ergebniskarte_geteilt');
  const registriert = count('registriert');
  const ersteSession = count('erste_session');
  const sessionsAuf = count('session_gestartet');
  const sessionsZu = count('session_abgeschlossen');
  const kaeufe = count('kauf_abgeschlossen');

  const fragenGesamt = db.prepare('SELECT COUNT(*) c FROM attempts').get().c;
  const fehlermeldungen = db.prepare(
    "SELECT COUNT(*) c FROM content_flags WHERE object_type = 'question'"
  ).get().c;
  const ergebnisse = db.prepare('SELECT COUNT(*) c FROM exam_results').get().c;

  const rows = [
    { phase: 'Akquisition', kennzahl: 'Diagnostic gestartet zu abgeschlossen', wert: quote(fertig, gestartet), einheit: '%', ziel: 60, richtung: 'über' },
    { phase: 'Akquisition', kennzahl: 'Teilquote der Ergebniskarte',           wert: quote(geteilt, karten),   einheit: '%', ziel: 15, richtung: 'über' },
    { phase: 'Aktivierung', kennzahl: 'Registrierung zu erster Lernsession',   wert: quote(ersteSession, registriert), einheit: '%', ziel: 50, richtung: 'über' },
    { phase: 'Nutzung',     kennzahl: 'Abschlussquote begonnener Sessions',    wert: quote(sessionsZu, sessionsAuf),   einheit: '%', ziel: 70, richtung: 'über' },
    { phase: 'Erlös',      kennzahl: 'Diagnostic zu Kauf',                    wert: quote(kaeufe, fertig),    einheit: '%', ziel: 3,  richtung: 'über' },
    { phase: 'Qualität',   kennzahl: 'Gemeldete Sachfehler je 100 Fragen',    wert: fragenGesamt ? Math.round((fehlermeldungen / fragenGesamt) * 10000) / 100 : null, einheit: '', ziel: 1, richtung: 'unter' },
    { phase: 'Ergebnis',    kennzahl: 'Gemeldete Prüfungsergebnisse',          wert: ergebnisse, einheit: '', ziel: 50, richtung: 'über' }
  ];

  for (const r of rows) {
    if (r.wert === null) { r.ampel = 'keine_daten'; continue; }
    const ok = r.richtung === 'über' ? r.wert >= r.ziel : r.wert <= r.ziel;
    r.ampel = ok ? 'gruen' : 'rot';
  }
  return rows;
}

/** Leitkennzahl Kapitel 17: wöchentlicher geprüfter Mastery-Zuwachs. */
function masteryZuwachsProWoche() {
  const row = db.prepare(`
    SELECT AVG(m.value) avg_now, COUNT(DISTINCT m.user_id) nutzer
    FROM mastery m
  `).get();
  const erste = db.prepare(`
    SELECT AVG(json_extract(result, '$.gesamt')) v
    FROM diagnostic_runs WHERE result IS NOT NULL
  `).get();
  const wochen = db.prepare(`
    SELECT AVG(julianday('now') - julianday(created_at)) / 7.0 w FROM users
  `).get();
  if (!row.nutzer || !erste.v || !wochen.w) return null;
  const delta = (row.avg_now * 100) - erste.v;
  return Math.round((delta / Math.max(wochen.w, 0.5)) * 10) / 10;
}

module.exports = { track, kpis, count, masteryZuwachsProWoche, json };
