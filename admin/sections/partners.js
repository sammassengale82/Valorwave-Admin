// /cms/sections/partners.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const pt = ensure(CURRENT, "home.partners", {
    title: "",
    items: []
  });

  if (!Array.isArray(pt.items)) pt.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Partners Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, pt, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Partner Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Partner");
  addBtn.addEventListener("click", () => {
    pt.items.push({
      name: "",
      logo: "",
      url: ""
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

    pt.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Name
      card.appendChild(el("label", {}, "Partner Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Logo
      card.appendChild(el("label", {}, "Logo URL (/images/...)"));
      const logo = el("input", { type: "text" });
      bindInput(logo, item, "logo");
      card.appendChild(logo);

      // URL
      card.appendChild(el("label", {}, "Website URL"));
      const url = el("input", { type: "text" });
      bindInput(url, item, "url");
      card.appendChild(url);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        pt.items.splice(i, 1);
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
