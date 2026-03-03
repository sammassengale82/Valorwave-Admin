import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  const services = ensure(home, "services", {
    title: "",
    items: []
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, services, "title");
  wrap.appendChild(title);

  const addBtn = el("button", { class: "btn primary" }, "Add Service Card");
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
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

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        services.items.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    services.items.push({ image: "", heading: "", text: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}