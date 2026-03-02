// /admin/sections/brand.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const brand = ensure(home, "brand", {
    title: "",
    image_url: "",
    image_alt: "",
    paragraphs: []
  });

  if (!Array.isArray(brand.paragraphs)) brand.paragraphs = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, brand, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Image URL"));
  const img = el("input", { type: "text" });
  bindInput(img, brand, "image_url");
  wrap.appendChild(img);

  wrap.appendChild(el("label", {}, "Image Alt Text"));
  const alt = el("input", { type: "text" });
  bindInput(alt, brand, "image_alt");
  wrap.appendChild(alt);

  const addBtn = el("button", { class: "btn primary" }, "Add Paragraph");
  addBtn.addEventListener("click", () => {
    brand.paragraphs.push({ text: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    brand.paragraphs.forEach((p, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Paragraph Text"));
      const text = el("textarea");
      bindInput(text, p, "text");
      card.appendChild(text);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        brand.paragraphs.splice(i, 1);
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
