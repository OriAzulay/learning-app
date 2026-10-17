import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate.js";

// Opens (or creates) the SQLite file and makes sure the schema exists.
// Pass ":memory:" for a throwaway database (the tests do this).
export function openDb(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  if (file !== ":memory:") db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}
