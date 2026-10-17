import { describe, expect, it } from "vitest";
import { ltrRuns, richSegments } from "../src/lib/rich.js";

describe("ltrRuns", () => {
  it("isolates English and code inside Hebrew", () => {
    expect(ltrRuns("מה ההבדל בין GET ל-POST?")).toEqual([
      { text: "מה ההבדל בין ", ltr: false },
      { text: "GET", ltr: true },
      { text: " ל-", ltr: false },
      { text: "POST", ltr: true },
      { text: "?", ltr: false },
    ]);
  });

  it("keeps operators inside one run", () => {
    expect(ltrRuns("התנאי i <= 5 גורם")).toContainEqual({ text: "i <= 5", ltr: true });
  });

  it("leaves an unopened closing bracket outside the run", () => {
    expect(ltrRuns("מערך (Array) קבוע")).toEqual([
      { text: "מערך (", ltr: false },
      { text: "Array", ltr: true },
      { text: ") קבוע", ltr: false },
    ]);
    expect(ltrRuns("קריאה f(x) כאן")).toContainEqual({ text: "f(x)", ltr: true });
  });

  it("returns pure Hebrew as a single run", () => {
    expect(ltrRuns("שלום עולם")).toEqual([{ text: "שלום עולם", ltr: false }]);
  });
});

describe("richSegments", () => {
  it("splits prose and code on @@", () => {
    const segs = richSegments("מה יודפס?@@int x = 1;\nstd::cout << x;");
    expect(segs).toHaveLength(2);
    expect(segs[0].type).toBe("prose");
    expect(segs[1]).toEqual({ type: "code", text: "int x = 1;\nstd::cout << x;" });
  });

  it("drops empty prose parts and keeps HTML-looking text as plain text", () => {
    const segs = richSegments("@@<script>alert(1)</script>@@");
    expect(segs).toEqual([{ type: "code", text: "<script>alert(1)</script>" }]);
  });
});
