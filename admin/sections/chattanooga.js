import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
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
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    ch.cards.forEach((cardObj, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Card Title"));
      const ct = el("input", { type: "text" });
      bindInput(ct, cardObj, "title");
      card.appendChild(ct);

      card.appendChild(el("label", {}, "Card Text"));
      const txt = el("textarea");
      bindInput(txt, cardObj, "text");
      card.appendChild(txt);

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        ch.cards.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    ch.cards.push({ title: "", text: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}