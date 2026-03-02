// /admin/sections/calendar.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const cal = ensure(home, "calendar", {
    embed_url: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Google Calendar Embed URL"));
  const embed = el("input", { type: "text" });
  bindInput(embed, cal, "embed_url");
  wrap.appendChild(embed);

  return wrap;
}
