import { describe, expect, it } from "vitest";
import { checkAnswer, norm } from "../src/services/checkService.js";
import { ROLES } from "../src/seed-data/roles.js";

describe("norm", () => {
  it("lowercases, strips Hebrew vowel marks and punctuation", () => {
    expect(norm("Hello, WORLD!")).toBe(" hello world ");
    expect(norm("שָׁלוֹם")).toBe(" שלום ");
  });
});

describe("checkAnswer", () => {
  it("is false for empty answers", () => {
    expect(checkAnswer({ type: "kw", keys: "a" }, "   ")).toBe(false);
  });

  it("kw: needs every group when there are 1-2 groups", () => {
    const c = { type: "kw", keys: "lifo|אחרון שנכנס,fifo|ראשון שנכנס" };
    expect(checkAnswer(c, "Stack is LIFO and queue is FIFO")).toBe(true);
    expect(checkAnswer(c, "stack is lifo")).toBe(false);
    expect(checkAnswer(c, "אחרון שנכנס ראשון שנכנס")).toBe(true);
  });

  it("kw: needs about 60% of groups when there are more than 2", () => {
    const c = { type: "kw", keys: "a1,b1,c1,d1,e1" }; // needs 3
    expect(checkAnswer(c, "a1 b1 c1")).toBe(true);
    expect(checkAnswer(c, "a1 b1")).toBe(false);
  });

  it("first: the answer must start with the value", () => {
    const c = { type: "first", val: "21" };
    expect(checkAnswer(c, "21, because...")).toBe(true);
    expect(checkAnswer(c, "it prints 21")).toBe(false);
  });

  it("num: finds the number, also with thousands separators", () => {
    expect(checkAnswer({ type: "num", val: 443 }, "port 443")).toBe(true);
    expect(checkAnswer({ type: "num", val: 65536 }, "65,536 addresses")).toBe(true);
    expect(checkAnswer({ type: "num", val: 80 }, "8080")).toBe(false);
  });

  it("bigo: accepts common spellings", () => {
    expect(checkAnswer({ type: "bigo", val: "nlogn" }, "O(n log n)")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "n2" }, "O(n^2)")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "n2" }, "n²")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "1" }, "זמן קבוע")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "n" }, "linear")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "v+e" }, "O(E + V)")).toBe(true);
    expect(checkAnswer({ type: "bigo", val: "logn" }, "O(n)")).toBe(false);
  });

  it("accepts every stored solution as a correct answer", () => {
    for (const role of ROLES) {
      for (const q of role.questions()) expect(checkAnswer(q.check, q.a), q.id).toBe(true);
    }
  });
});
