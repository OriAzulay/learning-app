import { describe, expect, it } from "vitest";
import { cleanEditorText, editRuns, nextEditFlags } from "../src/lib/editDiff.js";

describe("nextEditFlags", () => {
  it("marks text typed at the end", () => {
    expect(nextEditFlags("abc", null, "abcde", 5)).toBe("00011");
  });

  it("marks text typed in the middle", () => {
    expect(nextEditFlags("abc", "000", "abXc", 3)).toBe("0010");
  });

  it("uses the caret to place typing next to an identical character", () => {
    // typing "a" after the first "a" of "aa": without the caret it would look like the end changed
    expect(nextEditFlags("aa", "00", "aaa", 1)).toBe("100");
  });

  it("removes flags of deleted characters and keeps earlier edits", () => {
    expect(nextEditFlags("abcd", "0110", "ad", 1)).toBe("00");
    expect(nextEditFlags("abcd", "0001", "abd", 2)).toBe("001");
  });

  it("marks replaced text", () => {
    expect(nextEditFlags("hello", null, "help", 4)).toBe("0001");
  });
});

describe("editRuns", () => {
  it("groups characters by edited flag", () => {
    expect(editRuns("abcd", "0011")).toEqual([
      { text: "ab", edited: false },
      { text: "cd", edited: true },
    ]);
    expect(editRuns("ab", null)).toEqual([{ text: "ab", edited: false }]);
    expect(editRuns("", null)).toEqual([]);
  });
});

describe("cleanEditorText", () => {
  it("drops the editor's extra trailing newline unless the text had one", () => {
    expect(cleanEditorText("abc\n", "abc")).toBe("abc");
    expect(cleanEditorText("abc\n", "abc\n")).toBe("abc\n");
  });
});
