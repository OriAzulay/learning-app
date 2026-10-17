// Automatic answer checking, moved from the browser to the server so the
// solution is never sent before a question is submitted.

// Lowercase, strip Hebrew vowel marks and quotes, collapse punctuation to spaces.
export function norm(s) {
  return (
    " " +
    String(s)
      .toLowerCase()
      .replace(/[֑-ׇ]/g, "")
      .replace(/[״"׳'`]/g, "")
      .replace(/[^\p{L}\p{N}²+]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}

// check types:
//   kw    – keyword groups "a|b,c|d": a word from each group (or ~60% of groups when there are more than 2)
//   first – the answer must start with this value ("what will be printed?")
//   num   – the answer must contain this number
//   bigo  – a Big-O expression, e.g. "O(n log n)"
export function checkAnswer(check, answer) {
  const ans = String(answer || "").trim();
  if (!ans) return false;
  const c = check;
  if (c.type === "first") return norm(ans).trim().split(" ")[0] === c.val;
  if (c.type === "num") {
    const nums = (ans.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+/g) || []).map(Number);
    return nums.includes(c.val);
  }
  if (c.type === "bigo") {
    let s = ans
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/^o\(/, "")
      .replace(/\)$/, "")
      .replace(/\*\*2|\^2|²/g, "2")
      .replace(/log\(n\)|log_?2\(?n\)?|lgn/g, "logn")
      .replace(/[*·.]/g, "");
    s = s.replace(/^nn$/, "n2").replace(/^e\+v$/, "v+e");
    return (
      s === c.val ||
      (c.val === "1" && /קבוע|constant/.test(ans)) ||
      (c.val === "n" && /לינאר|linear/.test(ans))
    );
  }
  const text = norm(ans);
  const groups = c.keys.split(",").map((g) =>
    g
      .split("|")
      .map((k) => norm(k).trim())
      .filter(Boolean),
  );
  const hit = groups.filter((g) => g.some((k) => text.includes(k))).length;
  const need = groups.length <= 2 ? groups.length : Math.ceil(groups.length * 0.6);
  return hit >= need;
}
