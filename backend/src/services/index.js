import { createBackupService } from "./backupService.js";
import { createDayService } from "./dayService.js";
import { createRoleService } from "./roleService.js";
import { createSettingsService } from "./settingsService.js";
import { topicStats } from "./statsService.js";

// Wires every service to one database connection.
// `now` and `rng` are injectable so tests can fix "today" and the random picks.
export function createServices(db, { now, rng } = {}) {
  const roles = createRoleService(db);
  const settings = createSettingsService(db, roles);
  return {
    roles,
    settings,
    days: createDayService(db, { now, rng }),
    stats: { forRole: (role) => topicStats(db, role) },
    backup: createBackupService(db, roles, settings),
  };
}
