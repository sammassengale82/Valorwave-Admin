import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const cal = ensure(home, "calendar", {
    embed_url: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Google Calendar Embed URL"));
  const embed = el("input", { type: "text" });
  bindInput(embed, cal, "embed_url");
  wrap.appendChild(embed);

  container.appendChild(wrap);
}

export function save(data) {}