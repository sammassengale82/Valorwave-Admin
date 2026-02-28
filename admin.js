// Valor Wave Admin – Minimal GitHub-OAuth CMS Admin
// --------------------------------------------------------------
// Responsibilities:
//   - Check session via /api/cms/session (worker issues vw_admin cookie)
//   - If not logged in → redirect to GitHub OAuth
//   - Load JSON for the selected page (we will wire this to GitHub next)
//   - Render simple form bindings for editing JSON
//   - Save JSON back to backend (GitHub-backed API coming next)
//
// Removed:
//   - R2 upload
//   - Media library
//   - Analytics
//   - History / publish / rollback
//   - Page duplication
//   - Legacy migrations
//   - Dynamic UI injection
//   - Preview iframe
//   - Section overrides
//   - Theme/layout/typography controls
// --------------------------------------------------------------

(function () {
  const API_BASE = "/api/cms"; // worker will proxy to GitHub later

  // --------------------------------------------------------------
  // DOM helpers
  // --------------------------------------------------------------
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function bindInput(el, obj, path) {
    const parts = path.split(".");
    el.value = get(obj, path) || "";
    el.addEventListener("input", () => {
      let ref = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (!ref[k] || typeof ref[k] !== "object") ref[k] = {};
        ref = ref[k];
      }
      ref[parts[parts.length - 1]] = el.value;
    });
  }

  function get(obj, path) {
    return path.split(".").reduce((acc, k) => acc && acc[k], obj);
  }

  // --------------------------------------------------------------
  // Session check
  // --------------------------------------------------------------
  async function checkSession() {
    const res = await fetch(`${API_BASE}/session`, { credentials: "include" });
    const j = await res.json();
    return j.ok === true;
  }

  async function requireLogin() {
    const ok = await checkSession();
    if (!ok) {
      location.href = "/auth/github/login";
      return false;
    }
    return true;
  }

  // --------------------------------------------------------------
  // Load + Save JSON
  // --------------------------------------------------------------
  async function loadPage(slug) {
    const res = await fetch(`${API_BASE}/page?slug=${encodeURIComponent(slug)}`, {
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to load page");
    return await res.json();
  }

  async function savePage(slug, data) {
    const res = await fetch(`${API_BASE}/page?slug=${encodeURIComponent(slug)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  // --------------------------------------------------------------
  // Render Editor
  // --------------------------------------------------------------
  function renderEditor(data, slug) {
    const root = qs("#pageEditor");
    root.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2 style="margin:0 0 10px 0">Editing: ${slug}</h2>
      <p class="muted small">This is a minimal JSON editor. Fields map directly to the CMS JSON.</p>
      <div class="grid" id="editorGrid"></div>
    `;
    root.appendChild(card);

    const grid = card.querySelector("#editorGrid");

    // Render simple inputs for top-level site + page keys
    const fields = [
      { label: "Business Name", path: "site.business_name" },
      { label: "Logo URL", path: "site.logo_url" },
      { label: "Facebook", path: "site.social.facebook" },
      { label: "Instagram", path: "site.social.instagram" },
      { label: "X", path: "site.social.x" },
      { label: "Footer Copyright", path: "site.footer.copyright" },
      { label: "Footer Tagline", path: "site.footer.tagline" },
      { label: "Hero Headline", path: "home.hero.headline" },
      { label: "Hero Tagline", path: "home.hero.tagline" },
      { label: "Hero Button Text", path: "home.hero.button.text" },
      { label: "Hero Button URL", path: "home.hero.button.url" }
    ];

    fields.forEach(f => {
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <label>${f.label}</label>
        <input data-path="${f.path}">
      `;
      grid.appendChild(wrap);
      bindInput(wrap.querySelector("input"), data, f.path);
    });

    // Save button
    qs("#saveBtn").onclick = async () => {
      qs("#saveMsg").textContent = "Saving…";
      const out = await savePage(slug, data);
      qs("#saveMsg").textContent = out.ok ? "Saved." : "Error saving.";
    };
  }

  // --------------------------------------------------------------
  // Init
  // --------------------------------------------------------------
  async function init() {
    const ok = await requireLogin();
    if (!ok) return;

    const pageSelect = qs("#pageSelect");
    const slug = pageSelect.value;

    const data = await loadPage(slug);
    renderEditor(data, slug);

    pageSelect.onchange = async () => {
      const slug = pageSelect.value;
      const data = await loadPage(slug);
      renderEditor(data, slug);
    };

    qs("#logoutBtn").onclick = async () => {
      await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
      location.reload();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();