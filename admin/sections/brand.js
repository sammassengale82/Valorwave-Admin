import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const brand = ensure(home, "brand", {
    title: "",
    image_url: "",
    image_alt: "",
    paragraphs: []
  });

  if (!Array.isArray(brand.paragraphs)) brand.paragraphs = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, brand, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Image URL"));
  const img = el("input", { type: "text" });
  bindInput(img, brand, "image_url");
  wrap.appendChild(img);

  wrap.appendChild(el("label", {}, "Image Alt Text"));
  const alt = el("input", { type: "text" });
  bindInput(alt, brand, "image_alt");
  wrap.appendChild(alt);

  container.appendChild(wrap);
}

export function save(data) {}