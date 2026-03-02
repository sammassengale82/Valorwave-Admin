// /admin.js
import { el, setDirty, getDirty, setCurrent, getCurrent, initState } from "./admin/state.js";

import * as hero from "./admin/sections/hero.js";
import * as services from "./admin/sections/services.js";
import * as bio from "./admin/sections/bio.js";
import * as chattanooga from "./admin/sections/chattanooga.js";
import * as brand from "./admin/sections/brand.js";
import * as heroDiscount from "./admin/sections/heroDiscount.js";
import * as quoteBanner from "./admin/sections/quoteBanner.js";
import * as calendar from "./admin/sections/calendar.js";
import * as faq from "./admin/sections/faq.js";
import * as gallery from "./admin/sections/gallery.js";
import * as clientsSay from "./admin/sections/clientsSay.js";
import * as submitTestimonial from "./admin/sections/submitTestimonial.js";
import * as headerSection from "./admin/sections/header.js";
import * as footerSection from "./admin/sections/footer.js";
import * as legal from "./admin/sections/legal.js";
import * as booking from "./admin/sections/booking.js";
import * as quoteForm from "./admin/sections/quoteForm.js";

const SECTIONS = [
  { id: "header", label: "Header", mod: headerSection },
  { id: "hero", label: "Hero", mod: hero },
  { id: "services", label: "Services", mod: services },
  { id: "bio", label: "Bio", mod: bio },
  { id: "chattanooga", label: "Chattanooga", mod: chattanooga },
  { id: "brand", label: "Brand", mod: brand },
  { id: "hero_discount", label: "Hero Discount", mod: heroDiscount },
  { id: "quote_banner", label: "Quote Banner", mod: quoteBanner },
  { id: "calendar", label: "Calendar", mod: calendar },
  { id: "faqs", label: "FAQs", mod: faq },
  { id: "gallery", label: "Gallery", mod: gallery },
  { id: "clients_say", label: "Clients Say", mod: clientsSay },
  { id: "testimonial", label: "Testimonial Section", mod: submitTestimonial },
  { id: "footer", label: "Footer", mod: footerSection },
  { id: "quote_form", label: "Quote Form", mod: quoteForm },
  { id: "booking", label: "Booking", mod: booking },
  { id: "legal", label: "Legal", mod: legal }
];

const navRoot = document.getElementById("section-nav");
const sectionRoot = document.getElementById("section-root");
const sectionTitle = document.getElementById("section-title");
const statusText = document.getElementById("status-text");
const btnLoad = document.getElementById("btn-load");
const btnSave = document.getElementById("btn-save");
const btnPublish = document.getElementById("btn-publish");
const dirtyIndicator = document.getElementById("dirty-indicator");

let activeId = null;

function renderNav() {
  navRoot.innerHTML = "";
  SECTIONS.forEach(sec => {
    const btn = el("button", { class: "nav-item", "data-id": sec.id }, sec.label);
    if (sec.id === activeId) btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (getDirty() && !confirm("You have unsaved changes. Continue?")) return;
      activeId = sec.id;
      renderNav();
      renderSection(sec);
    });
    navRoot.appendChild(btn);
  });
}

function renderSection(sec) {
  sectionRoot.innerHTML = "";
  sectionTitle.textContent = sec.label;
  const CURRENT = getCurrent();
  const node = sec.mod.build(CURRENT);
  sectionRoot.appendChild(node);
}

async function loadDraft() {
  statusText.textContent = "Loading draft…";
  try {
    const res = await fetch("/api/draft");
    if (!res.ok) throw new Error("Failed to load draft");
    const json = await res.json();
    setCurrent(json);
    setDirty(false);
    dirtyIndicator.textContent = "Clean";
    statusText.textContent = "Draft loaded";
    if (activeId) {
      const sec = SECTIONS.find(s => s.id === activeId);
      if (sec) renderSection(sec);
    }
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error loading draft";
  }
}

async function saveDraft() {
  statusText.textContent = "Saving draft…";
  try {
    const body = JSON.stringify(getCurrent());
    const res = await fetch("/api/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body
    });
    if (!res.ok) throw new Error("Failed to save draft");
    setDirty(false);
    dirtyIndicator.textContent = "Clean";
    statusText.textContent = "Draft saved";
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error saving draft";
  }
}

async function publish() {
  if (!confirm("Publish current draft to live site?")) return;
  statusText.textContent = "Publishing…";
  try {
    const body = JSON.stringify(getCurrent());
    const res = await fetch("/api/publish", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body
    });
    if (!res.ok) throw new Error("Failed to publish");
    statusText.textContent = "Published";
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error publishing";
  }
}

function wireDirtyWatcher() {
  const origSetDirty = setDirty;
  // if your state.js already handles this, you can remove this wrapper
  window.addEventListener("cms-dirty-change", () => {
    dirtyIndicator.textContent = getDirty() ? "Unsaved changes" : "Clean";
  });
}

async function boot() {
  initState();
  renderNav();
  btnLoad.addEventListener("click", loadDraft);
  btnSave.addEventListener("click", saveDraft);
  btnPublish.addEventListener("click", publish);
  await loadDraft();
  if (!activeId && SECTIONS.length) {
    activeId = SECTIONS[0].id;
    renderNav();
    renderSection(SECTIONS[0]);
  }
  wireDirtyWatcher();
}

boot();