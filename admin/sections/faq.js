import { el, bindInput, ensure, setDirty } from "../state.js";

export function render(container, data) {
  const home = ensure(data, "home", {});
  let faqs = ensure(home, "faqs", []);

  if (!Array.isArray(faqs)) faqs = [];

  const wrap = el("div");

  const addBtn = el("button", { class: "btn primary" }, "Add FAQ");
  wrap.appendChild(addBtn);

  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    faqs.forEach((item, i) => {
      const card = el("div", { class: "card" });

      card.appendChild(el("label", {}, "Question"));
      const q = el("input", { type: "text" });
      bindInput(q, item, "q");
      card.appendChild(q);

      card.appendChild(el("label", {}, "Answer"));
      const a = el("textarea");
      bindInput(a, item, "a");
      card.appendChild(a);

      const del = el("button", { class: "btn danger" }, "Delete");
      del.addEventListener("click", () => {
        faqs.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(del);

      list.appendChild(card);
    });
  }

  addBtn.addEventListener("click", () => {
    faqs.push({ q: "", a: "" });
    setDirty(true);
    rerender();
  });

  rerender();
  container.appendChild(wrap);
}

export function save(data) {}