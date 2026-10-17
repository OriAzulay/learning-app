import { startOfWeek } from "./lib/dates.js";

// Everything the screens need, loaded from the API. Nothing is stored in the browser.
export const state = {
  roles: [], // [{ id, label, topics: [{ key, label }] }]
  settings: { userName: "", role: "backend" },
  weekStart: startOfWeek(new Date()),
  currentDay: null, // "YYYY-MM-DD" while the questions screen is open
  day: null, // the open day: { date, submitted, batchSize, items: [...] }
};

export const currentRole = () =>
  state.roles.find((r) => r.id === state.settings.role) ?? state.roles[0];

export const topicLabels = () =>
  Object.fromEntries((currentRole()?.topics ?? []).map((t) => [t.key, t.label]));
