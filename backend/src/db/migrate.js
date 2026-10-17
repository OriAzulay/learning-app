// Creates every table if it is missing. Safe to run on every startup.
// `PRAGMA user_version` records the schema version, so a future change can
// add a "version 2" step without touching existing data.

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  key     TEXT NOT NULL,
  label   TEXT NOT NULL,
  sort    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (role_id, key)
);

-- The question bank. check_json says how an answer is checked.
CREATE TABLE IF NOT EXISTS questions (
  role_id    TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  topic      TEXT NOT NULL,
  level      INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  question   TEXT NOT NULL,
  solution   TEXT NOT NULL,
  check_json TEXT NOT NULL,
  PRIMARY KEY (role_id, id)
);

-- One row per role per day that was opened.
CREATE TABLE IF NOT EXISTS days (
  role_id   TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  submitted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (role_id, date)
);

-- The day's questions. The question text is copied in on purpose, so later
-- edits to the bank never change history.
CREATE TABLE IF NOT EXISTS day_items (
  role_id     TEXT NOT NULL,
  date        TEXT NOT NULL,
  position    INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  topic       TEXT NOT NULL,
  level       INTEGER NOT NULL,
  question    TEXT NOT NULL,
  solution    TEXT NOT NULL,
  check_json  TEXT NOT NULL,
  answer      TEXT NOT NULL DEFAULT '',
  edit_flags  TEXT,
  result      INTEGER NOT NULL DEFAULT 0,
  done        INTEGER NOT NULL DEFAULT 0,
  view        TEXT NOT NULL DEFAULT 'ans' CHECK (view IN ('ans', 'sol')),
  PRIMARY KEY (role_id, date, position),
  FOREIGN KEY (role_id, date) REFERENCES days(role_id, date) ON DELETE CASCADE
);

-- When each question was last asked and whether it was answered correctly.
-- Feeds the adaptive picker.
CREATE TABLE IF NOT EXISTS seen (
  role_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  last_date   TEXT NOT NULL,
  ok          INTEGER,
  PRIMARY KEY (role_id, question_id)
);
`;

export function migrate(db) {
  const version = db.pragma("user_version", { simple: true });
  if (version < 1) {
    db.exec(SCHEMA_V1);
    db.pragma("user_version = 1");
  }
}
