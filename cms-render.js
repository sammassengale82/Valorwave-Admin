(function () {

  // ============================================================
  // CONFIG
  // ============================================================
  const CMS_ENDPOINT = "/api/cms/page";
  const PREVIEW_PARAM = "vw_preview";
  const SELECTED_CLASS = "vw-selected";

  // ============================================================
  // SAFE HELPERS
  // ============================================================
  const safe = {
    str(v) {
      return typeof v === "string" ? v : "";
    },
    url(v) {
      if (typeof v !== "string") return "";
      try {
        const u = new URL(v, location.origin);
        return u.toString();
      } catch {
        return "";
      }
    },
    color(v) {
      if (typeof v !== "string") return "";
      const s = v.trim().toLowerCase();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(s)) return s;
      if (/^rgb\(/.test(s)) return s;
      if (/^rgba\(/.test(s)) return s;
      if (/^[a-z]+$/.test(s)) return s;
      return "";
    },
    num(v, fallback = 0) {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
  };

  // ============================================================
  // PAGE SLUG
  // ============================================================
  function pageSlug() {
    const p = location.pathname.replace(/\/+$/, "");
    if (!p || p === "/") return "home";
    if (p.startsWith("/p/")) return p.slice(3).replace(/[^a-z0-9\-]/gi, "") || "home";
    const last = p.split("/").pop();
    return last.replace(/\.html$/i, "").replace(/[^a-z0-9\-]/gi, "") || "home";
  }

  // ============================================================
  // FETCH CMS JSON (draft or published)
  // ============================================================
  async function loadCmsJson(slug, previewMode) {
    const url = new URL(CMS_ENDPOINT, location.origin);
    url.searchParams.set("slug", slug);
    if (previewMode) url.searchParams.set("mode", "draft");

    const res = await fetch(url.toString(), {
      credentials: "include",
      cache: "no-cache"
    });

    if (!res.ok) {
      console.error("CMS load failed:", res.status, res.statusText);
      return null;
    }

    try {
      return await res.json();
    } catch (err) {
      console.error("CMS JSON parse error:", err);
      return null;
    }
  }

  // ============================================================
  // PREVIEW MODE DETECTION
  // ============================================================
  function isPreviewMode() {
    const u = new URL(location.href);
    return u.searchParams.get(PREVIEW_PARAM) === "1";
  }

  // ============================================================
  // POSTMESSAGE BRIDGE (PREVIEW ENGINE)
  // ============================================================
  const preview = {
    active: false,
    overrides: {},
    selectedSection: null,

    init() {
      this.active = isPreviewMode();
      if (!this.active) return;

      window.addEventListener("message", (ev) => {
        if (!ev || !ev.data || typeof ev.data !== "object") return;

        const msg = ev.data;

        // Live override patches
        if (msg.type === "vw_overrides") {
          this.overrides = msg.overrides || {};
          applySectionOverrides(this.overrides);
        }

        // Click-to-select highlight
        if (msg.type === "vw_select_section") {
          this.highlightSection(msg.key);
        }

        // Clear selection
        if (msg.type === "vw_clear_selection") {
          this.clearHighlight();
        }
      });

      // Enable click-to-select
      document.addEventListener("click", (ev) => {
        const el = ev.target.closest("[data-cms-section]");
        if (!el) return;
        const key = el.getAttribute("data-cms-section");
        if (!key) return;

        window.parent.postMessage(
          { type: "vw_section_clicked", key },
          "*"
        );
      });
    },

    highlightSection(key) {
      this.clearHighlight();
      const el = document.querySelector(`[data-cms-section="${key}"]`);
      if (el) {
        el.classList.add(SELECTED_CLASS);
        this.selectedSection = el;
      }
    },

    clearHighlight() {
      if (this.selectedSection) {
        this.selectedSection.classList.remove(SELECTED_CLASS);
        this.selectedSection = null;
      }
    }
  };

  // ============================================================
  // PLACEHOLDER — OVERRIDES ENGINE (FULL IMPLEMENTATION IN PART 3)
  // ============================================================
  function applySectionOverrides(overrides) {
    // Full implementation comes in Part 3
  }

  // ============================================================
  // MAIN RENDER ENTRY
  // ============================================================
  async function run() {
    const slug = pageSlug();
    const previewMode = isPreviewMode();

    preview.init();

    const data = await loadCmsJson(slug, previewMode);
    if (!data) {
      console.error("CMS data missing");
      return;
    }

    // Rendering engines come in Parts 2–4
    window.__CMS_DATA__ = data;
    window.__CMS_SLUG__ = slug;

    // Part 2 will call:
    // applyTheme(data);
    // applyLayoutControls(data);
    // applyTypography(data);

    // Part 3 will call:
    // applySectionOverrides(preview.overrides);
    // applyVisibility(data);
    // applyOrder(data);
    // applyRepeaters(data);

    // Part 4 will call:
    // renderDynamicSections(data);
    // renderTestimonials(data);
    // renderClientsSay(data);
    // normalizeLegacy(data);
    // applyHeroBackground(data);
    // applySEO(data);
  }

  // ============================================================
  // BOOTSTRAP
  // ============================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
// ============================================================
  // THEME ENGINE
  // ============================================================
  function applyTheme(data) {
    const site = data.site || {};
    const theme = site.theme || {};
    const root = document.documentElement;

    // Colors
    if (theme.colors && typeof theme.colors === "object") {
      for (const [k, v] of Object.entries(theme.colors)) {
        const c = safe.color(v);
        if (c) root.style.setProperty(`--${k}`, c);
      }
    }

    // Backgrounds
    if (theme.backgrounds && typeof theme.backgrounds === "object") {
      for (const [k, v] of Object.entries(theme.backgrounds)) {
        const url = safe.url(v);
        if (url) root.style.setProperty(`--bg-${k}`, `url("${url}")`);
      }
    }

    // Fonts
    if (theme.fonts && typeof theme.fonts === "object") {
      for (const [k, v] of Object.entries(theme.fonts)) {
        if (typeof v === "string") {
          root.style.setProperty(`--font-${k}`, v);
        }
      }
    }

    // Theme mode (light/dark)
    if (theme.mode) {
      root.setAttribute("data-theme", theme.mode);
    }
  }

  // ============================================================
  // LAYOUT ENGINE
  // ============================================================
  function applyLayoutControls(data) {
    const site = data.site || {};
    const layout = site.layout || {};
    const root = document.documentElement;

    // Spacing scale
    if (layout.spacing && typeof layout.spacing === "object") {
      for (const [k, v] of Object.entries(layout.spacing)) {
        const n = safe.num(v);
        root.style.setProperty(`--space-${k}`, `${n}px`);
      }
    }

    // Container widths
    if (layout.containers && typeof layout.containers === "object") {
      for (const [k, v] of Object.entries(layout.containers)) {
        const n = safe.num(v);
        root.style.setProperty(`--container-${k}`, `${n}px`);
      }
    }

    // Border radius
    if (layout.radius && typeof layout.radius === "object") {
      for (const [k, v] of Object.entries(layout.radius)) {
        const n = safe.num(v);
        root.style.setProperty(`--radius-${k}`, `${n}px`);
      }
    }

    // Shadows
    if (layout.shadows && typeof layout.shadows === "object") {
      for (const [k, v] of Object.entries(layout.shadows)) {
        if (typeof v === "string") {
          root.style.setProperty(`--shadow-${k}`, v);
        }
      }
    }
  }

  // ============================================================
  // TYPOGRAPHY ENGINE
  // ============================================================
  function applyTypography(data) {
    const site = data.site || {};
    const typo = site.typography || {};
    const root = document.documentElement;

    // Font sizes
    if (typo.sizes && typeof typo.sizes === "object") {
      for (const [k, v] of Object.entries(typo.sizes)) {
        const n = safe.num(v);
        root.style.setProperty(`--font-size-${k}`, `${n}px`);
      }
    }

    // Line heights
    if (typo.line_heights && typeof typo.line_heights === "object") {
      for (const [k, v] of Object.entries(typo.line_heights)) {
        const n = safe.num(v);
        root.style.setProperty(`--line-height-${k}`, n);
      }
    }

    // Font weights
    if (typo.weights && typeof typo.weights === "object") {
      for (const [k, v] of Object.entries(typo.weights)) {
        const n = safe.num(v);
        root.style.setProperty(`--font-weight-${k}`, n);
      }
    }

    // Letter spacing
    if (typo.letter_spacing && typeof typo.letter_spacing === "object") {
      for (const [k, v] of Object.entries(typo.letter_spacing)) {
        const n = safe.num(v);
        root.style.setProperty(`--letter-spacing-${k}`, `${n}px`);
      }
    }

    // Text transforms
    if (typo.transforms && typeof typo.transforms === "object") {
      for (const [k, v] of Object.entries(typo.transforms)) {
        if (typeof v === "string") {
          root.style.setProperty(`--text-transform-${k}`, v);
        }
      }
    }
  }
// ============================================================
  // SECTION OVERRIDE ENGINE (FULL)
  // ============================================================
  function applySectionOverrides(overrides) {
    if (!overrides || typeof overrides !== "object") return;

    const root = document.documentElement;

    // CSS variable overrides
    if (overrides.css && typeof overrides.css === "object") {
      for (const [k, v] of Object.entries(overrides.css)) {
        if (typeof v === "string" || typeof v === "number") {
          root.style.setProperty(`--${k}`, String(v));
        }
      }
    }

    // Inline style overrides for specific sections
    if (overrides.sections && typeof overrides.sections === "object") {
      for (const [key, styleObj] of Object.entries(overrides.sections)) {
        const el = document.querySelector(`[data-cms-section="${key}"]`);
        if (!el || typeof styleObj !== "object") continue;

        for (const [prop, val] of Object.entries(styleObj)) {
          if (typeof val === "string" || typeof val === "number") {
            el.style.setProperty(prop, String(val));
          }
        }
      }
    }
  }

  // ============================================================
  // VISIBILITY ENGINE
  // ============================================================
  function applyVisibility(data) {
    const site = data.site || {};
    const sections = site.sections || {};

    document.querySelectorAll("[data-cms-section]").forEach((el) => {
      const key = el.getAttribute("data-cms-section");
      if (!key) return;

      const visible = sections[key];
      if (visible === false) {
        el.style.display = "none";
      } else {
        el.style.display = "";
      }
    });
  }

  // ============================================================
  // ORDERING ENGINE
  // ============================================================
  function applyOrder(data) {
    const site = data.site || {};
    const order = site.order || {};

    for (const [key, pos] of Object.entries(order)) {
      const el = document.querySelector(`[data-cms-section="${key}"]`);
      if (!el) continue;

      const n = safe.num(pos, null);
      if (n === null) continue;

      el.style.order = String(n);
    }
  }

  // ============================================================
  // REPEATER ENGINE
  // ============================================================
  function applyRepeaters(data) {
    const site = data.site || {};
    const repeaters = site.repeaters || {};

    for (const [key, arr] of Object.entries(repeaters)) {
      if (!Array.isArray(arr)) continue;

      const container = document.querySelector(`[data-cms-repeater="${key}"]`);
      if (!container) continue;

      const template = container.querySelector("[data-cms-template]");
      if (!template) continue;

      // Clear old items
      container.querySelectorAll("[data-cms-item]").forEach((n) => n.remove());

      // Render new items
      arr.forEach((item) => {
        const clone = template.cloneNode(true);
        clone.removeAttribute("data-cms-template");
        clone.setAttribute("data-cms-item", key);

        bindFields(clone, item);

        container.appendChild(clone);
      });
    }
  }

  // ============================================================
  // FIELD BINDING ENGINE
  // ============================================================
  function bindFields(root, dataObj) {
    if (!root || !dataObj || typeof dataObj !== "object") return;

    // Text fields
    root.querySelectorAll("[data-cms-text]").forEach((el) => {
      const path = el.getAttribute("data-cms-text");
      const val = getDeep(dataObj, path);
      if (typeof val === "string") el.textContent = val;
    });

    // HTML fields
    root.querySelectorAll("[data-cms-html]").forEach((el) => {
      const path = el.getAttribute("data-cms-html");
      const val = getDeep(dataObj, path);
      if (typeof val === "string") el.innerHTML = val;
    });

    // Image src
    root.querySelectorAll("[data-cms-img]").forEach((el) => {
      const path = el.getAttribute("data-cms-img");
      const val = getDeep(dataObj, path);
      const url = safe.url(val);
      if (url) el.src = url;
    });

    // Link href
    root.querySelectorAll("[data-cms-href]").forEach((el) => {
      const path = el.getAttribute("data-cms-href");
      const val = getDeep(dataObj, path);
      const url = safe.url(val);
      if (url) el.href = url;
    });

    // Background images
    root.querySelectorAll("[data-cms-bg]").forEach((el) => {
      const path = el.getAttribute("data-cms-bg");
      const val = getDeep(dataObj, path);
      const url = safe.url(val);
      if (url) el.style.backgroundImage = `url("${url}")`;
    });
  }

  // ============================================================
  // SAFE DEEP GET
  // ============================================================
  function getDeep(obj, path) {
    if (!obj || typeof obj !== "object") return undefined;
    if (!path || typeof path !== "string") return undefined;

    return path.split(".").reduce((acc, k) => {
      if (!acc || typeof acc !== "object") return undefined;
      return acc[k];
    }, obj);
  }
// ============================================================
  // DYNAMIC SECTIONS RENDERER
  // ============================================================
  function renderDynamicSections(data) {
    const site = data.site || {};
    const sections = site.dynamic_sections || {};

    for (const [key, sectionData] of Object.entries(sections)) {
      const el = document.querySelector(`[data-cms-section="${key}"]`);
      if (!el) continue;

      bindFields(el, sectionData);
    }
  }

  // ============================================================
  // TESTIMONIALS RENDERER
  // ============================================================
  function renderTestimonials(data) {
    const site = data.site || {};
    const testimonials = site.testimonials || [];
    if (!Array.isArray(testimonials)) return;

    const container = document.querySelector("[data-cms-testimonials]");
    if (!container) return;

    const template = container.querySelector("[data-cms-template]");
    if (!template) return;

    // Clear old
    container.querySelectorAll("[data-cms-item]").forEach((n) => n.remove());

    testimonials.forEach((t) => {
      const clone = template.cloneNode(true);
      clone.removeAttribute("data-cms-template");
      clone.setAttribute("data-cms-item", "testimonial");

      bindFields(clone, t);

      container.appendChild(clone);
    });
  }

  // ============================================================
  // CLIENTS SAY RENDERER
  // ============================================================
  function renderClientsSay(data) {
    const site = data.site || {};
    const clients = site.clients_say || [];
    if (!Array.isArray(clients)) return;

    const container = document.querySelector("[data-cms-clients-say]");
    if (!container) return;

    const template = container.querySelector("[data-cms-template]");
    if (!template) return;

    // Clear old
    container.querySelectorAll("[data-cms-item]").forEach((n) => n.remove());

    clients.forEach((c) => {
      const clone = template.cloneNode(true);
      clone.removeAttribute("data-cms-template");
      clone.setAttribute("data-cms-item", "client");

      bindFields(clone, c);

      container.appendChild(clone);
    });
  }

  // ============================================================
  // HERO BACKGROUND ENGINE
  // ============================================================
  function applyHeroBackground(data) {
    const site = data.site || {};
    const hero = site.hero || {};
    const url = safe.url(hero.background);

    if (!url) return;

    const el = document.querySelector("[data-cms-hero]");
    if (el) {
      el.style.backgroundImage = `url("${url}")`;
    }
  }

  // ============================================================
  // SEO ENGINE
  // ============================================================
  function applySEO(data) {
    const site = data.site || {};
    const seo = site.seo || {};

    if (seo.title) {
      document.title = safe.str(seo.title);
    }

    if (seo.description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = safe.str(seo.description);
    }

    if (seo.keywords) {
      let meta = document.querySelector('meta[name="keywords"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "keywords";
        document.head.appendChild(meta);
      }
      meta.content = safe.str(seo.keywords);
    }
  }

  // ============================================================
  // LEGACY NORMALIZATION
  // ============================================================
  function normalizeLegacy(data) {
    const site = data.site || {};

    // Old "hero_image" → new hero.background
    if (site.hero_image && !site.hero?.background) {
      site.hero = site.hero || {};
      site.hero.background = site.hero_image;
    }

    // Old "testimonials_list" → new testimonials
    if (Array.isArray(site.testimonials_list) && !Array.isArray(site.testimonials)) {
      site.testimonials = site.testimonials_list;
    }

    // Old "clients" → new clients_say
    if (Array.isArray(site.clients) && !Array.isArray(site.clients_say)) {
      site.clients_say = site.clients;
    }
  }

  // ============================================================
  // FINAL RENDER PIPELINE
  // ============================================================
  async function finalizeRender() {
    const data = window.__CMS_DATA__;
    if (!data) return;

    // Normalize legacy fields
    normalizeLegacy(data);

    // Theme + layout + typography
    applyTheme(data);
    applyLayoutControls(data);
    applyTypography(data);

    // Overrides (preview)
    applySectionOverrides(preview.overrides);

    // Visibility + ordering + repeaters
    applyVisibility(data);
    applyOrder(data);
    applyRepeaters(data);

    // Dynamic sections + testimonials + clients say
    renderDynamicSections(data);
    renderTestimonials(data);
    renderClientsSay(data);

    // Hero + SEO
    applyHeroBackground(data);
    applySEO(data);
  }

  // Run finalizeRender after initial load
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(finalizeRender, 0);
  });
})();
