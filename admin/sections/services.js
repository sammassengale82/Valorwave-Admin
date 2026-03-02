// /admin/sections/services.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const services = ensure(home, "services", {
    title: "",
    items: []
  });

  const wrap = el("div");

  // Section Title
  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, services, "title");
  wrap.appendChild(title);

  // Add Service Card
  const addBtn = el("button", { class: "btn primary" }, "Add Service Card");
  addBtn.addEventListener("click", () => {
    services.items.push({ image: "", heading: "", text: "" });
    setDirty(true);
    render();
  });
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function render() {
    list.innerHTML = "";

    services.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Image URL"));
      const img = el("input", { type: "text" });
      bindInput(img, item, "image");
      card.appendChild(img);

      card.appendChild(el("label", {}, "Heading"));
      const heading = el("input", { type: "text" });
      bindInput(heading, item, "heading");
      card.appendChild(heading);

      card.appendChild(el("label", {}, "Text"));
      const text = el("textarea");
      bindInput(text, item, "text");
      card.appendChild(text);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        services.items.splice(i, 1);
        setDirty(true);
        render();
      });
      card.appendChild(remove);

      list.appendChild(card);
    });
  }

  render();
  return wrap;
}