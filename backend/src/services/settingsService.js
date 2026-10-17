import { HttpError } from "../errors.js";

export function createSettingsService(db, roles) {
  const getStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const setStmt = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
  );

  function get() {
    return {
      userName: getStmt.get("user_name")?.value ?? "",
      role: getStmt.get("role")?.value ?? roles.list()[0]?.id ?? null,
    };
  }

  function update({ userName, role }) {
    if (role !== undefined && !roles.exists(role)) throw new HttpError(400, "Unknown role");
    db.transaction(() => {
      if (userName !== undefined) setStmt.run("user_name", userName);
      if (role !== undefined) setStmt.run("role", role);
    })();
    return get();
  }

  return { get, update };
}
