import { LRUCache } from "lru-cache";

// A small in-memory cache for GET responses. Entries expire after `ttl` ms,
// and every write deletes the keys it could have made stale.
export function createCache({ ttl = 30_000, max = 500 } = {}) {
  const lru = new LRUCache({ max, ttl });

  return {
    get: (key) => lru.get(key),
    set: (key, value) => lru.set(key, value),
    delete: (key) => lru.delete(key),
    deletePrefix(prefix) {
      for (const key of [...lru.keys()]) if (key.startsWith(prefix)) lru.delete(key);
    },
    clear: () => lru.clear(),
    get size() {
      return lru.size;
    },
  };
}

export const cacheKeys = {
  roles: () => "roles",
  settings: () => "settings",
  stats: (role) => `stats:${role}`,
  week: (role, from, to) => `week:${role}:${from}:${to}`,
  day: (role, date) => `day:${role}:${date}`,
};

// Anything that changes a day can change that day, the week strip and the topic stats.
export function invalidateDay(cache, role, date) {
  cache.delete(cacheKeys.day(role, date));
  cache.delete(cacheKeys.stats(role));
  cache.deletePrefix(`week:${role}:`);
}
