import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
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

  wrap.appendChild(el("label", {}, "Headline"));
  const headline = el("input", { type: "text" });
  bindInput(headline, hero, "headline");
  wrap.appendChild(headline);

  wrap.appendChild(el("label", {}, "Kicker"));
  const kicker = el("input", { type: "text" });
  bindInput(kicker, hero, "kicker");
  wrap.appendChild(kicker);

  wrap.appendChild(el("label", {}, "Tagline"));
  const tagline = el("input", { type: "text" });
  bindInput(tagline, hero, "tagline");
  wrap.appendChild(tagline);

  wrap.appendChild(el("label", {}, "Subline"));
  const subline = el("input", { type: "text" });
  bindInput(subline, hero, "subline");
  wrap.appendChild(subline);

  wrap.appendChild(el("label", {}, "Button Text"));
  const btnText = el("input", { type: "text" });
  bindInput(btnText, hero.button, "text");
  wrap.appendChild(btnText);

  wrap.appendChild(el("label", {}, "Button URL"));
  const btnUrl = el("input", { type: "text" });
  bindInput(btnUrl, hero.button, "url");
  wrap.appendChild(btnUrl);

  container.appendChild(wrap);
}

export function save(data) {}