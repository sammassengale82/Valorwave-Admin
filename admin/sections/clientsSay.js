// /admin/sections/clientsSay.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const section = ensure(home, "clients_say_section", {
    title: ""
  });

  let list = ensure(home, "clients_say", []);
  if (!Array.isArray(list)) list = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, section, "title");
  wrap.appendChild(title);

  const addBtn = el("button", { class: "btn primary" }, "Add Testimonial");
  addBtn.addEventListener("click", () => {
    list.push({ text: "", name: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  const container = el("div");
  wrap.appendChild(container);

  function rerender() {
    container.innerHTML = "";

    list.forEach((item, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Testimonial Text"));
      const text = el("textarea");
      bindInput(text, item, "text");
      card.appendChild(text);

      card.appendChild(el("label", {}, "Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        list.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(remove);

      container.appendChild(card);
    });
  }

  rerender();
  return wrap;
}
