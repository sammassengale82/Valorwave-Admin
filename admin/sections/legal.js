// /admin/sections/legal.js
import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const legal = ensure(home, "legal", {
    title: "",
    html: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Legal Page Title"));
  const title = el("input", { type: "text" });
  bindInput(title, legal, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Legal HTML Content"));
  const html = el("textarea");
  bindInput(html, legal, "html");
  wrap.appendChild(html);

  container.appendChild(wrap);
}

export function save(data) {}