import { richSegments } from "./lib/rich.js";

export const $ = (s) => document.querySelector(s);

// h("span", { class: "chip", dataset: { v: "ans" } }, "text", childNode)
// Builds elements with textContent only, so data can never be injected as HTML.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = Array.isArray(v) ? v.join(" ") : v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

// Question/solution text with code blocks and left-to-right English runs.
export function rich(s) {
  const frag = document.createDocumentFragment();
  for (const seg of richSegments(s)) {
    if (seg.type === "code") {
      frag.append(h("pre", { class: "code", dir: "ltr" }, h("code", {}, seg.text)));
    } else {
      frag.append(
        h(
          "span",
          { class: "prose" },
          seg.runs.map((r) => (r.ltr ? h("bdi", { dir: "ltr" }, r.text) : r.text)),
        ),
      );
    }
  }
  return frag;
}
