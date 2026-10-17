import { api } from "../api.js";
import { $, h, rich } from "../dom.js";
import { DAY_NAMES, dkey, longHebrewDate, parseKey } from "../lib/dates.js";
import { cleanEditorText, editRuns, nextEditFlags } from "../lib/editDiff.js";
import { quizProgress, scoreCard, submitState } from "../lib/quizState.js";
import { createSaver } from "../lib/saver.js";
import { currentRole, state, topicLabels } from "../state.js";
import { toast } from "./toast.js";
import { renderWeeks } from "./weekStrip.js";

const MAX_ANSWER = 5000;

// Answers are saved to the server shortly after typing stops.
export const saver = createSaver(
  (key, { role, date, i, patch }) => api.saveItem(role, date, i, patch),
  { onError: () => toast("לא הצלחתי לשמור בשרת — נסה שוב בעוד רגע") },
);

function scheduleSave(i, patch) {
  const role = currentRole().id;
  const date = state.currentDay;
  saver.schedule(`${role}/${date}/${i}`, { role, date, i, patch });
}

export async function showQuiz() {
  await renderWeeks();
  $("#home").classList.add("hidden");
  $("#quiz").classList.remove("hidden");
  $("#roleName").textContent = currentRole().label;

  const day = state.day;
  const d = parseKey(day.date);
  const isToday = day.date === dkey(new Date());
  $("#quizTitle").textContent = isToday
    ? "השאלות של היום"
    : `השאלות של יום ${DAY_NAMES[d.getDay()]}`;
  $("#quizSub").textContent = longHebrewDate(d) + " · רמת קושי עולה";

  const labels = topicLabels();
  const batch = day.batchSize;
  const rows = [];
  day.items.forEach((it, i) => {
    if (i > 0 && i % batch === 0) {
      rows.push(h("li", { class: "batch-sep" }, `סבב ${i / batch + 1} · עוד ${batch} שאלות`));
    }
    const text = h("div", { class: "q-text" });
    text.append(rich(it.question));
    rows.push(
      h(
        "li",
        { class: "q", dataset: { i } },
        h(
          "div",
          { class: "q-meta" },
          h("span", { class: "q-num" }, String(i + 1)),
          h("span", { class: "chip lv" }, `רמה ${it.level}`),
          h("span", { class: "chip" }, labels[it.topic] || it.topic),
        ),
        text,
        h("div", { class: "q-box" }),
        h(
          "div",
          { class: "q-foot" },
          h("span", { class: "q-mark" }),
          h(
            "div",
            { class: "toggles" },
            h("button", { class: "tg ans-tg", dataset: { v: "ans" } }, "תשובה"),
            h("span", { class: "tg-sep" }, "|"),
            h("button", { class: "tg sol-tg", dataset: { v: "sol" } }, "פתרון"),
          ),
        ),
      ),
    );
  });
  $("#qlist").replaceChildren(...rows);
  day.items.forEach((_, i) => renderQ(i));
  renderQuizState();
}

/* ---------- editing an answer after Submit (edited text shown in italic) ---------- */

// Plain text of the contenteditable box (<br> and block elements become newlines).
function editorText(node) {
  let s = "";
  node.childNodes.forEach((c) => {
    if (c.nodeType === 3) s += c.data;
    else if (c.nodeName === "BR") s += "\n";
    else if (c.nodeName === "DIV" || c.nodeName === "P")
      s += (s && !s.endsWith("\n") ? "\n" : "") + editorText(c);
    else s += editorText(c);
  });
  return s;
}
function caretOffset(root) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !root.contains(sel.anchorNode)) return null;
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return editorText(r.cloneContents()).length;
}
function setCaret(root, off) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  let left = off;
  while ((n = walker.nextNode())) {
    if (left <= n.data.length) {
      const r = document.createRange();
      r.setStart(n, left);
      r.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
    left -= n.data.length;
  }
}
function paintAnswer(el, it) {
  const text = it.answer || "";
  el.replaceChildren(
    ...editRuns(text, it.editFlags).map((r) =>
      r.edited ? h("span", { class: "e" }, r.text) : r.text,
    ),
    text.endsWith("\n") ? h("br") : "",
  );
}
function syncAnswer(el, it, i) {
  const oldText = it.answer || "";
  const newText = cleanEditorText(editorText(el), oldText);
  const off = caretOffset(el);
  it.editFlags = nextEditFlags(oldText, it.editFlags, newText, off);
  it.answer = newText;
  scheduleSave(i, { answer: it.answer, editFlags: it.editFlags });
  paintAnswer(el, it);
  if (off != null) setCaret(el, off);
}

