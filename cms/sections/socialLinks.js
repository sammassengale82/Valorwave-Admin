// /cms/sections/socialLinks.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const sl = ensure(CURRENT, "site.social", {
    title: "",
    links: []
  });

  if (!Array.isArray(sl.links)) sl.links = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Social Links Title"));
  const title = el("input", { type: "text" });
  bindInput(title, sl, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Social Link Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Social Link");
  addBtn.addEventListener("click", () => {
    sl.links.push({
      platform: "",
      url: "",
      icon: ""
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // List Container
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  // -----------------------------
  // Render List
  // -----------------------------
  function rerender() {
    list.innerHTML = "";

    sl.links.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Platform
      card.appendChild(el("label", {}, "Platform (e.g., Facebook, Instagram)"));
      const platform = el("input", { type: "text" });
      bindInput(platform, item, "platform");
      card.appendChild(platform);

      // URL
      card.appendChild(el("label", {}, "Profile URL"));
      const url = el("input", { type: "text" });
      bindInput(url, item, "url");
      card.appendChild(url);

      // Icon
      card.appendChild(el("label", {}, "Icon Class (e.g., 'fa-brands fa-facebook')"));
      const icon = el("input", { type: "text" });
      bindInput(icon, item, "icon");
      card.appendChild(icon);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        sl.links.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(remove);

      list.appendChild(card);
    });
  }

  rerender();
  return wrap;
}
