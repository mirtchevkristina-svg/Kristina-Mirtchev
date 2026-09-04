'use strict';
// Befuellt die Datenbank mit dem Content-Bestand aus content/.
// Idempotent: bestehende Objekte werden aktualisiert, Nutzerdaten bleiben unberuehrt.
// `npm run reset` leert zuvor saemtliche Tabellen.

const db = require('../server/db');
const topics = require('../content/topics');
const lessons = require('../content/lessons');
const questions = require('../content/questions');
const cases = require('../content/cases');

const reset = process.argv.includes('--reset');

if (reset) {
  db.exec(`
    DELETE FROM ai_usage; DELETE FROM exam_results; DELETE FROM events;
    DELETE FROM content_flags; DELETE FROM referrals; DELETE FROM orders;
    DELETE FROM study_groups; DELETE FROM waitlist; DELETE FROM diagnostic_runs;
    DELETE FROM case_submissions; DELETE FROM srs; DELETE FROM mastery;
    DELETE FROM attempts; DELETE FROM auth_tokens; DELETE FROM users;
    DELETE FROM cases; DELETE FROM questions; DELETE FROM lessons; DELETE FROM topics;
  `);
  console.log('Datenbank geleert.');
}

const upTopic = db.prepare(`
  INSERT INTO topics (id, subject, name, exam_weight, ord) VALUES (@id, @subject, @name, @exam_weight, @ord)
  ON CONFLICT(id) DO UPDATE SET subject=@subject, name=@name, exam_weight=@exam_weight, ord=@ord`);

const upLesson = db.prepare(`
  INSERT INTO lessons (id, topic_id, title, body, audio_script, minutes, ord, status)
  VALUES (@id, @topic_id, @title, @body, @audio_script, @minutes, @ord, @status)
  ON CONFLICT(id) DO UPDATE SET topic_id=@topic_id, title=@title, body=@body,
    audio_script=@audio_script, minutes=@minutes, ord=@ord,
    version = version + 1`);

const upQuestion = db.prepare(`
  INSERT INTO questions (id, topic_id, type, stem, options, answer, explanation, difficulty, in_diagnostic, status)
  VALUES (@id, @topic_id, @type, @stem, @options, @answer, @explanation, @difficulty, @in_diagnostic, @status)
  ON CONFLICT(id) DO UPDATE SET topic_id=@topic_id, type=@type, stem=@stem, options=@options,
    answer=@answer, explanation=@explanation, difficulty=@difficulty, in_diagnostic=@in_diagnostic,
    version = version + 1`);

const upCase = db.prepare(`
  INSERT INTO cases (id, topic_id, title, facts, question, rubric, minutes, status)
  VALUES (@id, @topic_id, @title, @facts, @question, @rubric, @minutes, @status)
  ON CONFLICT(id) DO UPDATE SET topic_id=@topic_id, title=@title, facts=@facts, question=@question,
    rubric=@rubric, minutes=@minutes, version = version + 1`);

const run = db.transaction(() => {
  for (const t of topics) upTopic.run(t);
  for (const l of lessons) upLesson.run({ audio_script: null, ...l });
  for (const q of questions) upQuestion.run({
    ...q, options: JSON.stringify(q.options), answer: JSON.stringify(q.answer)
  });
  for (const c of cases) upCase.run({ ...c, rubric: JSON.stringify(c.rubric) });
});
run();

const c = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(`Content geladen: ${c('topics')} Themen, ${c('lessons')} Lektionen, ` +
            `${c('questions')} Fragen, ${c('cases')} Fälle.`);

const ungeprueft = db.prepare("SELECT COUNT(*) c FROM questions WHERE status != 'geprueft'").get().c;
if (ungeprueft) {
  console.log(`\n  ACHTUNG: ${ungeprueft} Fragen sind nicht juristisch freigegeben.`);
  console.log('  Dieser Bestand ist ein Platzhalter und darf nicht verkauft werden.');
  console.log('  Freigabe im Backoffice unter /admin (Kapitel 8 des Business Case).\n');
}
