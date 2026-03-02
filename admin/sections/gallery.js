// /cms/sections/gallery.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const gal = ensure(CURRENT, "home.gallery", {
    title: "",
    images: []
  });

  if (!Array.isArray(gal.images)) gal.images = [];

  const wrap = el("div");

  // -----------------------------
  // Gallery Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Gallery Title"));
  const title = el("input", { type: "text" });
  bindInput(title, gal, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Image Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Image");
  addBtn.addEventListener("click", () => {
    gal.images.push({ url: "", caption: "" });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Images List
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    gal.images.forEach((img, i) => {
      const card = el("div", { class: "card" });

      // Image URL
      card.appendChild(el("label", {}, "Image URL (/images/...)"));
      const url = el("input", { type: "text" });
      bindInput(url, img, "url");
      card.appendChild(url);

      // Caption
      card.appendChild(el("label", {}, "Caption (optional)"));
      const cap = el("input", { type: "text" });
      bindInput(cap, img, "caption");
      card.appendChild(cap);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        gal.images.splice(i, 1);
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
