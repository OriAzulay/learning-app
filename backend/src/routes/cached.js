// Serves `compute()` through the cache. Adds an X-Cache header (HIT / MISS)
// so you can watch the cache work in the browser's network tab.
export function sendCached(res, cache, key, compute) {
  const hit = cache.get(key);
  if (hit !== undefined) {
    res.set("X-Cache", "HIT");
    return res.json(hit);
  }
  const value = compute();
  cache.set(key, value);
  res.set("X-Cache", "MISS");
  res.json(value);
}
