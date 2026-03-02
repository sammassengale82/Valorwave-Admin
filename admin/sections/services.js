// /admin/sections/services.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const services = ensure(home, "services", []);

  const wrap = el("div");

  const addBtn = el("button", { class: "btn primary" }, "Add Service");
  addBtn.addEventListener("click", () => {
    services.push({
      title: "",
      text: "",
      image: "",
      alt: ""
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    services.forEach((svc, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Title"));
      const title = el("input", { type: "text" });
      bindInput(title, svc, "title");
      card.appendChild(title);

      card.appendChild(el("label", {}, "Text"));
      const text = el("textarea");
      bindInput(text, svc, "text");
      card.appendChild(text);

      card.appendChild(el("label", {}, "Image URL"));
      const img = el("input", { type: "text" });
      bindInput(img, svc, "image");
      card.appendChild(img);

      card.appendChild(el("label", {}, "Alt Text"));
      const alt = el("input", { type: "text" });
      bindInput(alt, svc, "alt");
      card.appendChild(alt);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        services.splice(i, 1);
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
