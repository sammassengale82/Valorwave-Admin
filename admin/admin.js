// admin.js — Valorwave CMS Admin (GitHub Worker Version)

import {
  loadDraft,
  saveDraft,
  publish,
  loadSiteTheme,
  saveSiteTheme,
  loadCmsTheme,
  saveCmsTheme,
  uploadImage
} from "./api.js";

let data = null;

// ---------------------------------------------
// AUTO-CREATE MISSING STRUCTURE
// ---------------------------------------------
function ensureStructure() {
  if (!data.site) data.site = {};
  if (!data.home) data.home = {};

  data.site.header ??= { logo_url: "", business_name: "", nav_links: [], cta: { label: "", url: "" }, social: {}, quicknav: [] };
  data.site.footer ??= {};
  data.site.seo ??= {};
  data.site.analytics ??= {};
  data.site.booking ??= { url: "" };
  data.site.forms ??= { quote: {}, testimonial: {} };

  data.home.hero ??= {};
  data.home.hero_discount ??= {};
  data.home.quote_banner ??= {};
  data.home.services ??= { title: "", items: [] };
  data.home.gallery ??= { title: "", images: [] };
  data.home.faq ??= []; 
  data.home.clients_say_section ??= { title: "" };
  data.home.clients_say ??= [];
  data.home.chattanooga ??= { title: "", image_url: "", image_alt: "", intro: "", cards: [] };
  data.home.bio ??= { title: "", image_url: "", image_alt: "", name_line: "", paragraphs: [] };
  data.home.brand ??= { title: "", image_url: "", image_alt: "", paragraphs: [] };
  data.home.calendar ??= { embed_url: "" };
  data.home.service_area ??= { title: "", html: "" };
  data.home.quote_form ??= {};
  data.home.submit_testimonial ??= {};
  data.home.legal ??= {};
}

// ---------------------------------------------
// INIT
// ---------------------------------------------
async function init() {
  const draft = await loadDraft();

  if (typeof draft === "string") {
    try { data = JSON.parse(draft); }
    catch { data = {}; }
  } else {
    data = draft || {};
  }

  ensureStructure();
  attachUI();
}

window.addEventListener("DOMContentLoaded", init);

// ---------------------------------------------
// UI HANDLERS
// ---------------------------------------------
function attachUI() {
  document.querySelectorAll("[data-section]").forEach(btn => {
    btn.addEventListener("click", () => openSection(btn.dataset.section));
  });

  document.getElementById("saveDraft").addEventListener("click", async () => {
    await saveDraft(data);
    alert("Draft saved.");
  });

  document.getElementById("publish").addEventListener("click", async () => {
    await publish(data);
    alert("Published.");
  });

  document.getElementById("saveCmsTheme").addEventListener("click", async () => {
    const theme = document.getElementById("cmsThemeSelect").value;
    await saveCmsTheme(theme);
    alert("CMS Theme saved.");
  });

  document.getElementById("saveSiteTheme").addEventListener("click", async () => {
    const theme = document.getElementById("siteThemeSelect").value;
    await saveSiteTheme(theme);
    alert("Site Theme saved.");
  });
}

// ---------------------------------------------
// SECTION EDITOR
// ---------------------------------------------
function openSection(section) {
  const panel = document.getElementById("editorPanel");
  panel.innerHTML = "";

  const sectionData =
    data.home[section] ??
    data.site[section] ??
    null;

  if (!sectionData) {
    panel.innerHTML = `<p>Section not found: ${section}</p>`;
    return;
  }

  panel.innerHTML = generateEditor(section, sectionData);
  attachEditorBindings(sectionData);
}

function generateEditor(section, obj) {
  let html = `<h2>${section.replace(/_/g, " ").toUpperCase()}</h2>`;

  for (const key in obj) {
    const value = obj[key];

    if (Array.isArray(value) || typeof value === "object") {
      html += `
        <label>${key}</label>
        <textarea data-field="${key}" rows="6">${JSON.stringify(value, null, 2)}</textarea>
      `;
    } else {
      html += `
        <label>${key}</label>
        <input data-field="${key}" value="${value || ""}">
      `;
    }
  }

  html += `<button id="saveSection">Save Section</button>`;
  return html;
}

function attachEditorBindings(sectionData) {
  document.getElementById("saveSection").addEventListener("click", () => {
    const fields = document.querySelectorAll("[data-field]");

    fields.forEach(f => {
      const key = f.dataset.field;
      const val = f.value;

      try {
        sectionData[key] = JSON.parse(val);
      } catch {
        sectionData[key] = val;
      }
    });

    alert("Section updated.");
  });
}