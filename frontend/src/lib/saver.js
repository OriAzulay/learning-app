// Debounced autosave. While the user types, only the latest value per key is
// kept, and it is sent `delay` ms after the last keystroke. Saves for the same
// key run one after another, so an older value can never overwrite a newer one.
// flush() sends everything right away (before Submit, or when leaving the page).
export function createSaver(save, { delay = 400, onError = () => {} } = {}) {
  const pending = new Map(); // key -> { payload, timer }
  const chains = new Map(); // key -> promise of the last save for that key

  function run(key) {
    const entry = pending.get(key);
    if (!entry) return chains.get(key) ?? Promise.resolve();
    clearTimeout(entry.timer);
    pending.delete(key);
    const prev = chains.get(key) ?? Promise.resolve();
    const next = prev.then(() => save(key, entry.payload)).catch(onError);
    chains.set(key, next);
    return next;
  }

  return {
    schedule(key, payload) {
      const old = pending.get(key);
      if (old) clearTimeout(old.timer);
      pending.set(key, { payload, timer: setTimeout(() => run(key), delay) });
    },
    flush() {
      const keys = new Set([...pending.keys(), ...chains.keys()]);
      return Promise.all([...keys].map(run)).then(() => {});
    },
    get pendingCount() {
      return pending.size;
    },
  };
}
