// /cms/sections/quoteBanner.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const qb = ensure(CURRENT, "home.quoteBanner", {
    text: "",
    buttonText: "",
    buttonLink: "",
    image: ""
  });

  const wrap = el("div");

  // Text
  wrap.appendChild(el("label", {}, "Banner Text"));
  const text = el("textarea");
  bindInput(text, qb, "text");
  wrap.appendChild(text);

  // Button Text
  wrap.appendChild(el("label", {}, "Button Text"));
  const btnText = el("input", { type: "text" });
  bindInput(btnText, qb, "buttonText");
  wrap.appendChild(btnText);

  // Button Link
  wrap.appendChild(el("label", {}, "Button Link (/path or #id)"));
  const btnLink = el("input", { type: "text" });
  bindInput(btnLink, qb, "buttonLink");
  wrap.appendChild(btnLink);

  // Image
  wrap.appendChild(el("label", {}, "Background Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, qb, "image");
  wrap.appendChild(img);

  return wrap;
}
