// /admin/sections/analytics.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const analytics = ensure(CURRENT, "site.analytics", {
    ga4_id: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Google Analytics GA4 ID (G-XXXXXXX)"));
  const id = el("input", { type: "text" });
  bindInput(id, analytics, "ga4_id");
  wrap.appendChild(id);

  return wrap;
}