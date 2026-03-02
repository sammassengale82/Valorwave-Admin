// /cms/sections/seo.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const seo = ensure(CURRENT, "site.seo", {
    title: "",
    description: "",
    keywords: "",
    image: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "SEO Title"));
  const title = el("input", { type: "text" });
  bindInput(title, seo, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "SEO Description"));
  const desc = el("textarea");
  bindInput(desc, seo, "description");
  wrap.appendChild(desc);

  // Keywords
  wrap.appendChild(el("label", {}, "Keywords (comma separated)"));
  const keys = el("input", { type: "text" });
  bindInput(keys, seo, "keywords");
  wrap.appendChild(keys);

  // Image
  wrap.appendChild(el("label", {}, "SEO Image URL (/images/...)"));
  const img = el("input", { type: "text" });
  bindInput(img, seo, "image");
  wrap.appendChild(img);

  return wrap;
}
