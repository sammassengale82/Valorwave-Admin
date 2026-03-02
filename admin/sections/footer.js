// /admin/sections/footer.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const site = ensure(CURRENT, "site", {});
  const footer = ensure(site, "footer", {
    text: "",
    year: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Footer Text"));
  const text = el("input", { type: "text" });
  bindInput(text, footer, "text");
  wrap.appendChild(text);

  wrap.appendChild(el("label", {}, "Year"));
  const year = el("input", { type: "text" });
  bindInput(year, footer, "year");
  wrap.appendChild(year);

  return wrap;
}
