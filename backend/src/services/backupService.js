// Export / import of all progress as one JSON file. The format is the same one
// the old single-file app saved from localStorage, so an old "learning-backup-*.json"
// can be imported to move existing history into the database.

export function createBackupService(db, roles, settings) {
  function exportAll() {
    const days = {};
    const seen = {};
    const itemsStmt = db.prepare(
      "SELECT * FROM day_items WHERE role_id = ? AND date = ? ORDER BY position",
    );
    for (const d of db
      .prepare("SELECT role_id, date, submitted FROM days ORDER BY role_id, date")
      .all()) {
      const items = itemsStmt.all(d.role_id, d.date);
      const ansEdit = {};
      items.forEach((r, i) => {
        if (r.edit_flags) ansEdit[i] = r.edit_flags;
      });
      (days[d.role_id] ||= {})[d.date] = {
        items: items.map((r) => ({
          id: r.question_id,
          topic: r.topic,
          level: r.level,
          q: r.question,
          a: r.solution,
          check: JSON.parse(r.check_json),
        })),
        answers: items.map((r) => r.answer),
        results: items.map((r) => r.result === 1),
        done: items.map((r) => r.done === 1),
        view: items.map((r) => r.view),
        ansEdit,
        submitted: d.submitted === 1,
      };
    }
    for (const s of db.prepare("SELECT role_id, question_id, last_date, ok FROM seen").all()) {
      const entry = { d: s.last_date };
      if (s.ok != null) entry.ok = s.ok === 1;
      (seen[s.role_id] ||= {})[s.question_id] = entry;
    }
    const { role, userName } = settings.get();
    return { version: 1, role, userName, days, seen };
  }

  // `data` was already validated by the route (see routes/backup.js).
  // Replaces all history. Roles that don't exist here are skipped.
  function importAll(data) {
    const insertDay = db.prepare("INSERT INTO days (role_id, date, submitted) VALUES (?, ?, ?)");
    const insertItem = db.prepare(
      `INSERT INTO day_items (role_id, date, position, question_id, topic, level, question, solution,
                              check_json, answer, edit_flags, result, done, view)
       VALUES (@role, @date, @position, @id, @topic, @level, @q, @a, @check, @answer, @flags, @result, @done, @view)`,
    );
    const insertSeen = db.prepare(
      "INSERT INTO seen (role_id, question_id, last_date, ok) VALUES (?, ?, ?, ?)",
    );
    const skippedRoles = new Set();
    let dayCount = 0;

    db.transaction(() => {
      db.prepare("DELETE FROM day_items").run();
      db.prepare("DELETE FROM days").run();
      db.prepare("DELETE FROM seen").run();

      for (const [role, byDate] of Object.entries(data.days)) {
        if (!roles.exists(role)) {
          skippedRoles.add(role);
          continue;
        }
        for (const [date, sess] of Object.entries(byDate)) {
          insertDay.run(role, date, sess.submitted ? 1 : 0);
          dayCount++;
          sess.items.forEach((it, i) => {
            const answer = sess.answers?.[i] ?? "";
            const flags = sess.ansEdit?.[i];
            // Old backups have no `done` array: then everything counts as submitted iff the day was.
            const done = sess.done ? !!sess.done[i] : !!sess.submitted;
            insertItem.run({
              role,
              date,
              position: i,
              id: it.id,
              topic: it.topic,
              level: it.level,
              q: it.q,
              a: it.a,
              check: JSON.stringify(it.check),
              answer,
              flags: done && flags && flags.length === answer.length ? flags : null,
              result: sess.results?.[i] ? 1 : 0,
              done: done ? 1 : 0,
              view: done && sess.view?.[i] === "sol" ? "sol" : "ans",
            });
          });
        }
      }
      for (const [role, byId] of Object.entries(data.seen || {})) {
        if (!roles.exists(role)) continue;
        for (const [id, s] of Object.entries(byId)) {
          insertSeen.run(role, id, s.d, s.ok === undefined ? null : s.ok ? 1 : 0);
        }
      }
      const patch = {};
      if (data.role && roles.exists(data.role)) patch.role = data.role;
      if (data.userName) patch.userName = data.userName;
      settings.update(patch);
    })();

    return { days: dayCount, skippedRoles: [...skippedRoles] };
  }

  return { exportAll, importAll };
}
