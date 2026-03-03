// cms-render.js — Valorwave Public Site Renderer (Root‑Path Version)

async function loadCMS() {
  try {
    const res = await fetch("/publish.json", { cache: "no-store" });
    if (!res.ok) {
      console.error("Failed to load publish.json");
      return;
    }

    const data = await res.json();
    renderAll(data);
  } catch (err) {
    console.error("CMS Load Error:", err);
  }
}

// Optional: Draft preview mode
async function loadDraft() {
  try {
    const res = await fetch("/draft.json", { cache: "no-store" });
    if (!res.ok) {
      console.warn("No draft.json found");
      return;
    }

    const data = await res.json();
    renderAll(data);
  } catch (err) {
    console.error("Draft Load Error:", err);
  }
}

// Master render function
function renderAll(data) {
  if (!data) return;

  // Site-level modules
  if (data.site) {
    if (data.site.seo) seo(data.site.seo);
    if (data.site.analytics) analytics(data.site.analytics);
    if (data.site.header) header(data.site.header);
    if (data.site.footer) footer(data.site.footer);
  }

  // Home page modules
  if (data.home) {
    if (data.home.hero) hero(data.home.hero);
    if (data.home.services) services(data.home.services);
    if (data.home.bio) bio(data.home.bio);
    if (data.home.chattanooga) chattanooga(data.home.chattanooga);
    if (data.home.brand) brand(data.home.brand);
    if (data.home.hero_discount) heroDiscount(data.home.hero_discount);
    if (data.home.quote_banner) quoteBanner(data.home.quote_banner);
    if (data.home.gallery) gallery(data.home.gallery);
    if (data.home.faq) faq(data.home.faq);
    if (data.home.clients_say) clientsSay(data.home.clients_say);
    if (data.home.calendar) calendar(data.home.calendar);
    if (data.home.service_area) serviceArea(data.home.service_area);
    if (data.home.quote_form) quoteForm(data.home.quote_form);
    if (data.home.submit_testimonial) submitTestimonial(data.home.submit_testimonial);
    if (data.home.legal) legal(data.home.legal);
  }
}

// Theme loading
async function loadThemes() {
  try {
    const siteThemeRes = await fetch("/site-theme.txt", { cache: "no-store" });
    if (siteThemeRes.ok) {
      const theme = await siteThemeRes.text();
      document.documentElement.setAttribute("data-theme", theme.trim());
    }
  } catch (err) {
    console.error("Theme Load Error:", err);
  }
}

// Auto-run on page load
window.addEventListener("DOMContentLoaded", () => {
  loadThemes();

  // If you want preview mode:
  const isPreview = window.location.search.includes("preview=true");
  if (isPreview) {
    loadDraft();
  } else {
    loadCMS();
  }
});
