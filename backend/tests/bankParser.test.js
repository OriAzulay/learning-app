import { describe, expect, it } from "vitest";
import { parseBank } from "../src/seed-data/bankParser.js";
import { ROLES } from "../src/seed-data/roles.js";

describe("parseBank", () => {
  it("parses a ~ separated line into a question with keyword check", () => {
    const [q] = parseBank("http~1~What is GET?~Reads data~read|קריאה,url");
    expect(q).toEqual({
      id: "http-0",
      topic: "http",
      level: 1,
      q: "What is GET?",
      a: "Reads data",
      check: { type: "kw", keys: "read|קריאה,url" },
    });
  });

  it("supports a custom separator, \\n inside code and =value checks", () => {
    const [q] = parseBank("ub¦2¦What prints?@@int x = 1;\\nstd::cout << x;¦1¦=1", "¦");
    expect(q.q).toBe("What prints?@@int x = 1;\nstd::cout << x;");
    expect(q.check).toEqual({ type: "first", val: "1" });
  });

  it("skips blank lines and numbers ids by line", () => {
    const qs = parseBank("\n a~1~q~s~k \n\n b~2~q~s~k \n");
    expect(qs.map((q) => q.id)).toEqual(["a-0", "b-1"]);
  });

  it("rejects a line with missing fields", () => {
    expect(() => parseBank("a~1~question only")).toThrow(/Bad bank line/);
  });
});

describe("the real question banks", () => {
  for (const role of ROLES) {
    it(`${role.id}: unique ids, known topics and at least 4 questions per level`, () => {
      const qs = role.questions();
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
      for (const q of qs) expect(Object.keys(role.topics)).toContain(q.topic);
      for (let lv = 1; lv <= 5; lv++) {
        expect(qs.filter((q) => q.level === lv).length).toBeGreaterThanOrEqual(4);
      }
    });
  }
});
