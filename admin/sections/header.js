// /admin/sections/header.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const site = ensure(data, "site", {});
  const header = ensure(site, "header", {
    logo_url: "",
    business_name: "",
    nav_links: [],
    cta: { label: "", url: "" },
    social: {
      facebook: "",
      instagram: "",
      tiktok: ""
    },
    quicknav: []
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Logo URL"));
  const logo = el("input", { type: "text" });
  bindInput(logo, header, "logo_url");
  wrap.appendChild(logo);

  wrap.appendChild(el("label", {}, "Business Name"));
  const biz = el("input", { type: "text" });
  bindInput(biz, header, "business_name");
  wrap.appendChild(biz);

  container.appendChild(wrap);
}

export function save(data) {
  // No-op: data is already mutated by bindInput
}