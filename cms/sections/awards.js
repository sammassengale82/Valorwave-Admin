// /cms/sections/awards.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const aw = ensure(CURRENT, "home.awards", {
    title: "",
    items: []
  });

  if (!Array.isArray(aw.items)) aw.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Awards Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, aw, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Award Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Award");
  addBtn.addEventListener("click", () => {
    aw.items.push({
      name: "",
      organization: "",
      year: "",
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

    aw.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Award Name
      card.appendChild(el("label", {}, "Award Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Organization
      card.appendChild(el("label", {}, "Organization"));
      const org = el("input", { type: "text" });
      bindInput(org, item, "organization");
      card.appendChild(org);

      // Year
      card.appendChild(el("label", {}, "Year"));
      const year = el("input", { type: "text" });
      bindInput(year, item, "year");
      card.appendChild(year);

      // Image
      card.appendChild(el("label", {}, "Award Image URL (/images/...)"));
      const img = el("input", { type: "text" });
      bindInput(img, item, "image");
      card.appendChild(img);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        aw.items.splice(i, 1);
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
