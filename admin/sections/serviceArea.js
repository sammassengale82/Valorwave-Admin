import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const sa = ensure(home, "service_area", {
    title: "",
    html: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, sa, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "HTML Content"));
  const html = el("textarea");
  bindInput(html, sa, "html");
  wrap.appendChild(html);

  container.appendChild(wrap);
}

export function save(data) {}