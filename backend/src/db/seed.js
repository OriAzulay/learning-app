import { fileURLToPath } from "node:url";
import { ROLES, DEFAULT_SETTINGS } from "../seed-data/roles.js";

// Loads (or refreshes) roles, topics and the question bank from src/seed-data.
// It upserts, so running it again updates question text without touching
// your history (days, answers, seen).
export function seed(db) {
  const upsertRole = db.prepare(
    `INSERT INTO roles (id, label, sort) VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET label = excluded.label, sort = excluded.sort`,
  );
  const upsertTopic = db.prepare(
    `INSERT INTO topics (role_id, key, label, sort) VALUES (?, ?, ?, ?)
     ON CONFLICT (role_id, key) DO UPDATE SET label = excluded.label, sort = excluded.sort`,
  );
  const upsertQuestion = db.prepare(
    `INSERT INTO questions (role_id, id, topic, level, question, solution, check_json)
     VALUES (@role, @id, @topic, @level, @q, @a, @check)
     ON CONFLICT (role_id, id) DO UPDATE SET topic = excluded.topic, level = excluded.level,
       question = excluded.question, solution = excluded.solution, check_json = excluded.check_json`,
  );
  const insertSetting = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING",
  );

  let count = 0;
  db.transaction(() => {
    ROLES.forEach((role, ri) => {
      upsertRole.run(role.id, role.label, ri);
      Object.entries(role.topics).forEach(([key, label], ti) =>
        upsertTopic.run(role.id, key, label, ti),
      );
      for (const q of role.questions()) {
        upsertQuestion.run({
          role: role.id,
          id: q.id,
          topic: q.topic,
          level: q.level,
          q: q.q,
          a: q.a,
          check: JSON.stringify(q.check),
        });
        count++;
      }
    });
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);
  })();
  return count;
}

// Called on startup: seeds only when the bank is empty (the first run).
export function seedIfEmpty(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM questions").get();
  return n === 0 ? seed(db) : 0;
}

// `npm run seed`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadConfig } = await import("../config.js");
  const { openDb } = await import("./connection.js");
  const db = openDb(loadConfig().dbPath);
  console.log(`Seeded ${seed(db)} questions into the bank.`);
  db.close();
}
