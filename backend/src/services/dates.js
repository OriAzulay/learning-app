const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" in the server's local time zone.
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toUtc = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// Whole days from date key a to date key b.
export const daysBetween = (a, b) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);

export const isValidDateKey = (k) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  const [y, m, d] = k.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
