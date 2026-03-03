// /admin/theme.js

const API_BASE = "https://valorwave-admin-worker.sammassengale82.workers.dev";

// ------------------------------------------------------------
// Load CMS Theme (admin UI only)
// ------------------------------------------------------------
export function applyCmsTheme() {
  const theme = localStorage.getItem("cmsTheme") || "original";
  document.body.classList.remove(
    "theme-original",
    "theme-multicam",
    "theme-patriotic",
    "dark"
  );
  document.body.classList.add(`theme-${theme}`);

  const select = document.getElementById("cmsThemeSelect");
  if (select) select.value = theme;
}

// ------------------------------------------------------------
// Load Site Theme (public site + preview iframe)
// ------------------------------------------------------------
export function applySiteTheme() {
  const theme = localStorage.getItem("siteTheme") || "original";

  const select = document.getElementById("siteThemeSelect");
  if (select) select.value = theme;

  // Apply to preview iframe if present
  const iframe = document.getElementById("previewFrame");
  if (iframe && iframe.contentWindow && iframe.contentWindow.document.body) {
    const body = iframe.contentWindow.document.body;
    body.classList.remove(
      "site-theme-original",
      "site-theme-multicam",
      "site-theme-patriotic"
    );
    body.classList.add(`site-theme-${theme}`);
  }
}

// ------------------------------------------------------------
// Save CMS Theme (local only)
// ------------------------------------------------------------
export function saveCmsTheme() {
  const select = document.getElementById("cmsThemeSelect");
  const theme = select.value;

  localStorage.setItem("cmsTheme", theme);
  applyCmsTheme();

  document.getElementById("saveStatus").textContent = "CMS Theme Saved";
}

// ------------------------------------------------------------
// Save Site Theme (local + Worker file)
// ------------------------------------------------------------
export async function saveSiteTheme() {
  const select = document.getElementById("siteThemeSelect");
  const theme = select.value;

  localStorage.setItem("siteTheme", theme);
  applySiteTheme();

  // Save to Worker
  await fetch(`${API_BASE}/api/site-theme`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: theme
  });

  document.getElementById("saveStatus").textContent = "Site Theme Saved";
}