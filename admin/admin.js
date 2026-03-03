// admin/admin.js
// CMS Admin Controller (API-only Worker backend)

// --- API ENDPOINTS ---------------------------------------------------------

const API_BASE = "https://valorwave-admin-worker.sammassengale82.workers.dev";

async function loadDraft() {
  const res = await fetch(`${API_BASE}/api/draft`);
  if (!res.ok) throw new Error("Failed to load draft");
  return await res.json();
}

async function saveDraft(data) {
  const res = await fetch(`${API_BASE}/api/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to save draft");
}

async function publish(data) {
  const res = await fetch(`${API_BASE}/api/publish`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to publish");
}

// --- STATE MANAGEMENT ------------------------------------------------------

export let CURRENT = {};
let DIRTY = false;

export function setDirty() {
  DIRTY = true;
  document.getElementById("saveStatus").textContent = "Unsaved changes";
}

export function isDirty() {
  return DIRTY;
}

// --- SECTION LOADING -------------------------------------------------------
// Each section module must export: render(container, data) and save(data)

import * as header from "./sections/header.js";
import * as footer from "./sections/footer.js";
import * as hero from "./sections/hero.js";
import * as services from "./sections/services.js";
import * as bio from "./sections/bio.js";
import * as chattanooga from "./sections/chattanooga.js";
import * as brand from "./sections/brand.js";
import * as heroDiscount from "./sections/heroDiscount.js";
import * as quoteBanner from "./sections/quoteBanner.js";
import * as calendar from "./sections/calendar.js";
import * as faq from "./sections/faq.js";
import * as gallery from "./sections/gallery.js";
import * as clientsSay from "./sections/clientsSay.js";
import * as submitTestimonial from "./sections/submitTestimonial.js";
import * as booking from "./sections/booking.js";
import * as quoteForm from "./sections/quoteForm.js";
import * as legal from "./sections/legal.js";
import * as serviceArea from "./sections/serviceArea.js";
import * as seo from "./sections/seo.js";
import * as analytics from "./sections/analytics.js";

const SECTIONS = {
  header,
  footer,
  hero,
  services,
  bio,
  chattanooga,
  brand,
  heroDiscount,
  quoteBanner,
  calendar,
  faq,
  gallery,
  clientsSay,
  submitTestimonial,
  booking,
  quoteForm,
  legal,
  serviceArea,
  seo,
  analytics
};

// --- UI HANDLERS -----------------------------------------------------------

function loadSection(name) {
  const mod = SECTIONS[name];
  if (!mod) return;

  const container = document.getElementById("sectionContent");
  container.innerHTML = "";

  mod.render(container, CURRENT);
}

async function handleSave() {
  await saveDraft(CURRENT);
  DIRTY = false;
  document.getElementById("saveStatus").textContent = "Saved";
}

async function handlePublish() {
  await publish(CURRENT);
  DIRTY = false;
  document.getElementById("saveStatus").textContent = "Published";
}

// --- INITIALIZATION --------------------------------------------------------

async function init() {
  CURRENT = await loadDraft();

  document.querySelectorAll("[data-section]").forEach(btn => {
    btn.addEventListener("click", () => loadSection(btn.dataset.section));
  });

  document.getElementById("saveBtn").addEventListener("click", handleSave);
  document.getElementById("publishBtn").addEventListener("click", handlePublish);

  document.getElementById("saveStatus").textContent = "Loaded";
}

init();