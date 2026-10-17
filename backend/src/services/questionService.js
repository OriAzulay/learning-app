import { daysBetween } from "./dates.js";
import { topicStats } from "./statsService.js";

export const QUESTIONS_PER_DAY = 20; // 5 levels × 4 questions
export const LEVELS = 5;

export function loadBank(db, roleId) {
  return db
    .prepare(
      `SELECT id, topic, level, question, solution, check_json
       FROM questions WHERE role_id = ? ORDER BY rowid`,
    )
    .all(roleId);
}

function loadSeen(db, roleId) {
  const seen = {};
  for (const r of db
    .prepare("SELECT question_id, last_date, ok FROM seen WHERE role_id = ?")
    .all(roleId)) {
    seen[r.question_id] = { d: r.last_date, ok: r.ok == null ? undefined : r.ok === 1 };
  }
  return seen;
}

// Picks QUESTIONS_PER_DAY questions of rising difficulty (levels 1 to 5), skipping
// excludeIds. It prefers questions never asked, brings back wrong answers after
// 3 days, favors weak topics and spreads topics out. `rng` is injectable for tests.
export function pickQuestions(db, roleId, dateKey, excludeIds = [], rng = Math.random) {
  const exclude = new Set(excludeIds);
  const pool = loadBank(db, roleId).filter((q) => !exclude.has(q.id));
  const seen = loadSeen(db, roleId);
  const stats = topicStats(db, roleId);
  const perLevel = Math.round(QUESTIONS_PER_DAY / LEVELS);
  const topicCount = {};
  const picked = [];
  const pickedSet = new Set();

  const score = (q) => {
    const s = seen[q.id];
    let base;
    if (!s)
      base = 3; // never asked
    else {
      const age = Math.max(0, daysBetween(s.d, dateKey));
      if (age < 1) return 0;
      base = s.ok === false && age >= 3 ? 2.5 : Math.min(2, age / 20); // mistakes come back after 3 days
    }
    const st = stats[q.topic];
    const weak = st && st.total ? 1 + (1 - st.ok / st.total) * 2 : 1.4; // weak topics first
    const spread = 1 / (1 + (topicCount[q.topic] || 0) * 1.5); // topic variety
    return base * weak * spread * (0.6 + rng() * 0.8);
  };

  for (let lv = 1; lv <= LEVELS; lv++) {
    const want = lv === LEVELS ? QUESTIONS_PER_DAY - picked.length : perLevel;
    for (let k = 0; k < want; k++) {
      let cands = pool.filter((q) => q.level === lv && !pickedSet.has(q));
      if (!cands.length) cands = pool.filter((q) => !pickedSet.has(q));
      let best = null;
      let bestScore = -1;
      for (const q of cands) {
        const sc = score(q);
        if (sc > bestScore) {
          bestScore = sc;
          best = q;
        }
      }
      if (!best) break;
      picked.push(best);
      pickedSet.add(best);
      topicCount[best.topic] = (topicCount[best.topic] || 0) + 1;
    }
  }

  // Remember the date each question was asked (keeps any earlier ok/wrong result).
  const markSeen = db.prepare(
    `INSERT INTO seen (role_id, question_id, last_date) VALUES (?, ?, ?)
     ON CONFLICT (role_id, question_id) DO UPDATE SET last_date = excluded.last_date`,
  );
  for (const q of picked) markSeen.run(roleId, q.id, dateKey);
  return picked;
}
