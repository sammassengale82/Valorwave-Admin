// /cms/sections/faq.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const faq = ensure(CURRENT, "home.faq", { title: "", items: [] });
  if (!Array.isArray(faq.items)) faq.items = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "FAQ Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, faq, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add FAQ Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add FAQ Item");
  addBtn.addEventListener("click", () => {
    faq.items.push({
      question: "",
      answer: ""
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // List Container
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  // -----------------------------
  // Render List
  // -----------------------------
  function rerender() {
    list.innerHTML = "";

    faq.items.forEach((item, i) => {
      const card = el("div", { class: "card" });

      // Question
      card.appendChild(el("label", {}, "Question"));
      const q = el("input", { type: "text" });
      bindInput(q, item, "question");
      card.appendChild(q);

      // Answer
      card.appendChild(el("label", {}, "Answer"));
      const a = el("textarea");
      bindInput(a, item, "answer");
      card.appendChild(a);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        faq.items.splice(i, 1);
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
