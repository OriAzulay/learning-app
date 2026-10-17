// Per-topic results over every submitted question of a role.

export function rating(st) {
  if (!st || !st.total) return "none";
  const p = st.ok / st.total;
  return p >= 0.75 ? "green" : p >= 0.5 ? "orange" : "red";
}

export function topicStats(db, roleId) {
  const rows = db
    .prepare(
      `SELECT topic, SUM(result) AS ok, COUNT(*) AS total
       FROM day_items WHERE role_id = ? AND done = 1
       GROUP BY topic`,
    )
    .all(roleId);
  const stats = {};
  for (const r of rows) stats[r.topic] = { ok: r.ok, total: r.total, rating: rating(r) };
  return stats;
}
