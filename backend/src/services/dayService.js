import { HttpError, notFound } from "../errors.js";
import { checkAnswer } from "./checkService.js";
import { dateKey } from "./dates.js";
import { pickQuestions, QUESTIONS_PER_DAY } from "./questionService.js";

// What the client gets for one question. The solution is only included once
// the question has been submitted.
function toClientItem(row) {
  const done = row.done === 1;
  return {
    topic: row.topic,
    level: row.level,
    question: row.question,
    answer: row.answer,
    editFlags: row.edit_flags,
    done,
    result: row.result === 1,
    view: row.view,
    solution: done ? row.solution : null,
  };
}

export function createDayService(db, { now = () => new Date(), rng = Math.random } = {}) {
  const q = {
    day: db.prepare("SELECT submitted FROM days WHERE role_id = ? AND date = ?"),
    items: db.prepare("SELECT * FROM day_items WHERE role_id = ? AND date = ? ORDER BY position"),
    item: db.prepare("SELECT * FROM day_items WHERE role_id = ? AND date = ? AND position = ?"),
    insertDay: db.prepare("INSERT INTO days (role_id, date) VALUES (?, ?)"),
    insertItem: db.prepare(
      `INSERT INTO day_items (role_id, date, position, question_id, topic, level, question, solution, check_json)
       VALUES (@role, @date, @position, @id, @topic, @level, @question, @solution, @check_json)`,
    ),
    setSubmitted: db.prepare("UPDATE days SET submitted = ? WHERE role_id = ? AND date = ?"),
    saveAnswer: db.prepare(
      `UPDATE day_items SET answer = ?, edit_flags = ?
       WHERE role_id = ? AND date = ? AND position = ?`,
    ),
    saveView: db.prepare(
      "UPDATE day_items SET view = ? WHERE role_id = ? AND date = ? AND position = ?",
    ),
    saveResult: db.prepare(
      `UPDATE day_items SET result = ?, done = 1, view = ?
       WHERE role_id = ? AND date = ? AND position = ?`,
    ),
    seenOk: db.prepare(
      `INSERT INTO seen (role_id, question_id, last_date, ok) VALUES (?, ?, ?, ?)
       ON CONFLICT (role_id, question_id) DO UPDATE SET ok = excluded.ok`,
    ),
    updateSeenOk: db.prepare("UPDATE seen SET ok = ? WHERE role_id = ? AND question_id = ?"),
    week: db.prepare(
      `SELECT d.date, d.submitted,
              COUNT(i.position) AS total,
              COALESCE(SUM(i.result), 0) AS correct,
              COALESCE(SUM(CASE WHEN TRIM(i.answer, ' ' || char(9, 10, 13)) <> '' THEN 1 ELSE 0 END), 0) AS answered
       FROM days d
       LEFT JOIN day_items i ON i.role_id = d.role_id AND i.date = d.date
       WHERE d.role_id = ? AND d.date BETWEEN ? AND ?
       GROUP BY d.date ORDER BY d.date`,
    ),
  };

  const today = () => dateKey(now());

  function getDay(role, date) {
    const day = q.day.get(role, date);
    if (!day) return null;
    return {
      date,
      submitted: day.submitted === 1,
      batchSize: QUESTIONS_PER_DAY,
      items: q.items.all(role, date).map(toClientItem),
    };
  }

  function requireDay(role, date) {
    if (!q.day.get(role, date)) throw notFound("Day");
  }

  function requireItem(role, date, position) {
    const row = q.item.get(role, date, position);
    if (!row) throw notFound("Question");
    return row;
  }

  function insertItems(role, date, picked, start) {
    picked.forEach((p, k) =>
      q.insertItem.run({
        role,
        date,
        position: start + k,
        id: p.id,
        topic: p.topic,
        level: p.level,
        question: p.question,
        solution: p.solution,
        check_json: p.check_json,
      }),
    );
  }

  // Creates the day's 20 questions the first time today is opened.
  const openDay = db.transaction((role, date) => {
    if (q.day.get(role, date)) return { created: false, day: getDay(role, date) };
    if (date !== today()) throw new HttpError(404, "No questions were opened on this day");
    q.insertDay.run(role, date);
    insertItems(role, date, pickQuestions(db, role, date, [], rng), 0);
    return { created: true, day: getDay(role, date) };
  });

  function saveItem(role, date, position, { answer, editFlags, view }) {
    const row = requireItem(role, date, position);
    const done = row.done === 1;
    if (view !== undefined) {
      if (!done) throw new HttpError(409, "The solution opens after Submit");
      q.saveView.run(view, role, date, position);
    }
    if (answer !== undefined) {
      // Edit flags (which characters were changed after submit) only exist for submitted answers.
      q.saveAnswer.run(answer, done ? (editFlags ?? null) : null, role, date, position);
    }
    return toClientItem(q.item.get(role, date, position));
  }

  // The manual ✓/✗ fix for when the automatic check got it wrong.
  const toggleResult = db.transaction((role, date, position) => {
    const row = requireItem(role, date, position);
    if (row.done !== 1) throw new HttpError(409, "Only submitted questions can be re-marked");
    const result = row.result === 1 ? 0 : 1;
    q.saveResult.run(result, row.view, role, date, position);
    q.updateSeenOk.run(result, role, row.question_id);
    return toClientItem(q.item.get(role, date, position));
  });

  // Checks every question that wasn't submitted yet. All of them must have an answer.
  const submit = db.transaction((role, date) => {
    requireDay(role, date);
    const pending = q.items.all(role, date).filter((r) => r.done !== 1);
    if (!pending.length) throw new HttpError(409, "Nothing to submit");
    if (pending.some((r) => !r.answer.trim()))
      throw new HttpError(409, "Answer every question before submitting");
    for (const r of pending) {
      const ok = checkAnswer(JSON.parse(r.check_json), r.answer) ? 1 : 0;
      q.saveResult.run(ok, "ans", role, date, r.position);
      q.seenOk.run(role, r.question_id, date, ok);
    }
    q.setSubmitted.run(1, role, date);
    return { firstSubmitted: pending[0].position, day: getDay(role, date) };
  });

  // "add more questions": another 20 that aren't already in this day.
  const addMore = db.transaction((role, date) => {
    requireDay(role, date);
    const rows = q.items.all(role, date);
    const picked = pickQuestions(
      db,
      role,
      date,
      rows.map((r) => r.question_id),
      rng,
    );
    if (picked.length) {
      insertItems(role, date, picked, rows.length);
      q.setSubmitted.run(0, role, date);
    }
    return { added: picked.length, start: rows.length, day: getDay(role, date) };
  });

  // Small summary per day for the week strip (dots and score tooltips).
  function week(role, from, to) {
    return q.week.all(role, from, to).map((r) => ({
      date: r.date,
      submitted: r.submitted === 1,
      total: r.total,
      correct: r.correct,
      answered: r.answered,
    }));
  }

  return { today, getDay, openDay, saveItem, toggleResult, submit, addMore, week };
}
