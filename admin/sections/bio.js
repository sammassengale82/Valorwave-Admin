// /admin/sections/bio.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const bio = ensure(home, "bio", {
    title: "",
    image_url: "",
    image_alt: "",
    name_line: "",
    paragraphs: []
  });

  if (!Array.isArray(bio.paragraphs)) bio.paragraphs = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, bio, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Image URL"));
  const img = el("input", { type: "text" });
  bindInput(img, bio, "image_url");
  wrap.appendChild(img);

  wrap.appendChild(el("label", {}, "Image Alt Text"));
  const alt = el("input", { type: "text" });
  bindInput(alt, bio, "image_alt");
  wrap.appendChild(alt);

  wrap.appendChild(el("label", {}, "Name Line"));
  const nameLine = el("input", { type: "text" });
  bindInput(nameLine, bio, "name_line");
  wrap.appendChild(nameLine);

  const addBtn = el("button", { class: "btn primary" }, "Add Paragraph");
  addBtn.addEventListener("click", () => {
    bio.paragraphs.push({ text: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    bio.paragraphs.forEach((p, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Paragraph Text"));
      const text = el("textarea");
      bindInput(text, p, "text");
      card.appendChild(text);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        bio.paragraphs.splice(i, 1);
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
