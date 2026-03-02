// /cms/sections/team.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const tm = ensure(CURRENT, "home.team", {
    title: "",
    members: []
  });

  if (!Array.isArray(tm.members)) tm.members = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Team Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, tm, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Add Member Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Team Member");
  addBtn.addEventListener("click", () => {
    tm.members.push({
      name: "",
      role: "",
      bio: "",
      image: ""
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Members List
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    tm.members.forEach((member, i) => {
      const card = el("div", { class: "card" });

      // Name
      card.appendChild(el("label", {}, "Name"));
      const name = el("input", { type: "text" });
      bindInput(name, member, "name");
      card.appendChild(name);

      // Role
      card.appendChild(el("label", {}, "Role"));
      const role = el("input", { type: "text" });
      bindInput(role, member, "role");
      card.appendChild(role);

      // Bio
      card.appendChild(el("label", {}, "Short Bio"));
      const bio = el("textarea");
      bindInput(bio, member, "bio");
      card.appendChild(bio);

      // Image
      card.appendChild(el("label", {}, "Image URL (/images/...)"));
      const img = el("input", { type: "text" });
      bindInput(img, member, "image");
      card.appendChild(img);

      // Remove Button
      const remove = el("button", { class: "btn danger" }, "Remove Member");
      remove.addEventListener("click", () => {
        tm.members.splice(i, 1);
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
