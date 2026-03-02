// /cms-render.js
// Attach this via <script type="module" src="/cms-render.js"></script> at the end of index.html

async function fetchContent() {
  const res = await fetch("/api/publish", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content");
  return res.json();
}

function setText(sel, text) {
  const el = document.querySelector(sel);
  if (el && text != null) el.textContent = text;
}

function setHtml(sel, html) {
  const el = document.querySelector(sel);
  if (el && html != null) el.innerHTML = html;
}

function setImage(sel, url, alt) {
  const el = document.querySelector(sel);
  if (el && url) {
    el.src = url;
    if (alt) el.alt = alt;
  }
}

function renderHeader(site) {
  if (!site || !site.header) return;
  const h = site.header;

  setImage(".site-header .brand-mini img", h.logo_url, site.business_name || "");
  setText(".site-header .brand-mini .brand-text", site.business_name || "");

  const navRoot = document.querySelector(".header-nav");
  if (navRoot && Array.isArray(h.nav_links)) {
    const cta = navRoot.querySelector(".header-cta");
    const social = navRoot.querySelector(".social-links");
    navRoot.innerHTML = "";
    h.nav_links.forEach(link => {
      const a = document.createElement("a");
      a.href = link.url || "#";
      a.textContent = link.label || "";
      a.classList.add("nav-link");
      navRoot.appendChild(a);
    });
    if (cta && h.cta && h.cta.label) {
      const a = document.createElement("a");
      a.href = h.cta.url || "#quote";
      a.textContent = h.cta.label;
      a.className = "header-cta";
      navRoot.appendChild(a);
    }
    if (social && h.social) {
      // you can rebuild social icons here if needed
    }
  }
}

function renderHero(home) {
  const hero = home.hero || {};
  if (hero.background_image) {
    const header = document.querySelector("header.hero");
    if (header) {
      header.style.setProperty("--hero-bg", `url("${hero.background_image}")`);
    }
  }
  setImage(".hero-logo", hero.logo_url, hero.logo_alt || "");
  setText(".kicker", hero.kicker);
  setText(".tagline", hero.tagline);
  setText(".subline", hero.subline);
  const btn = document.querySelector(".hero-inner .btn");
  if (btn) {
    btn.textContent = hero.button_text || btn.textContent;
    if (hero.button_href) btn.href = hero.button_href;
  }
}

function renderServices(home) {
  const sec = home.services;
  if (!sec) return;
  const root = document.querySelector("#services");
  if (!root) return;
  const titleEl = root.querySelector("h2");
  if (titleEl && sec.title) titleEl.textContent = sec.title;

  const grid = root.querySelector(".grid");
  if (!grid || !Array.isArray(sec.items)) return;
  grid.innerHTML = "";
  sec.items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = item.image || "";
    img.alt = item.heading || "";
    card.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";

    const h3 = document.createElement("h3");
    h3.textContent = item.heading || "";
    body.appendChild(h3);

    const p = document.createElement("p");
    p.textContent = item.text || "";
    body.appendChild(p);

    card.appendChild(body);
    grid.appendChild(card);
  });
}

// Similar renderers can be added for bio, chattanooga, brand, hero_discount,
// quote_banner, calendar, faqs, gallery, clients_say, testimonial_section, etc.

async function boot() {
  try {
    const data = await fetchContent();
    const site = data.site || {};
    const home = data.home || {};

    renderHeader(site);
    renderHero(home);
    renderServices(home);
    // add calls to other renderers as you wire them up
  } catch (err) {
    console.error("CMS render error:", err);
  }
}

boot();