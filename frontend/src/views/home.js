import { api } from "../api.js";
import { $, h } from "../dom.js";
import { dkey, longHebrewDate } from "../lib/dates.js";
import { orderTopics, startButton, topicMeta } from "../lib/quizState.js";
import { currentRole, state } from "../state.js";
import { renderWeeks, weekDays } from "./weekStrip.js";

export async function showHome() {
  const role = currentRole();
  const [stats] = await Promise.all([api.stats(role.id), renderWeeks()]);

  $("#home").classList.remove("hidden");
  $("#quiz").classList.add("hidden");
  $("#userName").textContent = state.settings.userName;
  $("#todayStr").textContent = longHebrewDate(new Date());

  $("#roleSelect").replaceChildren(
    ...state.roles.map((r) => h("option", { value: r.id, selected: r.id === role.id }, r.label)),
  );

  const labels = Object.fromEntries(role.topics.map((t) => [t.key, t.label]));
  $("#topics").replaceChildren(
    ...orderTopics(Object.keys(labels), stats).map((t) =>
      h(
        "div",
        { class: "topic" },
        h("i", { class: ["circle", stats[t]?.rating ?? "none"] }),
        h("span", { class: "name" }, labels[t]),
        h("span", { class: "meta" }, topicMeta(stats[t])),
      ),
    ),
  );

  const today = weekDays().days.get(dkey(new Date())) ?? {
    submitted: false,
    answered: 0,
    total: 0,
    correct: 0,
  };
  const btn = startButton(today);
  $("#startBtn").textContent = btn.label;
  $("#startSub").textContent = btn.sub;
}