function renderQ(i) {
  const it = state.day.items[i];
  const li = document.querySelector(`.q[data-i="${i}"]`);
  const view = it.done ? it.view : "ans";
  const box = li.querySelector(".q-box");

  if (view === "sol") {
    const sol = h("div", { class: "sol" }, h("span", { class: "sol-h" }, "הפתרון"));
    sol.append(rich(it.solution));
    box.replaceChildren(sol);
  } else if (it.done) {
    // After Submit the answer stays editable; anything added or changed is shown in italic.
    const ed = h("div", {
      class: ["ans", "edit-ans", it.result ? "ok" : "bad"],
      "data-ph": "(לא נכתבה תשובה — אפשר להוסיף כאן)",
    });
    ed.contentEditable = "plaintext-only";
    if (ed.contentEditable !== "plaintext-only") ed.contentEditable = "true";
    ed.spellcheck = false;
    paintAnswer(ed, it);
    ed.addEventListener("input", (e) => {
      if (!e.isComposing) syncAnswer(ed, it, i);
    });
    ed.addEventListener("compositionend", () => syncAnswer(ed, it, i));
    ed.addEventListener("paste", (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
    });
    ed.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) e.preventDefault();
    });
    box.replaceChildren(
      ed,
      h(
        "div",
        { class: "edit-hint" },
        "✎ אפשר לערוך את התשובה · שינויים מופיעים ",
        h("span", { class: "e" }, "בכתב נטוי"),
      ),
    );
  } else {
    const ta = h("textarea", { class: "ans", placeholder: "כתוב כאן את התשובה שלך..." });
    ta.maxLength = MAX_ANSWER;
    ta.value = it.answer;
    ta.addEventListener("input", () => {
      it.answer = ta.value;
      scheduleSave(i, { answer: it.answer });
      renderQuizState();
    });
    box.replaceChildren(ta);
  }

  li.querySelector(".ans-tg").classList.toggle("on", view === "ans");
  const solBtn = li.querySelector(".sol-tg");
  solBtn.classList.toggle("on", view === "sol");
  solBtn.disabled = !it.done;
  solBtn.title = it.done ? "" : "הפתרון ייפתח אחרי ה-Submit";

  const mark = li.querySelector(".q-mark");
  if (it.done) {
    const ok = it.result;
    mark.replaceChildren(
      h(
        "button",
        { class: ["mark", ok ? "ok" : "bad"], title: "לחץ כדי לתקן את הסימון" },
        h("span", { class: "ic" }, ok ? "✓" : "✗"),
        ok ? "נכון" : "לא נכון",
        h("span", { class: "fix" }, "(שנה)"),
      ),
    );
  } else mark.replaceChildren();
}

function renderQuizState() {
  const p = quizProgress(state.day.items);
  $("#progBar").style.width = (p.answered / p.total) * 100 + "%";
  $("#progTxt").textContent = `ענית על ${p.answered} מתוך ${p.total}`;

  const card = scoreCard(p);
  $("#scoreCard").replaceChildren(
    card
      ? h(
          "div",
          { class: "score-card" },
          h("span", { class: "big" }, card.score),
          h("span", { class: "txt" }, card.text),
        )
      : "",
  );

  const s = submitState(p);
  const btn = $("#submitBtn");
  btn.classList.toggle("hidden", s.hidden);
  btn.disabled = s.disabled;
  $("#submitHint").textContent = s.hint;
}

/* ---------- events ---------- */

export function initQuiz() {
  $("#qlist").addEventListener("click", async (e) => {
    const li = e.target.closest(".q");
    if (!li) return;
    const i = +li.dataset.i;
    const it = state.day.items[i];
    const role = currentRole().id;
    const date = state.currentDay;

    const tg = e.target.closest(".tg");
    if (tg && !tg.disabled && it.done) {
      it.view = tg.dataset.v;
      renderQ(i);
      api.saveItem(role, date, i, { view: it.view }).catch(() => toast("לא הצלחתי לשמור בשרת"));
      return;
    }
    if (e.target.closest(".mark")) {
      try {
        const updated = await api.toggleResult(role, date, i);
        it.result = updated.result;
        renderQ(i);
        renderQuizState();
      } catch {
        toast("לא הצלחתי לשמור בשרת");
      }
    }
  });

  $("#submitBtn").addEventListener("click", async () => {
    const p = quizProgress(state.day.items);
    if (!p.pending.length || p.left > 0) return;
    try {
      await saver.flush();
      const res = await api.submit(currentRole().id, state.currentDay);
      state.day = res.day;
      await showQuiz();
      document
        .querySelector(`.q[data-i="${res.firstSubmitted}"]`)
        .scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      toast(err.message || "ההגשה נכשלה");
    }
  });

  $("#moreBtn").addEventListener("click", async () => {
    try {
      await saver.flush();
      const res = await api.addMore(currentRole().id, state.currentDay);
      if (!res.added) return toast("אין עוד שאלות חדשות במאגר להיום");
      state.day = res.day;
      await showQuiz();
      document
        .querySelector(`.q[data-i="${res.start}"]`)
        .scrollIntoView({ behavior: "smooth", block: "start" });
      toast(`נוספו ${res.added} שאלות חדשות`);
    } catch (err) {
      toast(err.message || "לא הצלחתי להוסיף שאלות");
    }
  });
}
