// /cms/sections/stats.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const st = ensure(CURRENT, "home.stats", {
    title: "",
    items: []
  });

  if (!Array.isArray(st.items)) st.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Stats Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, st, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Stat Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Stat");
  addBtn.addEventListener("click", () => {
    st.items.push({
      value: "",
      label: "",
      icon: ""
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Stats List
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    st.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Value
      card.appendChild(el("label", {}, "Value (e.g., '250+', '12 Years')"));
      const value = el("input", { type: "text" });
      bindInput(value, item, "value");
      card.appendChild(value);

      // Label
      card.appendChild(el("label", {}, "Label (e.g., 'Events Served')"));
      const label = el("input", { type: "text" });
      bindInput(label, item, "label");
      card.appendChild(label);

      // Icon
      card.appendChild(el("label", {}, "Icon Class (optional — e.g., 'fa-solid fa-star')"));
      const icon = el("input", { type: "text" });
      bindInput(icon, item, "icon");
      card.appendChild(icon);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove Stat");
      remove.addEventListener("click", () => {
        st.items.splice(i, 1);
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
