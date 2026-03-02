// /admin/sections/header.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const site = ensure(CURRENT, "site", {});
  const header = ensure(site, "header", { nav_links: [] });
  if (!Array.isArray(header.nav_links)) header.nav_links = [];

  const social = ensure(site, "social", {
    facebook: "",
    instagram: "",
    x: ""
  });

  const socialVis = ensure(site, "social_visibility", {
    header: {
      facebook: true,
      instagram: true,
      x: true
    }
  });

  const wrap = el("div");

  // -----------------------------
  // Brand Settings
  // -----------------------------
  wrap.appendChild(el("h3", {}, "Brand"));

  wrap.appendChild(el("label", {}, "Business Name"));
  const businessName = el("input", { type: "text" });
  bindInput(businessName, site, "business_name");
  wrap.appendChild(businessName);

  wrap.appendChild(el("label", {}, "Logo URL (/images/...)"));
  const logo = el("input", { type: "text" });
  bindInput(logo, site, "logo_url");
  wrap.appendChild(logo);

  // -----------------------------
  // Navigation Links
  // -----------------------------
  wrap.appendChild(el("h3", {}, "Navigation Links"));

  const addNav = el("button", { class: "btn primary" }, "Add Navigation Link");
  addNav.addEventListener("click", () => {
    header.nav_links.push({
      label: "",
      url: "",
      section_key: ""
    });
    setDirty(true);
    rerenderNav();
  });
  wrap.appendChild(addNav);

  const navList = el("div");
  wrap.appendChild(navList);

  function rerenderNav() {
    navList.innerHTML = "";

    header.nav_links.forEach((link, i) => {
      const card = el("div", { class: "card draggable" });

      // Drag handle
      const drag = el("div", { class: "drag-handle" }, "☰");
      card.appendChild(drag);

      // Label
      card.appendChild(el("label", {}, "Label"));
      const label = el("input", { type: "text" });
      bindInput(label, link, "label");
      card.appendChild(label);

      // URL
      card.appendChild(el("label", {}, "URL"));
      const url = el("input", { type: "text" });
      bindInput(url, link, "url");
      card.appendChild(url);

      // Section Key
      card.appendChild(el("label", {}, "Section Key (optional)"));
      const sectionKey = el("input", { type: "text" });
      bindInput(sectionKey, link, "section_key");
      card.appendChild(sectionKey);

      // Remove
      const remove = el("button", { class: "btn danger" }, "Remove");
      remove.addEventListener("click", () => {
        header.nav_links.splice(i, 1);
        setDirty(true);
        rerenderNav();
      });
      card.appendChild(remove);

      navList.appendChild(card);
    });

    // Enable drag sorting
    enableDragSort(navList, header.nav_links);
  }

  // -----------------------------
  // Social Links
  // -----------------------------
  wrap.appendChild(el("h3", {}, "Header Social Links"));

  // Facebook
  wrap.appendChild(el("label", {}, "Facebook URL"));
  const fb = el("input", { type: "text" });
  bindInput(fb, social, "facebook");
  wrap.appendChild(fb);

  // Instagram
  wrap.appendChild(el("label", {}, "Instagram URL"));
  const ig = el("input", { type: "text" });
  bindInput(ig, social, "instagram");
  wrap.appendChild(ig);

  // X
  wrap.appendChild(el("label", {}, "X URL"));
  const x = el("input", { type: "text" });
  bindInput(x, social, "x");
  wrap.appendChild(x);

  // -----------------------------
  // Social Visibility
  // -----------------------------
  wrap.appendChild(el("h3", {}, "Header Social Visibility"));

  const vis = socialVis.header;

  function addToggle(labelText, key) {
    const row = el("div", { class: "toggle-row" });
    const label = el("label", {}, labelText);
    const input = el("input", { type: "checkbox" });
    input.checked = !!vis[key];
    input.addEventListener("change", () => {
      vis[key] = input.checked;
      setDirty(true);
    });
    row.appendChild(label);
    row.appendChild(input);
    wrap.appendChild(row);
  }

  addToggle("Show Facebook", "facebook");
  addToggle("Show Instagram", "instagram");
  addToggle("Show X", "x");

  rerenderNav();
  return wrap;
}

// -----------------------------
// Drag Sort Helper
// -----------------------------
function enableDragSort(container, arrayRef) {
  let dragEl = null;

  container.querySelectorAll(".draggable").forEach((item) => {
    item.draggable = true;

    item.addEventListener("dragstart", () => {
      dragEl = item;
      item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragEl = null;
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      const after = getDragAfter(container, e.clientY);
      if (after == null) container.appendChild(dragEl);
      else container.insertBefore(dragEl, after);
    });
  });

  function getDragAfter(container, y) {
    const items = [...container.querySelectorAll(".draggable:not(.dragging)")];
    return items.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset
          ? { offset, element: child }
          : closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }
}
