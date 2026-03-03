// /admin/admin.js
import { applyCmsTheme, applySiteTheme, saveCmsTheme, saveSiteTheme } from "./theme.js";
import { setDirty, isDirty } from "./state.js";

// ------------------------------------------------------------
// Worker API base URL
// ------------------------------------------------------------
const API_BASE = "https://valorwave-admin-worker.sammassengale82.workers.dev";

// ------------------------------------------------------------
// Section module loader
// ------------------------------------------------------------
const sectionModules = {};

async function loadSection(name) {
  if (!sectionModules[name]) {
    sectionModules[name] = await import(`./sections/${name}.js`);
  }
  return sectionModules[name];
}

// ------------------------------------------------------------
// Global CMS state (draft.json)
// ------------------------------------------------------------
let CURRENT = null;

// ------------------------------------------------------------
// Load draft.json from Worker
// ------------------------------------------------------------
async function loadDraft() {
  const res = await fetch(`${API_BASE}/api/draft`);
  if (!res.ok) {
    console.error("Failed to load draft.json");
    return;
  }
  CURRENT = await res.json();
  setDirty(false);
  document.getElementById("saveStatus").textContent = "Draft Loaded";
}

// ------------------------------------------------------------
// Save draft.json to Worker
// ------------------------------------------------------------
async function saveDraft() {
  if (!CURRENT) return;

  const res = await fetch(`${API_BASE}/api/draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CURRENT, null, 2)
  });

  if (res.ok) {
    setDirty(false);
    document.getElementById("saveStatus").textContent = "Draft Saved";
  } else {
    document.getElementById("saveStatus").textContent = "Save Failed";
  }
}

// ------------------------------------------------------------
// Publish draft.json → publish.json
// ------------------------------------------------------------
async function publish() {
  if (!CURRENT) return;

  const res = await fetch(`${API_BASE}/api/publish`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CURRENT, null, 2)
  });

  if (res.ok) {
    setDirty(false);
    document.getElementById("saveStatus").textContent = "Published";
  } else {
    document.getElementById("saveStatus").textContent = "Publish Failed";
  }
}

// ------------------------------------------------------------
// Render selected section
// ------------------------------------------------------------
async function showSection(name) {
  const mod = await loadSection(name);
  const container = document.getElementById("sectionContent");

  container.innerHTML = "";
  mod.render(container, CURRENT);
}

// ------------------------------------------------------------
// Sidebar click handling
// ------------------------------------------------------------
function setupSidebar() {
  const buttons = document.querySelectorAll(".sidebar button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.getAttribute("data-section");
      showSection(section);
    });
  });
}

// ------------------------------------------------------------
// Theme integration
// ------------------------------------------------------------
function setupThemes() {
  applyCmsTheme();
  applySiteTheme();

  document.getElementById("saveCmsTheme").onclick = saveCmsTheme;
  document.getElementById("saveSiteTheme").onclick = saveSiteTheme;
}

// ------------------------------------------------------------
// Save + Publish buttons
// ------------------------------------------------------------
function setupSaveButtons() {
  document.getElementById("saveBtn").onclick = saveDraft;
  document.getElementById("publishBtn").onclick = publish;
}

// ------------------------------------------------------------
// Warn before leaving if unsaved changes
// ------------------------------------------------------------
window.addEventListener("beforeunload", (e) => {
  if (isDirty()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ------------------------------------------------------------
// Initialize admin UI
// ------------------------------------------------------------
async function init() {
  await loadDraft();
  setupSidebar();
  setupSaveButtons();
  setupThemes();

  // Load default section
  showSection("header");
}

init();