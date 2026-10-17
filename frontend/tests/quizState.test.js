import { describe, expect, it } from "vitest";
import {
  dayCell,
  orderTopics,
  quizProgress,
  scoreCard,
  startButton,
  submitState,
  topicMeta,
  weekLabel,
} from "../src/lib/quizState.js";

const item = (answer, done = false, result = false) => ({ answer, done, result });

describe("quizProgress and submitState", () => {
  it("keeps Submit disabled until every pending question is answered", () => {
    const p = quizProgress([item("a"), item(" "), item("")]);
    expect(p).toMatchObject({ total: 3, answered: 1, left: 2, pending: [0, 1, 2] });
    expect(submitState(p)).toEqual({
      hidden: false,
      disabled: true,
      hint: "ה-Submit ייפתח אחרי שתענה על כל 3 השאלות (נשארו 2)",
    });
  });

  it("enables Submit when all are answered and hides it when nothing is pending", () => {
    expect(submitState(quizProgress([item("a"), item("b")]))).toMatchObject({
      disabled: false,
      hint: "מוכן להגשה!",
    });
    expect(submitState(quizProgress([item("a", true)])).hidden).toBe(true);
  });
});

describe("scoreCard", () => {
  it("is empty before any submit", () => {
    expect(scoreCard(quizProgress([item("a")]))).toBeNull();
  });

  it("shows the score of submitted questions", () => {
    const card = scoreCard(quizProgress([item("a", true, true), item("b", true, false)]));
    expect(card.score).toBe("1/2");
    expect(card.text).toMatch(/^הוגש!/);
  });

  it("mentions newly added questions", () => {
    const card = scoreCard(quizProgress([item("a", true, true), item("")]));
    expect(card.text).toMatch(/נוספו 1 שאלות חדשות/);
  });
});

describe("topics", () => {
  it("orders tested topics weakest first, then untested in original order", () => {
    const stats = { b: { ok: 3, total: 4 }, c: { ok: 1, total: 4 } };
    expect(orderTopics(["a", "b", "c", "d"], stats)).toEqual(["c", "b", "a", "d"]);
  });

  it("formats topic meta", () => {
    expect(topicMeta({ ok: 2, total: 3 })).toBe("2/3 · 67%");
    expect(topicMeta(undefined)).toBe("טרם נבחן");
  });
});

describe("startButton", () => {
  it("changes with today's progress", () => {
    expect(startButton({ submitted: false, answered: 0, total: 20, correct: 0 }).label).toBe(
      "התחל",
    );
    expect(startButton({ submitted: false, answered: 3, total: 20, correct: 0 })).toEqual({
      label: "המשך",
      sub: "20 שאלות מוכנות להיום · ענית על 3",
    });
    expect(startButton({ submitted: true, answered: 20, total: 20, correct: 15 })).toEqual({
      label: "צפה בתוצאות היום",
      sub: "הגשת היום · ציון 15/20",
    });
  });
});

describe("week strip", () => {
  it("builds a day cell", () => {
    expect(dayCell("2026-10-15", undefined, "2026-10-15", null)).toEqual({
      classes: ["day", "today"],
      dot: null,
      title: "",
    });
    expect(dayCell("2026-10-16", undefined, "2026-10-15", null).classes).toContain("future");
    const done = { submitted: true, answered: 20, total: 20, correct: 12 };
    expect(dayCell("2026-10-13", done, "2026-10-15", "2026-10-13")).toEqual({
      classes: ["day", "selected"],
      dot: "done",
      title: "ציון: 12/20",
    });
    const wip = { submitted: false, answered: 2, total: 20, correct: 0 };
    expect(dayCell("2026-10-14", wip, "2026-10-15", null).dot).toBe("wip");
  });

  it("labels the week", () => {
    const start = new Date(2026, 9, 4);
    const end = new Date(2026, 9, 10);
    expect(weekLabel(start, end, true)).toEqual({ text: "השבוע", showBack: false });
    expect(weekLabel(start, end, false)).toEqual({ text: "4.10 – 10.10 ", showBack: true });
  });
});
