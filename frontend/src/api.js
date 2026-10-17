// The only place that talks to the backend. Every call is JSON over /api
// (in development Vite proxies /api to the Express server).

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || res.statusText);
  return data;
}

const enc = encodeURIComponent;
const dayPath = (role, date) => `/roles/${enc(role)}/days/${enc(date)}`;

export const api = {
  roles: () => request("GET", "/roles"),
  settings: () => request("GET", "/settings"),
  updateSettings: (patch) => request("PATCH", "/settings", patch),
  stats: (role) => request("GET", `/roles/${enc(role)}/stats`),
  week: (role, from, to) =>
    request("GET", `/roles/${enc(role)}/days?from=${enc(from)}&to=${enc(to)}`),
  openDay: (role, date) => request("POST", dayPath(role, date)),
  day: (role, date) => request("GET", dayPath(role, date)),
  saveItem: (role, date, i, patch) => request("PATCH", `${dayPath(role, date)}/items/${i}`, patch),
  toggleResult: (role, date, i) =>
    request("POST", `${dayPath(role, date)}/items/${i}/toggle-result`),
  submit: (role, date) => request("POST", `${dayPath(role, date)}/submit`),
  addMore: (role, date) => request("POST", `${dayPath(role, date)}/more`),
  exportBackup: () => request("GET", "/backup"),
  importBackup: (data) => request("POST", "/backup", data),
};
