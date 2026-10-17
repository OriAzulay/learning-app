import { createApp } from "../src/app.js";
import { openDb } from "../src/db/connection.js";
import { seed } from "../src/db/seed.js";
import { createServices } from "../src/services/index.js";

// Small deterministic random generator, so the question picker is repeatable in tests.
export function seededRng(seedValue = 42) {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A clock whose "today" the test controls.
export function fakeClock(dateKey) {
  let current;
  const clock = {
    set(k) {
      const [y, m, d] = k.split("-").map(Number);
      current = new Date(y, m - 1, d, 12);
    },
    now: () => current,
  };
  clock.set(dateKey);
  return clock;
}

// Fresh in-memory database with the real question bank. Never touches data/app.db.
export function makeDb() {
  const db = openDb(":memory:");
  seed(db);
  return db;
}

export function makeServices({ today = "2026-10-15" } = {}) {
  const db = makeDb();
  const clock = fakeClock(today);
  return { db, clock, services: createServices(db, { now: clock.now, rng: seededRng() }) };
}

export const testConfig = {
  corsOrigin: "http://localhost:5173",
  rateLimitMax: 10_000,
  cacheTtlMs: 30_000,
  staticDir: null,
};

export function makeApp({ today = "2026-10-15", config = {}, logger } = {}) {
  const db = makeDb();
  const clock = fakeClock(today);
  const errors = [];
  const app = createApp({
    db,
    config: { ...testConfig, ...config },
    now: clock.now,
    rng: seededRng(),
    logger: logger ?? { error: (e) => errors.push(e) },
  });
  return { app, db, clock, errors };
}
