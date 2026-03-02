// /cms/sections/serviceArea.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const sa = ensure(CURRENT, "home.serviceArea", {
    title: "",
    description: "",
    areas: []
  });

  if (!Array.isArray(sa.areas)) sa.areas = [];

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Service Area Title"));
  const title = el("input", { type: "text" });
  bindInput(title, sa, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "Description"));
  const desc = el("textarea");
  bindInput(desc, sa, "description");
  wrap.appendChild(desc);

  // Add Area Button
  const addBtn = el("button", { class: "btn primary" }, "Add Service Area");
  addBtn.addEventListener("click", () => {
    sa.areas.push({ name: "" });
    rerender();
  });
  wrap.appendChild(addBtn);

  // List container
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    sa.areas.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Area Name
      card.appendChild(el("label", {}, "Area Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        sa.areas.splice(i, 1);
        rerender();
      });
      card.appendChild(remove);

      list.appendChild(card);
    });
  }

  rerender();
  return wrap;
}
