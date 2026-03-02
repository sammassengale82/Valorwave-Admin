// /cms/sections/chattanooga.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const ct = ensure(CURRENT, "home.chattanooga", {
    title: "",
    description: "",
    image: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, ct, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "Description"));
  const desc = el("textarea");
  bindInput(desc, ct, "description");
  wrap.appendChild(desc);

  // Image
  wrap.appendChild(el("label", {}, "Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, ct, "image");
  wrap.appendChild(img);

  return wrap;
}
