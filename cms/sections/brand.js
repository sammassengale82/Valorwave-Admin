// /cms/sections/brand.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const brand = ensure(CURRENT, "home.brand", {
    title: "",
    meaning: "",
    image: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Brand Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, brand, "title");
  wrap.appendChild(title);

  // Meaning
  wrap.appendChild(el("label", {}, "Brand Meaning / Story"));
  const meaning = el("textarea");
  bindInput(meaning, brand, "meaning");
  wrap.appendChild(meaning);

  // Image
  wrap.appendChild(el("label", {}, "Brand Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, brand, "image");
  wrap.appendChild(img);

  return wrap;
}
