// /cms/sections/hero.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const hero = ensure(CURRENT, "home.hero", {
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "",
    image: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Hero Title"));
  const title = el("input", { type: "text" });
  bindInput(title, hero, "title");
  wrap.appendChild(title);

  // Subtitle
  wrap.appendChild(el("label", {}, "Hero Subtitle"));
  const subtitle = el("textarea");
  bindInput(subtitle, hero, "subtitle");
  wrap.appendChild(subtitle);

  // Button Text
  wrap.appendChild(el("label", {}, "Button Text"));
  const btnText = el("input", { type: "text" });
  bindInput(btnText, hero, "buttonText");
  wrap.appendChild(btnText);

  // Button Link
  wrap.appendChild(el("label", {}, "Button Link (/path or #id)"));
  const btnLink = el("input", { type: "text" });
  bindInput(btnLink, hero, "buttonLink");
  wrap.appendChild(btnLink);

  // Image
  wrap.appendChild(el("label", {}, "Hero Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, hero, "image");
  wrap.appendChild(img);

  return wrap;
}
