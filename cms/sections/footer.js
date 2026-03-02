// /cms/sections/footer.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const ft = ensure(CURRENT, "site.footer", {
    text: "",
    columns: []
  });

  if (!Array.isArray(ft.columns)) ft.columns = [];

  const wrap = el("div");

  // -----------------------------
  // Footer Text
  // -----------------------------
  wrap.appendChild(el("label", {}, "Footer Text"));
  const text = el("textarea");
  bindInput(text, ft, "text");
  wrap.appendChild(text);

  // -----------------------------
  // Add Column Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Footer Column");
  addBtn.addEventListener("click", () => {
    ft.columns.push({
      title: "",
      links: []
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Columns List
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    ft.columns.forEach((col, i) => {
      const card = el("div", { class: "card" });

      // Column Title
      card.appendChild(el("label", {}, "Column Title"));
      const title = el("input", { type: "text" });
      bindInput(title, col, "title");
      card.appendChild(title);

      // Add Link Button
      const addLink = el("button", { class: "btn secondary" }, "Add Link");
      addLink.addEventListener("click", () => {
        col.links.push({ label: "", url: "" });
        setDirty(true);
        rerender();
      });
      card.appendChild(addLink);

      // Links List
      const linkList = el("div");
      card.appendChild(linkList);

      col.links.forEach((lnk, j) => {
        const linkCard = el("div", { class: "subcard" });

        // Label
        linkCard.appendChild(el("label", {}, "Label"));
        const lbl = el("input", { type: "text" });
        bindInput(lbl, lnk, "label");
        linkCard.appendChild(lbl);

        // URL
        linkCard.appendChild(el("label", {}, "URL (/path or #id)"));
        const url = el("input", { type: "text" });
        bindInput(url, lnk, "url");
        linkCard.appendChild(url);

        // Remove Link
        const removeLink = el("button", { class: "btn danger" }, "Remove Link");
        removeLink.addEventListener("click", () => {
          col.links.splice(j, 1);
          setDirty(true);
          rerender();
        });
        linkCard.appendChild(removeLink);

        linkList.appendChild(linkCard);
      });

      // Remove Column
      const removeCol = el("button", { class: "btn danger" }, "Remove Column");
      removeCol.addEventListener("click", () => {
        ft.columns.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(removeCol);

      list.appendChild(card);
    });
  }

  rerender();
  return wrap;
}
