import { api } from "../api.js";
import { $, h } from "../dom.js";
import { addDays, DAY_NAMES, dkey, pad, startOfWeek } from "../lib/dates.js";
import { dayCell, weekLabel } from "../lib/quizState.js";
import { currentRole, state } from "../state.js";

let lastWeek = { today: null, days: new Map() };
let seq = 0;

// Day summaries of the week on screen (also used by the home screen and day clicks).
export const weekDays = () => lastWeek;

// Loads the summaries of the visible week, then draws both week strips.
export async function renderWeeks() {
  const my = ++seq;
  const start = state.weekStart;
  const end = addDays(start, 6);
  const res = await api.week(currentRole().id, dkey(start), dkey(end));
  if (my !== seq) return; // a newer call is already drawing
  lastWeek = { today: res.today, days: new Map(res.days.map((d) => [d.date, d])) };
  draw();
}

function draw() {
  const todayK = dkey(new Date());
  const start = state.weekStart;
  const isThisWeek = dkey(start) === dkey(startOfWeek(new Date()));
  const label = weekLabel(start, addDays(start, 6), isThisWeek);
  for (const id of ["#weekLabelHome", "#weekLabelQuiz"]) {
    $(id).replaceChildren(
      label.text,
      label.showBack ? h("button", { dataset: { act: "thisweek" } }, "חזרה להיום") : "",
    );
  }

  const cells = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    const k = dkey(d);
    const c = dayCell(k, lastWeek.days.get(k), todayK, state.currentDay);
    cells.push(
      h(
        "button",
        { class: c.classes, dataset: { day: k }, title: c.title },
        h("span", { class: "dn" }, DAY_NAMES[i]),
        h("span", { class: "dd" }, `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`),
        c.dot ? h("i", { class: ["dot", c.dot] }) : null,
      ),
    );
  }
  document.querySelectorAll("[data-week]").forEach((nav) =>
    nav.replaceChildren(
      h(
        "button",
        { class: "arrow prev", dataset: { act: "prev" }, "aria-label": "שבוע קודם" },
        "›",
      ),
      h(
        "div",
        { class: "week-days" },
        cells.map((c) => c.cloneNode(true)),
      ),
      h("button", { class: "arrow", dataset: { act: "next" }, "aria-label": "שבוע הבא" }, "‹"),
    ),
  );
}
