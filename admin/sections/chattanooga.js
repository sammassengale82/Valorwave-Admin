// /admin/sections/chattanooga.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const ch = ensure(home, "chattanooga", {
    title: "",
    image_url: "",
    image_alt: "",
    intro: "",
    cards: []
  });

  if (!Array.isArray(ch.cards)) ch.cards = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Title"));
  const title = el("input", { type: "text" });
  bindInput(title, ch, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Image URL"));
  const img = el("input", { type: "text" });
  bindInput(img, ch, "image_url");
  wrap.appendChild(img);

  wrap.appendChild(el("label", {}, "Image Alt Text"));
  const alt = el("input", { type: "text" });
  bindInput(alt, ch, "image_alt");
  wrap.appendChild(alt);

  wrap.appendChild(el("label", {}, "Intro Text"));
  const intro = el("textarea");
  bindInput(intro, ch, "intro");
  wrap.appendChild(intro);

  const addBtn = el("button", { class: "btn primary" }, "Add Card");
  addBtn.addEventListener("click", () => {
    ch.cards.push({ title: "", text: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    ch.cards.forEach((card, i) => {
      const c = el("div", { class: "card" });

      c.appendChild(el("label", {}, "Card Title"));
      const ct = el("input", { type: "text" });
      bindInput(ct, card, "title");
      c.appendChild(ct);

      c.appendChild(el("label", {}, "Card Text"));
      const tx = el("textarea");
      bindInput(tx, card, "text");
      c.appendChild(tx);

      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        ch.cards.splice(i, 1);
        setDirty(true);
        rerender();
      });
      c.appendChild(remove);

      list.appendChild(c);
    });
  }

  rerender();
  return wrap;
}
