// /cms/sections/testimonials.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const t = ensure(CURRENT, "home.testimonials", { title: "", items: [] });
  if (!Array.isArray(t.items)) t.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, t, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Testimonial Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Testimonial");
  addBtn.addEventListener("click", () => {
    t.items.push({
      name: "",
      role: "",
      quote: "",
      image: ""
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

    t.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Name
      card.appendChild(el("label", {}, "Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Role
      card.appendChild(el("label", {}, "Role (e.g., Bride, Event Planner)"));
      const role = el("input", { type: "text" });
      bindInput(role, item, "role");
      card.appendChild(role);

      // Quote
      card.appendChild(el("label", {}, "Quote"));
      const quote = el("textarea");
      bindInput(quote, item, "quote");
      card.appendChild(quote);

      // Image
      card.appendChild(el("label", {}, "Image URL (/images/...)"));
      const img = el("input", { type: "text" });
      bindInput(img, item, "image");
      card.appendChild(img);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        t.items.splice(i, 1);
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
