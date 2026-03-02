// /cms/sections/services.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const svc = ensure(CURRENT, "home.services", { title: "", items: [] });
  if (!Array.isArray(svc.items)) svc.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, svc, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Service Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Service");
  addBtn.addEventListener("click", () => {
    svc.items.push({
      name: "",
      description: "",
      icon: "",
      image: "",
      price: ""
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

    svc.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Name
      card.appendChild(el("label", {}, "Service Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Description
      card.appendChild(el("label", {}, "Description"));
      const desc = el("textarea");
      bindInput(desc, item, "description");
      card.appendChild(desc);

      // Icon
      card.appendChild(el("label", {}, "Icon (optional — e.g., 'fa-solid fa-music')"));
      const icon = el("input", { type: "text" });
      bindInput(icon, item, "icon");
      card.appendChild(icon);

      // Image
      card.appendChild(el("label", {}, "Image URL (/images/...)"));
      const img = el("input", { type: "text" });
      bindInput(img, item, "image");
      card.appendChild(img);

      // Price
      card.appendChild(el("label", {}, "Price (optional)"));
      const price = el("input", { type: "text" });
      bindInput(price, item, "price");
      card.appendChild(price);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        svc.items.splice(i, 1);
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
