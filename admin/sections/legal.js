// /admin/sections/legal.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const site = ensure(CURRENT, "site", {});
  const legal = ensure(site, "legal", {
    privacy: "",
    terms: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Privacy Policy (HTML Allowed)"));
  const privacy = el("textarea");
  bindInput(privacy, legal, "privacy");
  wrap.appendChild(privacy);

  wrap.appendChild(el("label", {}, "Terms & Conditions (HTML Allowed)"));
  const terms = el("textarea");
  bindInput(terms, legal, "terms");
  wrap.appendChild(terms);

  return wrap;
}
