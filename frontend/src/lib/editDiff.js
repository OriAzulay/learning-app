// Editing an answer after Submit: next to the text we keep a flag per character
// ("0" = original, "1" = edited), and edited characters are shown in italic.

export const defaultFlags = (text, flags) => flags || "0".repeat(text.length);

// The editor reports a trailing "\n" that isn't really part of the text,
// unless the old text already ended with a newline.
export const cleanEditorText = (raw, oldText) =>
  raw.replace(/\n$/, (m) => (oldText.endsWith("\n") ? m : ""));

// Works out which characters changed between oldText and newText. The caret
// position tells us where the typing ended, so text typed next to an identical
// character is still marked in the right place.
export function nextEditFlags(oldText, oldFlags, newText, caret) {
  const flags = defaultFlags(oldText, oldFlags);
  const pMax =
    caret != null ? Math.max(0, caret - Math.max(0, newText.length - oldText.length)) : Infinity;
  const qMax = caret != null ? newText.length - caret : Infinity;
  let p = 0;
  while (p < pMax && p < oldText.length && p < newText.length && oldText[p] === newText[p]) p++;
  let q = 0;
  while (
    q < qMax &&
    q < oldText.length - p &&
    q < newText.length - p &&
    oldText[oldText.length - 1 - q] === newText[newText.length - 1 - q]
  )
    q++;
  return flags.slice(0, p) + "1".repeat(newText.length - p - q) + flags.slice(oldText.length - q);
}

// "abcd" + "0011" -> [{text:"ab", edited:false}, {text:"cd", edited:true}]
export function editRuns(text, flags) {
  const f = defaultFlags(text, flags);
  const runs = [];
  let k = 0;
  while (k < text.length) {
    let j = k;
    while (j < text.length && f[j] === f[k]) j++;
    runs.push({ text: text.slice(k, j), edited: f[k] === "1" });
    k = j;
  }
  return runs;
}
