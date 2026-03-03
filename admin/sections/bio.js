import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
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
  const name = el("input", { type: "text" });
  bindInput(name, bio, "name_line");
  wrap.appendChild(name);

  const addBtn = el("button", { class: "btn primary" }, "Add Paragraph");
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    bio.paragraphs.forEach((p, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Paragraph"));
      const txt = el("textarea");
      bindInput(txt, p, "text");
      card.appendChild(txt);

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        bio.paragraphs.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    bio.paragraphs.push({ text: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}