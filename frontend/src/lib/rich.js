// Question and solution text can contain code: "prose@@code@@prose".
// These functions only split text into pieces; dom.js turns the pieces into
// elements with textContent, so no text is ever parsed as HTML.

// A run of English or code inside a Hebrew sentence, shown left-to-right
// (so that "i <= 5" doesn't get flipped).
const LTR_RUN =
  /[A-Za-z_][A-Za-z0-9_:<>=+\-*&!.,()[\]{}"'/ ;%|?^~]*[A-Za-z0-9_)\]}>;"'*&]|[A-Za-z]/g;

const OPENER = { ")": "(", "]": "[", "}": "{" };
const count = (s, c) => s.split(c).length - 1;

// "מה זה GET?" -> [{text:"מה זה ", ltr:false}, {text:"GET", ltr:true}, {text:"?", ltr:false}]
export function ltrRuns(s) {
  const runs = [];
  const push = (text, ltr) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && !last.ltr && !ltr) last.text += text;
    else runs.push({ text, ltr });
  };
  let pos = 0;
  for (const match of s.matchAll(LTR_RUN)) {
    let m = match[0];
    // A closing bracket that wasn't opened inside the run (as in "(Array)")
    // belongs to the Hebrew sentence and stays outside the LTR run.
    let tail = "";
    while (/[)\]}]$/.test(m) && count(m, OPENER[m.slice(-1)]) < count(m, m.slice(-1))) {
      tail = m.slice(-1) + tail;
      m = m.slice(0, -1);
    }
    push(s.slice(pos, match.index), false);
    push(m, true);
    push(tail, false);
    pos = match.index + match[0].length;
  }
  push(s.slice(pos), false);
  return runs;
}

// -> [{type:"prose", runs:[...]}, {type:"code", text}]
export function richSegments(s) {
  const out = [];
  String(s)
    .split("@@")
    .forEach((part, i) => {
      if (i % 2) out.push({ type: "code", text: part });
      else if (part.trim()) out.push({ type: "prose", runs: ltrRuns(part.trim()) });
    });
  return out;
}
