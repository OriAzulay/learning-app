import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDb } from "./db/connection.js";
import { seedIfEmpty } from "./db/seed.js";

const config = loadConfig();
const db = openDb(config.dbPath);
const seeded = seedIfEmpty(db);
if (seeded) console.log(`First run: seeded ${seeded} questions.`);

const app = createApp({ db, config });
const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
