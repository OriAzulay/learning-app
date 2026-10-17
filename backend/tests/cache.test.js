import { describe, expect, it } from "vitest";
import { cacheKeys, createCache, invalidateDay } from "../src/cache.js";

describe("cache", () => {
  it("stores, deletes by prefix and expires entries", async () => {
    const cache = createCache({ ttl: 20 });
    cache.set("week:backend:a", 1);
    cache.set("week:backend:b", 2);
    cache.set("week:cpp:a", 3);
    cache.deletePrefix("week:backend:");
    expect(cache.get("week:backend:a")).toBeUndefined();
    expect(cache.get("week:cpp:a")).toBe(3);

    await new Promise((r) => setTimeout(r, 40));
    expect(cache.get("week:cpp:a")).toBeUndefined();
  });

  it("invalidateDay clears the day, its role's week strips and stats only", () => {
    const cache = createCache();
    cache.set(cacheKeys.day("backend", "2026-10-15"), 1);
    cache.set(cacheKeys.day("backend", "2026-10-14"), 1);
    cache.set(cacheKeys.week("backend", "2026-10-11", "2026-10-17"), 1);
    cache.set(cacheKeys.stats("backend"), 1);
    cache.set(cacheKeys.stats("cpp"), 1);
    cache.set(cacheKeys.roles(), 1);
    invalidateDay(cache, "backend", "2026-10-15");
    expect(cache.size).toBe(3);
    expect(cache.get(cacheKeys.day("backend", "2026-10-14"))).toBe(1);
    expect(cache.get(cacheKeys.stats("cpp"))).toBe(1);
  });
});
