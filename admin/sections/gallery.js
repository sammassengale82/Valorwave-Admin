import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const gal = ensure(data, "home.gallery", {
    title: "",
    images: []
  });

  if (!Array.isArray(gal.images)) gal.images = [];

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Gallery Title"));
  const title = el("input", { type: "text" });
  bindInput(title, gal, "title");
  wrap.appendChild(title);

  const addBtn = el("button", { class: "btn primary" }, "Add Image");
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    gal.images.forEach((imgObj, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Image URL"));
      const url = el("input", { type: "text" });
      bindInput(url, imgObj, "url");
      card.appendChild(url);

      card.appendChild(el("label", {}, "Caption"));
      const cap = el("input", { type: "text" });
      bindInput(cap, imgObj, "caption");
      card.appendChild(cap);

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        gal.images.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    gal.images.push({ url: "", caption: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}