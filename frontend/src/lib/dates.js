export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export const pad = (n) => String(n).padStart(2, "0");
export const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
// Weeks start on Sunday.
export const startOfWeek = (d) =>
  addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -d.getDay());

export const longHebrewDate = (d) =>
  d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
