import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const hd = ensure(home, "hero_discount", {
    title: "",
    subtitle: "",
    text: "",
    note: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, hd, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Subtitle"));
  const subtitle = el("input", { type: "text" });
  bindInput(subtitle, hd, "subtitle");
  wrap.appendChild(subtitle);

  wrap.appendChild(el("label", {}, "Main Text"));
  const text = el("textarea");
  bindInput(text, hd, "text");
  wrap.appendChild(text);

  wrap.appendChild(el("label", {}, "Note"));
  const note = el("textarea");
  bindInput(note, hd, "note");
  wrap.appendChild(note);

  container.appendChild(wrap);
}

export function save(data) {}