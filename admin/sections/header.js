// /admin/sections/header.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const site = ensure(CURRENT, "site", {});
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
    quicknav: [] // optional mobile quicknav icons
  });

  const wrap = el("div");

  // Logo
  wrap.appendChild(el("label", {}, "Logo URL"));
  const logo = el("input", { type: "text" });
  bindInput(logo, header, "logo_url");
  wrap.appendChild(logo);

  // Business Name
  wrap.appendChild(el("label", {}, "Business Name"));
  const biz = el("input", { type: "text" });
  bindInput(biz, header, "business_name");
  wrap.appendChild(biz);

  // CTA Button
  wrap.appendChild(el("h3", {}, "CTA Button"));
  wrap.appendChild(el("label", {}, "CTA Label"));
  const ctaLabel = el("input", { type: "text" });
  bindInput(ctaLabel, header.cta, "label");
  wrap.appendChild(ctaLabel);

  wrap.appendChild(el("label", {}, "CTA URL"));
  const ctaUrl = el("input", { type: "text" });
  bindInput(ctaUrl, header.cta, "url");
  wrap.appendChild(ctaUrl);

  // Social Icons
  wrap.appendChild(el("h3", {}, "Social Links"));
  ["facebook", "instagram", "tiktok"].forEach(key => {
    wrap.appendChild(el("label", {}, key[0].toUpperCase() + key.slice(1)));
    const input = el("input", { type: "text" });
    bindInput(input, header.social, key);
    wrap.appendChild(input);
  });

  // Navigation Links
  wrap.appendChild(el("h3", {}, "Navigation Links"));
  const navContainer = el("div");
  wrap.appendChild(navContainer);

  const addNav = el("button", { class: "btn primary" }, "Add Nav Link");
  addNav.addEventListener("click", () => {
    header.nav_links.push({ label: "", url: "", section_key: "" });
    setDirty(true);
    renderNav();
  });
  wrap.appendChild(addNav);

  function renderNav() {
    navContainer.innerHTML = "";
    header.nav_links.forEach((item, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Label"));
      const label = el("input", { type: "text" });
      bindInput(label, item, "label");
      card.appendChild(label);

      card.appendChild(el("label", {}, "URL"));
      const url = el("input", { type: "text" });
      bindInput(url, item, "url");
      card.appendChild(url);

      card.appendChild(el("label", {}, "Section Key (optional)"));
      const key = el("input", { type: "text" });
      bindInput(key, item, "section_key");
      card.appendChild(key);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        header.nav_links.splice(i, 1);
        setDirty(true);
        renderNav();
      });
      card.appendChild(remove);

      navContainer.appendChild(card);
    });
  }

  renderNav();

  return wrap;
}