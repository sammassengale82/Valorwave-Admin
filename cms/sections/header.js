// /cms/sections/header.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const header = ensure(CURRENT, "site.header", {});

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Header Title"));
  const title = el("input", { type: "text" });
  bindInput(title, header, "title");
  wrap.appendChild(title);

  // Logo URL
  wrap.appendChild(el("label", {}, "Logo URL (/images/...)"));
  const logo = el("input", { type: "text" });
  bindInput(logo, header, "logo");
  wrap.appendChild(logo);

  // Alt text
  wrap.appendChild(el("label", {}, "Logo Alt Text"));
  const alt = el("input", { type: "text" });
  bindInput(alt, header, "alt");
  wrap.appendChild(alt);

  return wrap;
}
