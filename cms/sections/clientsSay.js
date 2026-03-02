// /cms/sections/clientsSay.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const cs = ensure(CURRENT, "home.clientsSay", { title: "", items: [] });
  if (!Array.isArray(cs.items)) cs.items = [];

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, cs, "title");
  wrap.appendChild(title);

  // Add Item Button
  const addBtn = el("button", { class: "btn primary" }, "Add Client Quote");
  addBtn.addEventListener("click", () => {
    cs.items.push({ quote: "", name: "", image: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // List container
  const list = el("div");
  wrap.appendChild(list);

  // Render list
  function rerender() {
    list.innerHTML = "";

    cs.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Quote
      card.appendChild(el("label", {}, "Quote"));
      const quote = el("textarea");
      bindInput(quote, item, "quote");
      card.appendChild(quote);

      // Name
      card.appendChild(el("label", {}, "Client Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      // Image
      card.appendChild(el("label", {}, "Client Image (/images/...)"));
      const img = el("input", { type: "text" });
      bindInput(img, item, "image");
      card.appendChild(img);

      // Remove
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        cs.items.splice(i, 1);
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
