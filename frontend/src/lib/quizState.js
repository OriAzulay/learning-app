// Pure functions behind the screens: given data, they return what to show.

export const hasText = (s) => !!s && !!s.trim();

// Progress over a day's items ({answer, done, result}).
export function quizProgress(items) {
  const idx = items.map((_, i) => i);
  const pending = idx.filter((i) => !items[i].done);
  const doneIdx = idx.filter((i) => items[i].done);
  return {
    total: items.length,
    answered: items.filter((it) => hasText(it.answer)).length,
    pending,
    left: pending.filter((i) => !hasText(items[i].answer)).length,
    doneIdx,
    correct: doneIdx.filter((i) => items[i].result).length,
  };
}

export function submitState({ pending, left }) {
  if (!pending.length) return { hidden: true, disabled: true, hint: "" };
  return {
    hidden: false,
    disabled: left > 0,
    hint:
      left > 0
        ? `ה-Submit ייפתח אחרי שתענה על כל ${pending.length} השאלות (נשארו ${left})`
        : "מוכן להגשה!",
  };
}

export function scoreCard({ doneIdx, pending, correct }) {
  if (!doneIdx.length) return null;
  return {
    score: `${correct}/${doneIdx.length}`,
    text: pending.length
      ? `הציון בשאלות שהוגשו. נוספו ${pending.length} שאלות חדשות למטה.`
      : `הוגש! לחץ על "פתרון" מתחת לכל שאלה כדי לראות את התשובה הנכונה. אם הבדיקה האוטומטית טעתה, אפשר ללחוץ על הסימון ולשנות אותו.`,
  };
}

// Tested topics first, weakest first; untested topics keep their order.
export function orderTopics(topicKeys, stats) {
  return [...topicKeys].sort((a, b) => {
    const ta = stats[a]?.total ? 1 : 0;
    const tb = stats[b]?.total ? 1 : 0;
    if (ta !== tb) return tb - ta;
    if (ta) return stats[a].ok / stats[a].total - stats[b].ok / stats[b].total;
    return 0;
  });
}

export const topicMeta = (st) =>
  st && st.total ? `${st.ok}/${st.total} · ${Math.round((st.ok / st.total) * 100)}%` : "טרם נבחן";

// Home screen button and the line under it, from today's week-strip summary.
export function startButton(today) {
  return {
    label: today.submitted ? "צפה בתוצאות היום" : today.answered ? "המשך" : "התחל",
    sub: today.submitted
      ? `הגשת היום · ציון ${today.correct}/${today.total}`
      : `${today.total} שאלות מוכנות להיום · ענית על ${today.answered}`,
  };
}

// One cell of the week strip.
export function dayCell(key, summary, todayKey, currentDay) {
  const classes = ["day"];
  if (key === todayKey) classes.push("today");
  if (key > todayKey) classes.push("future");
  if (currentDay && key === currentDay && key !== todayKey) classes.push("selected");
  let dot = null;
  if (summary) dot = summary.submitted ? "done" : summary.answered ? "wip" : null;
  const title = summary && summary.submitted ? `ציון: ${summary.correct}/${summary.total}` : "";
  return { classes, dot, title };
}

// The label above the week strip: "השבוע", or a date range with a "back to today" link.
export function weekLabel(weekStart, weekEnd, isThisWeek) {
  if (isThisWeek) return { text: "השבוע", showBack: false };
  const fmt = (d) => `${d.getDate()}.${d.getMonth() + 1}`;
  return { text: `${fmt(weekStart)} – ${fmt(weekEnd)} `, showBack: true };
}
