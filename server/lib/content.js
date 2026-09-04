'use strict';
// Zugriffsschicht auf Lernobjekte. Sie setzt die Regel aus Kapitel 8 durch:
// nur juristisch geprüfter Content fließt in Scores und Ausspielung.
const db = require('../db');
const config = require('../config');

const VEROEFFENTLICHBAR = ['geprueft'];
const ENTWICKLUNG = ['geprueft', 'in_pruefung', 'ki_erstellt', 'entwurf'];

function statusFilter() {
  const list = config.allowUnreviewed ? ENTWICKLUNG : VEROEFFENTLICHBAR;
  return { sql: `status IN (${list.map(() => '?').join(',')})`, params: list };
}

/** Wird die Auslieferung ungeprueften Materials gerade zugelassen? */
function unreviewedActive() {
  if (!config.allowUnreviewed) return false;
  const c = db.prepare("SELECT COUNT(*) c FROM questions WHERE status != 'geprueft'").get().c;
  return c > 0;
}

/** Warnbanner, das das Frontend anzeigen MUSS, solange ungeprueft ausgeliefert wird. */
function warnung() {
  if (!unreviewedActive()) return null;
  return {
    stufe: 'warnung',
    text: 'Dieser Bestand enthält noch nicht juristisch freigegebene Inhalte. ' +
          'Nicht für den Verkauf an Studierende. CONTENT_ALLOW_UNREVIEWED=false setzen.'
  };
}

function questions(where = '', params = []) {
  const f = statusFilter();
  return db.prepare(
    `SELECT * FROM questions WHERE ${f.sql} ${where ? 'AND ' + where : ''}`
  ).all(...f.params, ...params);
}

function lessons(where = '', params = []) {
  const f = statusFilter();
  return db.prepare(
    `SELECT * FROM lessons WHERE ${f.sql} ${where ? 'AND ' + where : ''} ORDER BY ord`
  ).all(...f.params, ...params);
}

function cases(where = '', params = []) {
  const f = statusFilter();
  return db.prepare(
    `SELECT * FROM cases WHERE ${f.sql} ${where ? 'AND ' + where : ''}`
  ).all(...f.params, ...params);
}

/** Frageobjekt für das Frontend - ohne Loesung. */
function publicQuestion(q) {
  return {
    id: q.id, topicId: q.topic_id, type: q.type, stem: q.stem,
    options: JSON.parse(q.options), status: q.status,
    geprueft: q.status === 'geprueft', pruefer: q.reviewer || null
  };
}

module.exports = { questions, lessons, cases, publicQuestion, statusFilter, warnung, unreviewedActive };
