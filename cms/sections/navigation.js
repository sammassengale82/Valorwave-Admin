// /cms/sections/navigation.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const nav = ensure(CURRENT, "site.navigation", { links: [] });
  if (!Array.isArray(nav.links)) nav.links = [];

  const wrap = el("div");

  // -----------------------------
  // Add Link Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Navigation Link");
  addBtn.addEventListener("click", () => {
    nav.links.push({ label: "", url: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Container for list
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  // -----------------------------
  // Render List
  // -----------------------------
  function rerender() {
    list.innerHTML = "";

    nav.links.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Label
      card.appendChild(el("label", {}, "Label"));
      const label = el("input", { type: "text" });
      bindInput(label, item, "label");
      card.appendChild(label);

      // URL
      card.appendChild(el("label", {}, "URL (/path or #id)"));
      const url = el("input", { type: "text" });
      bindInput(url, item, "url");
      card.appendChild(url);

      // Remove button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        nav.links.splice(i, 1);
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
