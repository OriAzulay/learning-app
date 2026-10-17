import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, dkey, parseKey, startOfWeek } from "../src/lib/dates.js";
import { createSaver } from "../src/lib/saver.js";

describe("dates", () => {
  it("formats and parses keys and finds Sunday", () => {
    expect(dkey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dkey(parseKey("2026-10-17"))).toBe("2026-10-17");
    expect(dkey(addDays(parseKey("2026-12-31"), 1))).toBe("2027-01-01");
    expect(dkey(startOfWeek(parseKey("2026-10-17")))).toBe("2026-10-11"); // Saturday -> Sunday
    expect(dkey(startOfWeek(parseKey("2026-10-11")))).toBe("2026-10-11");
  });
});

describe("createSaver", () => {
  afterEach(() => vi.useRealTimers());

  it("debounces and only sends the latest value per key", async () => {
    vi.useFakeTimers();
    const save = vi.fn(() => Promise.resolve());
    const saver = createSaver(save, { delay: 400 });
    saver.schedule("q1", "a");
    saver.schedule("q1", "ab");
    saver.schedule("q2", "x");
    await vi.advanceTimersByTimeAsync(399);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls).toEqual([
      ["q1", "ab"],
      ["q2", "x"],
    ]);
  });

  it("flush sends pending values immediately and waits for them", async () => {
    let done = false;
    const save = vi.fn(() => new Promise((r) => setTimeout(() => ((done = true), r()), 10)));
    const saver = createSaver(save, { delay: 10_000 });
    saver.schedule("q1", "a");
    await saver.flush();
    expect(save).toHaveBeenCalledWith("q1", "a");
    expect(done).toBe(true);
    expect(saver.pendingCount).toBe(0);
  });

  it("runs saves for one key in order and reports errors", async () => {
    const order = [];
    const onError = vi.fn();
    const save = vi.fn(async (_k, v) => {
      await new Promise((r) => setTimeout(r, v === "first" ? 20 : 1));
      order.push(v);
      if (v === "second") throw new Error("offline");
    });
    const saver = createSaver(save, { delay: 0, onError });
    saver.schedule("q1", "first");
    await saver.flush();
    saver.schedule("q1", "second");
    await saver.flush();
    expect(order).toEqual(["first", "second"]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
