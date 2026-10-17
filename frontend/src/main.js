import "./styles.css";
import { api, ApiError } from "./api.js";
import { $ } from "./dom.js";
import { addDays, dkey, parseKey, startOfWeek } from "./lib/dates.js";
import { currentRole, state } from "./state.js";
import { showHome } from "./views/home.js";
import { initQuiz, saver, showQuiz } from "./views/quiz.js";
import { toast } from "./views/toast.js";
import { renderWeeks, weekDays } from "./views/weekStrip.js";

/* ---------- routing: #/ and #/day/YYYY-MM-DD ---------- */

let routeSeq = 0;

async function route() {
  const my = ++routeSeq;
  try {
    await saver.flush();
    const role = currentRole().id;
    const todayK = dkey(new Date());
    await api.openDay(role, todayK); // creates today's 20 questions the first time

    const m = location.hash.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/);
    let day = null;
    if (m) day = await api.day(role, m[1]).catch(ignore404);
    if (my !== routeSeq) return; // the user already navigated somewhere else

    if (day) {
      state.currentDay = day.date;
      state.day = day;
      state.weekStart = startOfWeek(parseKey(day.date));
      await showQuiz();
    } else {
      state.currentDay = null;
      state.day = null;
      state.weekStart = startOfWeek(parseKey(todayK));
      await showHome();
    }
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    toast("אין חיבור לשרת — ודא שהוא רץ ונסה לרענן");
  }
}

function ignore404(err) {
  if (err instanceof ApiError && err.status === 404) return null;
  throw err;
}

const go = (hash) => {
  if (location.hash === hash) route();
  else location.hash = hash;
};

/* ---------- events ---------- */

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act],[data-day]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "next" || act === "prev" || act === "thisweek") {
    state.weekStart =
      act === "thisweek"
        ? startOfWeek(new Date())
        : addDays(state.weekStart, act === "next" ? 7 : -7);
    renderWeeks().catch(() => toast("אין חיבור לשרת"));
    return;
  }
  if (b.dataset.day) {
    const k = b.dataset.day;
    if (k > dkey(new Date()))
      return toast("היום הזה עוד לא הגיע — השאלות שלו ייווצרו כשתפתח את האפליקציה באותו יום");
    if (!weekDays().days.has(k)) return toast("לא נפתחו שאלות ביום הזה");
    go("#/day/" + k);
  }
});

$("#roleSelect").addEventListener("change", async (e) => {
  try {
    state.settings = await api.updateSettings({ role: e.target.value });
    route();
  } catch {
    toast("לא הצלחתי לשמור בשרת");
  }
});
$("#startBtn").addEventListener("click", () => go("#/day/" + dkey(new Date())));
$("#backBtn").addEventListener("click", () => go("#/"));
initQuiz();

/* ---------- backup ---------- */

$("#exportBtn").addEventListener("click", async () => {
  try {
    await saver.flush();
    const data = await api.exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `learning-backup-${dkey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch {
    toast("הייצוא נכשל");
  }
});

$("#importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  e.target.value = "";
  try {
    const data = JSON.parse(await f.text());
    await api.importBackup(data);
    state.settings = await api.settings();
    toast("הגיבוי נטען");
    route();
  } catch {
    toast("הקובץ הזה לא נראה כמו גיבוי של האפליקציה");
  }
});

/* ---------- start ---------- */

// If the app stayed open past midnight, move to the new day. Also save
// pending answers when the tab is hidden.
let lastDay = dkey(new Date());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saver.flush();
    return;
  }
  if (dkey(new Date()) !== lastDay) {
    lastDay = dkey(new Date());
    route();
  }
});

window.addEventListener("hashchange", route);

async function boot() {
  try {
    [state.roles, state.settings] = await Promise.all([api.roles(), api.settings()]);
  } catch {
    toast("אין חיבור לשרת — ודא שהוא רץ ונסה לרענן");
    return;
  }
  route();
}
boot();
