export function createRoleService(db) {
  const rolesStmt = db.prepare("SELECT id, label FROM roles ORDER BY sort, id");
  const topicsStmt = db.prepare("SELECT key, label FROM topics WHERE role_id = ? ORDER BY sort");
  const existsStmt = db.prepare("SELECT 1 FROM roles WHERE id = ?");

  return {
    list: () => rolesStmt.all().map((r) => ({ ...r, topics: topicsStmt.all(r.id) })),
    exists: (id) => !!existsStmt.get(id),
  };
}
