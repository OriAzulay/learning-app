// Turns a text bank (one question per line) into question objects.
export function parseBank(text, sep = "~") {
  const nl = (s) => s.trim().replace(/\\n/g, "\n");
  return text
    .trim()
    .split("\n")
    .filter((l) => l.trim())
    .map((line, i) => {
      const [topic, level, q, a, keys] = line.split(sep);
      if (keys === undefined) throw new Error(`Bad bank line ${i + 1}: ${line.slice(0, 60)}`);
      const k = keys.trim();
      const check = k.startsWith("=")
        ? { type: "first", val: k.slice(1) }
        : { type: "kw", keys: k };
      return {
        id: `${topic.trim()}-${i}`,
        topic: topic.trim(),
        level: +level,
        q: nl(q),
        a: nl(a),
        check,
      };
    });
}
