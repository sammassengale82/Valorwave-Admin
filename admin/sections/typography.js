// /cms/sections/typography.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const typo = ensure(CURRENT, "site.typography", {
    fontFamily: "",
    baseSize: "",
    lineHeight: "",
    headings: {
      h1: "",
      h2: "",
      h3: ""
    }
  });

  const wrap = el("div");

  // -----------------------------
  // Base Font Family
  // -----------------------------
  wrap.appendChild(el("label", {}, "Font Family (e.g., Inter, Roboto)"));
  const family = el("input", { type: "text" });
  bindInput(family, typo, "fontFamily");
  wrap.appendChild(family);

  // -----------------------------
  // Base Size
  // -----------------------------
  wrap.appendChild(el("label", {}, "Base Font Size (e.g., 16px)"));
  const base = el("input", { type: "text" });
  bindInput(base, typo, "baseSize");
  wrap.appendChild(base);

  // -----------------------------
  // Line Height
  // -----------------------------
  wrap.appendChild(el("label", {}, "Line Height (e.g., 1.5)"));
  const lh = el("input", { type: "text" });
  bindInput(lh, typo, "lineHeight");
  wrap.appendChild(lh);

  // -----------------------------
  // Headings
  // -----------------------------
  const headings = ensure(typo, "headings", {});

  wrap.appendChild(el("label", {}, "H1 Size"));
  const h1 = el("input", { type: "text" });
  bindInput(h1, headings, "h1");
  wrap.appendChild(h1);

  wrap.appendChild(el("label", {}, "H2 Size"));
  const h2 = el("input", { type: "text" });
  bindInput(h2, headings, "h2");
  wrap.appendChild(h2);

  wrap.appendChild(el("label", {}, "H3 Size"));
  const h3 = el("input", { type: "text" });
  bindInput(h3, headings, "h3");
  wrap.appendChild(h3);

  return wrap;
}
