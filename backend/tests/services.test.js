import { describe, expect, it } from "vitest";
import { pickQuestions, QUESTIONS_PER_DAY } from "../src/services/questionService.js";
import { rating, topicStats } from "../src/services/statsService.js";
import { daysBetween, isValidDateKey } from "../src/services/dates.js";
import { makeDb, makeServices, seededRng } from "./helpers.js";

const answerAll = (days, day, text = "answer") =>
  day.items.forEach((_, i) => days.saveItem("backend", day.date, i, { answer: text }));

describe("dates", () => {
  it("counts days and validates keys", () => {
    expect(daysBetween("2026-10-15", "2026-10-18")).toBe(3);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // across a DST change
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(isValidDateKey("2026-1-1")).toBe(false);
  });
});

describe("rating", () => {
  it("maps percentages to colors", () => {
    expect(rating(undefined)).toBe("none");
    expect(rating({ ok: 3, total: 4 })).toBe("green");
    expect(rating({ ok: 1, total: 2 })).toBe("orange");
    expect(rating({ ok: 1, total: 3 })).toBe("red");
  });
});

describe("pickQuestions", () => {
  it("picks 20 questions, 4 per level in rising order, without repeats", () => {
    const db = makeDb();
    const picked = pickQuestions(db, "backend", "2026-10-15", [], seededRng());
    expect(picked).toHaveLength(QUESTIONS_PER_DAY);
    expect(picked.map((q) => q.level)).toEqual([
      1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
    ]);
    expect(new Set(picked.map((q) => q.id)).size).toBe(20);
  });

  it("skips excluded ids and records them as seen", () => {
    const db = makeDb();
    const first = pickQuestions(db, "cpp", "2026-10-15", [], seededRng(1));
    const second = pickQuestions(
      db,
      "cpp",
      "2026-10-15",
      first.map((q) => q.id),
      seededRng(2),
    );
    const overlap = second.filter((q) => first.some((f) => f.id === q.id));
    expect(overlap).toEqual([]);
    const seen = db.prepare("SELECT COUNT(*) AS n FROM seen WHERE role_id = 'cpp'").get().n;
    expect(seen).toBe(40);
  });

  it("does not ask again today a question that was asked today", () => {
    const db = makeDb();
    const a = pickQuestions(db, "backend", "2026-10-15", [], seededRng(1));
    const b = pickQuestions(db, "backend", "2026-10-15", [], seededRng(2));
    expect(b.filter((q) => a.some((x) => x.id === q.id))).toEqual([]);
  });
});

