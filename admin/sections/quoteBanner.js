// /admin/sections/quoteBanner.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const qb = ensure(home, "quote_banner", {
    headline: "",
    subtext: "",
    button_text: "",
    button_url: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Headline"));
  const headline = el("input", { type: "text" });
  bindInput(headline, qb, "headline");
  wrap.appendChild(headline);

  wrap.appendChild(el("label", {}, "Subtext"));
  const subtext = el("input", { type: "text" });
  bindInput(subtext, qb, "subtext");
  wrap.appendChild(subtext);

  wrap.appendChild(el("label", {}, "Button Text"));
  const btnText = el("input", { type: "text" });
  bindInput(btnText, qb, "button_text");
  wrap.appendChild(btnText);

  wrap.appendChild(el("label", {}, "Button URL"));
  const btnUrl = el("input", { type: "text" });
  bindInput(btnUrl, qb, "button_url");
  wrap.appendChild(btnUrl);

  return wrap;
}
