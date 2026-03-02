// /cms/sections/heroDiscount.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const hd = ensure(CURRENT, "home.heroDiscount", {
    title: "",
    description: "",
    badgeText: "",
    image: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Hero Discount Title"));
  const title = el("input", { type: "text" });
  bindInput(title, hd, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "Description"));
  const desc = el("textarea");
  bindInput(desc, hd, "description");
  wrap.appendChild(desc);

  // Badge Text
  wrap.appendChild(el("label", {}, "Badge Text (e.g., '10% Off for Heroes')"));
  const badge = el("input", { type: "text" });
  bindInput(badge, hd, "badgeText");
  wrap.appendChild(badge);

  // Image
  wrap.appendChild(el("label", {}, "Background Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, hd, "image");
  wrap.appendChild(img);

  return wrap;
}