describe("day service", () => {
  it("opens today once and refuses to create other days", () => {
    const { services } = makeServices();
    const first = services.days.openDay("backend", "2026-10-15");
    expect(first.created).toBe(true);
    expect(first.day.items).toHaveLength(20);
    expect(services.days.openDay("backend", "2026-10-15").created).toBe(false);
    expect(() => services.days.openDay("backend", "2026-10-14")).toThrow(/No questions/);
    expect(services.days.getDay("backend", "2026-10-14")).toBeNull();
  });

  it("hides solutions until a question is submitted", () => {
    const { services } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    expect(day.items.every((it) => it.solution === null && !it.done)).toBe(true);
    expect(() => services.days.saveItem("backend", day.date, 0, { view: "sol" })).toThrow(
      /after Submit/,
    );
  });

  it("submit needs every answer, then checks them and records results", () => {
    const { services, db } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    services.days.saveItem("backend", day.date, 0, { answer: "x" });
    expect(() => services.days.submit("backend", day.date)).toThrow(/every question/);

    answerAll(services.days, day, "no idea");
    const { day: after } = services.days.submit("backend", day.date);
    expect(after.submitted).toBe(true);
    expect(after.items.every((it) => it.done && it.solution)).toBe(true);
    expect(after.items.every((it) => it.result === false)).toBe(true);
    const wrong = db.prepare("SELECT COUNT(*) AS n FROM seen WHERE ok = 0").get().n;
    expect(wrong).toBe(20);
    expect(() => services.days.submit("backend", day.date)).toThrow(/Nothing to submit/);
  });

  it("marks correct answers as correct", () => {
    const { services, db } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    const solutions = db
      .prepare("SELECT solution FROM day_items WHERE date = ? ORDER BY position")
      .all(day.date);
    solutions.forEach((s, i) =>
      services.days.saveItem("backend", day.date, i, { answer: s.solution }),
    );
    const { day: after } = services.days.submit("backend", day.date);
    expect(after.items.every((it) => it.result)).toBe(true);
  });

  it("keeps edit flags only after submit, and toggles results", () => {
    const { services } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    services.days.saveItem("backend", day.date, 0, { answer: "ab", editFlags: "11" });
    expect(services.days.getDay("backend", day.date).items[0].editFlags).toBeNull();
    answerAll(services.days, day);
    services.days.submit("backend", day.date);

    const edited = services.days.saveItem("backend", day.date, 0, {
      answer: "answer!",
      editFlags: "0000001",
    });
    expect(edited.editFlags).toBe("0000001");
    expect(services.days.saveItem("backend", day.date, 0, { view: "sol" }).view).toBe("sol");
    expect(services.days.toggleResult("backend", day.date, 0).result).toBe(true);
    expect(services.days.toggleResult("backend", day.date, 0).result).toBe(false);
  });

  it("adds 20 more new questions and reopens the day for submit", () => {
    const { services } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    answerAll(services.days, day);
    services.days.submit("backend", day.date);
    const { added, start, day: more } = services.days.addMore("backend", day.date);
    expect(added).toBe(20);
    expect(start).toBe(20);
    expect(more.items).toHaveLength(40);
    expect(more.submitted).toBe(false);
    expect(more.items.slice(20).every((it) => !it.done)).toBe(true);
  });

  it("summarizes the week and computes topic stats from submitted questions", () => {
    const { services, db, clock } = makeServices({ today: "2026-10-12" });
    const { day } = services.days.openDay("backend", "2026-10-12");
    answerAll(services.days, day);
    services.days.submit("backend", day.date);
    clock.set("2026-10-13");
    services.days.openDay("backend", "2026-10-13");
    services.days.saveItem("backend", "2026-10-13", 3, { answer: "  partly  " });

    expect(services.days.week("backend", "2026-10-11", "2026-10-17")).toEqual([
      { date: "2026-10-12", submitted: true, total: 20, correct: 0, answered: 20 },
      { date: "2026-10-13", submitted: false, total: 20, correct: 0, answered: 1 },
    ]);
    const stats = topicStats(db, "backend");
    const totals = Object.values(stats).reduce((n, s) => n + s.total, 0);
    expect(totals).toBe(20); // only the submitted day counts
    expect(Object.values(stats).every((s) => s.rating === "red")).toBe(true);
  });
});

describe("settings service", () => {
  it("reads the seeded defaults and rejects unknown roles", () => {
    const { services } = makeServices();
    expect(services.settings.get()).toEqual({ userName: "אורי", role: "backend" });
    expect(services.settings.update({ role: "cpp" }).role).toBe("cpp");
    expect(() => services.settings.update({ role: "nope" })).toThrow(/Unknown role/);
  });
});

describe("backup service", () => {
  it("round-trips everything through export and import", () => {
    const { services } = makeServices();
    const { day } = services.days.openDay("backend", "2026-10-15");
    answerAll(services.days, day);
    services.days.submit("backend", day.date);
    services.days.saveItem("backend", day.date, 2, { answer: "answerX", editFlags: "0000001" });
    const exported = services.backup.exportAll();

    const other = makeServices().services;
    expect(other.backup.importAll(JSON.parse(JSON.stringify(exported)))).toEqual({
      days: 1,
      skippedRoles: [],
    });
    expect(other.backup.exportAll()).toEqual(exported);
  });

  it("imports the old localStorage backup format and skips unknown roles", () => {
    const { services } = makeServices();
    const old = {
      role: "cpp",
      days: {
        cpp: {
          "2026-10-01": {
            date: "2026-10-01",
            items: [
              {
                id: "ub-0",
                topic: "ub",
                level: 1,
                q: "Q?",
                a: "A",
                check: { type: "kw", keys: "a" },
              },
            ],
            answers: ["a"],
            results: [true],
            view: ["sol"],
            submitted: true,
          },
        },
        frontend: { "2026-10-01": { items: [] } },
      },
      seen: { cpp: { "ub-0": { d: "2026-10-01", ok: true } } },
    };
    expect(services.backup.importAll(old)).toEqual({ days: 1, skippedRoles: ["frontend"] });
    const day = services.days.getDay("cpp", "2026-10-01");
    expect(day.items[0]).toMatchObject({ done: true, result: true, view: "sol", solution: "A" });
    expect(services.settings.get().role).toBe("cpp");
  });
});
