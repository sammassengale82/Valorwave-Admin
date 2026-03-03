import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
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
  wrap.appendChild(addBtn);

  const containerList = el("div");
  wrap.appendChild(containerList);

  function rerender() {
    containerList.innerHTML = "";

    list.forEach((item, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Name"));
      const name = el("input", { type: "text" });
      bindInput(name, item, "name");
      card.appendChild(name);

      card.appendChild(el("label", {}, "Testimonial Text"));
      const text = el("textarea");
      bindInput(text, item, "text");
      card.appendChild(text);

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        list.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      containerList.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    list.push({ name: "", text: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}