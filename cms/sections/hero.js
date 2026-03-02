// /admin/sections/hero.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const hero = ensure(home, "hero", {
    headline: "",
    kicker: "",
    tagline: "",
    subline: "",
    button: {
      text: "",
      url: ""
    }
  });

  const wrap = el("div");

  // -----------------------------
  // Headline
  // -----------------------------
  wrap.appendChild(el("label", {}, "Headline"));
  const headline = el("input", { type: "text" });
  bindInput(headline, hero, "headline");
  wrap.appendChild(headline);

  // -----------------------------
  // Kicker
  // -----------------------------
  wrap.appendChild(el("label", {}, "Kicker"));
  const kicker = el("input", { type: "text" });
  bindInput(kicker, hero, "kicker");
  wrap.appendChild(kicker);

  // -----------------------------
  // Tagline
  // -----------------------------
  wrap.appendChild(el("label", {}, "Tagline"));
  const tagline = el("input", { type: "text" });
  bindInput(tagline, hero, "tagline");
  wrap.appendChild(tagline);

  // -----------------------------
  // Subline
  // -----------------------------
  wrap.appendChild(el("label", {}, "Subline"));
  const subline = el("input", { type: "text" });
  bindInput(subline, hero, "subline");
  wrap.appendChild(subline);

  // -----------------------------
  // Button Text
  // -----------------------------
  wrap.appendChild(el("label", {}, "Button Text"));
  const btnText = el("input", { type: "text" });
  bindInput(btnText, hero.button, "text");
  wrap.appendChild(btnText);

  // -----------------------------
  // Button URL
  // -----------------------------
  wrap.appendChild(el("label", {}, "Button URL"));
  const btnUrl = el("input", { type: "text" });
  bindInput(btnUrl, hero.button, "url");
  wrap.appendChild(btnUrl);

  return wrap;
}
