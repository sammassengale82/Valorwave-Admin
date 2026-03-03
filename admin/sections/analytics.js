import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const analytics = ensure(data, "site.analytics", {
    ga4_id: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Google Analytics GA4 ID (G-XXXXXXXX)"));
  const id = el("input", { type: "text" });
  bindInput(id, analytics, "ga4_id");
  wrap.appendChild(id);

  container.appendChild(wrap);
}

export function save(data) {}