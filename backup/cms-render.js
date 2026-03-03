// Valor Wave Entertainment - CMS Renderer (Option B - Full)
// Applies CMS-managed content to existing static HTML without changing layout/CSS.

(function () {
  const CMS_ENDPOINT = "/api/cms/page";
  const TARGET_QUOTE_URL = "https://portal.valorwaveentertainment.com/request_information.asp?djidnumber=28542";

  // Live preview support: when embedded in the admin preview iframe we accept
  // section overrides via postMessage (Apply without saving).
  try{
    const sp = new URLSearchParams(location.search);
    if(sp.get("vw_preview") === "1"){
      let SELECT_MODE = false;
      let hoverEl = null;
      let selectedEl = null;

      // small CSS for hover/selected outlines in preview mode only
      const st = document.createElement("style");
      st.id = "vwSelectStyle";
      st.textContent = `
        .vwHoverOutline{outline:3px solid rgba(212,175,55,.85) !important; outline-offset: 2px !important;}
        .vwSelectedOutline{outline:4px solid rgba(206,162,93,.95) !important; outline-offset: 3px !important;}
      `;
      document.head.appendChild(st);

      function closestSectionKey(target){
        if(!target || !target.closest) return null;
        const el = target.closest("[data-cms-section]");
        if(!el) return null;
        const key = el.getAttribute("data-cms-section");
        return key ? { el, key } : null;
      }
      function clearHover(){
        if(hoverEl){ hoverEl.classList.remove("vwHoverOutline"); hoverEl = null; }
      }
      function clearSelected(){
        if(selectedEl){ selectedEl.classList.remove("vwSelectedOutline"); selectedEl = null; }
      }

      document.addEventListener("mousemove", (ev)=>{
        if(!SELECT_MODE) return;
        const hit = closestSectionKey(ev.target);
        const next = hit ? hit.el : null;
        if(next === hoverEl) return;
        clearHover();
        if(next && next !== selectedEl){ hoverEl = next; hoverEl.classList.add("vwHoverOutline"); }
      }, true);

      document.addEventListener("click", (ev)=>{
        if(!SELECT_MODE) return;
        const hit = closestSectionKey(ev.target);
        if(!hit) return;
        ev.preventDefault();
        ev.stopPropagation();
        clearHover();
        clearSelected();
        selectedEl = hit.el;
        selectedEl.classList.add("vwSelectedOutline");
        try{ parent.postMessage({ type:"vw_section_selected", key: hit.key }, "*"); }catch(_e){}
      }, true);

      window.addEventListener("message", (ev)=>{
        const d = ev.data;
        if(!d || !d.type) return;
        if(d.type === "vw_overrides"){
          applySectionOverrides(d.section_overrides || {});
        }
        if(d.type === "vw_site_patch"){
          try{
            if(d.patch && d.patch.typography){ applyTypography({ site: { typography: d.patch.typography } }); }
          }catch(_e){}
        }
        if(d.type === "vw_select_mode"){
          SELECT_MODE = !!d.enabled;
          if(!SELECT_MODE){ clearHover(); clearSelected(); }
        }
      });
    }
  }catch(_e){}

  
  
  function applySectionOverrides(overrides){
    overrides = overrides || {};
    // inject once
    let st = document.getElementById("vwSectionOverrideStyle");
    if(!st){
      st = document.createElement("style");
      st.id = "vwSectionOverrideStyle";
      document.head.appendChild(st);
    }
    const rules = [];
    for(const key of Object.keys(overrides)){
      const ov = overrides[key] || {};
      // Do not assume a specific tag; any element can declare a CMS section.
      const sel = `[data-cms-section="${key}"]`;
      const top = (ov.pad_top||"").trim();
      const bot = (ov.pad_bottom||"").trim();
      const mw = (ov.max_width||"").trim();
      const bgPreset = (ov.bg_preset||"").trim();
      const bgImage = (ov.bg_image||"").trim();
      const bgOverlay = (typeof ov.bg_overlay === "number") ? ov.bg_overlay : null;
      const headingAlign = (ov.heading_align||"").trim ? String(ov.heading_align||"").trim() : String(ov.heading_align||"");
      const headingSize = (ov.heading_size||"").trim ? String(ov.heading_size||"").trim() : String(ov.heading_size||"");
      const contentWidth = (ov.content_width||"").trim ? String(ov.content_width||"").trim() : String(ov.content_width||"");
      const btnStyle = (ov.btn_style||"").trim ? String(ov.btn_style||"").trim() : String(ov.btn_style||"");
      const btnSize = (ov.btn_size||"").trim ? String(ov.btn_size||"").trim() : String(ov.btn_size||"");
      const btnRadius = (ov.btn_radius||"").trim ? String(ov.btn_radius||"").trim() : String(ov.btn_radius||"");
      const btnAlign = (ov.btn_align||"").trim ? String(ov.btn_align||"").trim() : String(ov.btn_align||"");
      const decl = [];
      if(top) decl.push(`padding-top:${cssSafeLen(top)} !important;`);
      if(bot) decl.push(`padding-bottom:${cssSafeLen(bot)} !important;`);
      if(mw) decl.push(`max-width:${cssSafeLen(mw)} !important;`);

      if(!mw && contentWidth){
        const cw = presetToContentWidth(contentWidth);
        if(cw) decl.push(`max-width:${cw} !important;`);
      }

            // Guardrailed typography presets (no raw CSS)
      if(headingAlign){
        const ha = presetToAlign(headingAlign);
        if(ha) decl.push(`text-align:${ha} !important;`);
      }

// Guardrailed background presets (no raw CSS)
      if(bgPreset){
        const pv = presetToBackground(bgPreset);
        if(pv) decl.push(`background:${pv} !important;`);
      }

      // Background image (safe URL from /media/..)
      if(bgImage && isSafeMediaUrl(bgImage)){
        // Special case: hero uses a CSS variable for its background image
        if(key === "hero"){
          decl.push(`--hero-bg:url("${cssEscapeUrl(bgImage)}") !important;`);
          decl.push(`background:none !important;`);
        }else{
          decl.push(`background-image:url("${cssEscapeUrl(bgImage)}") !important;`);
          decl.push(`background-size:cover !important;`);
          decl.push(`background-position:center !important;`);
          decl.push(`background-repeat:no-repeat !important;`);
        }
      }

      // Hero overlay strength (0..1). Only affects hero::before gradient.
      if(key === "hero" && bgOverlay != null && Number.isFinite(bgOverlay)){
        const n = Math.max(0, Math.min(1, bgOverlay));
        // Map 0..1 -> subtle range while keeping readability
        const topA = (0.35 + (0.55*n)).toFixed(2);
        const botA = (0.70 + (0.28*n)).toFixed(2);
        decl.push(`--hero_overlay_top:${topA} !important;`);
        decl.push(`--hero_overlay_bottom:${botA} !important;`);
      }
      if(decl.length) rules.push(`${sel}{${decl.join("")}}`);
      // heading size rules (scoped)
      const hs = presetToHeadingSize(headingSize, key);
      if(hs){
        if(key === "hero"){
          rules.push(`${sel} .hero-h1, ${sel} h1{font-size:${hs} !important;}`);
        }else{
          rules.push(`${sel} h2{font-size:${hs} !important;}`);
        }
      }

      // Button presets (scoped to .btn inside the section)
      const bsDecl = [];
      const bs = presetToButtonStyle(btnStyle);
      if(bs) bsDecl.push(bs);
      const bsz = presetToButtonSize(btnSize);
      if(bsz) bsDecl.push(bsz);
      const br = presetToButtonRadius(btnRadius);
      if(br) bsDecl.push(br);
      if(bsDecl.length) rules.push(`${sel} .btn{${bsDecl.join("")}}`);

      const ba = presetToAlign(btnAlign);
      if(ba){
        // Only affect alignment at desktop widths to avoid clobbering mobile full-width buttons.
        rules.push(`@media (min-width:721px){${sel} .btn{display:block;width:fit-content;max-width:100%;margin-left:${ba==="right"?"auto":"0"};margin-right:${ba==="left"?"auto":"0"};}}`);
        if(ba === "center"){
          rules.push(`@media (min-width:721px){${sel} .btn{margin-left:auto;margin-right:auto;}}`);
        }
        if(ba === "right"){
          rules.push(`@media (min-width:721px){${sel} .btn{margin-left:auto;margin-right:0;}}`);
        }
      }
    }
    st.textContent = rules.join("\n");
  }

  function presetToBackground(p){
    p = String(p||"").toLowerCase();
    if(p === "panel") return "var(--panel)";
    if(p === "navy") return "var(--navy)";
    if(p === "dark") return "var(--dark)";
    return "";
  }
  function presetToContentWidth(p){
    p = String(p||"").toLowerCase();
    if(p === "narrow") return "920px";
    if(p === "normal") return "1100px";
    if(p === "wide") return "1280px";
    return "";
  }
  function presetToAlign(a){
    a = String(a||"").toLowerCase();
    if(a === "left" || a === "center" || a === "right") return a;
    return "";
  }
  function presetToHeadingSize(p, key){
    p = String(p||"").toLowerCase();
    // Guardrails: fixed sizes only
    if(key === "hero"){
      if(p === "sm") return "34px";
      if(p === "md") return "40px";
      if(p === "lg") return "46px";
    }else{
      if(p === "sm") return "28px";
      if(p === "md") return "34px";
      if(p === "lg") return "40px";
    }
    return "";
  }

  function presetToButtonStyle(p){
    p = String(p||"").toLowerCase();
    if(p === "primary") return "background:var(--gold) !important;color:var(--dark) !important;border:0 !important;";
    if(p === "ghost") return "background:transparent !important;color:var(--gold) !important;border:1px solid var(--gold) !important;";
    if(p === "outline") return "background:transparent !important;color:var(--white) !important;border:1px solid var(--border) !important;";
    return "";
  }

  function presetToButtonSize(p){
    p = String(p||"").toLowerCase();
    if(p === "sm") return "padding:10px 18px !important;font-size:14px !important;";
    if(p === "md") return "padding:14px 30px !important;font-size:16px !important;";
    if(p === "lg") return "padding:16px 34px !important;font-size:18px !important;";
    return "";
  }

  function presetToButtonRadius(p){
    const s = String(p||"").trim();
    if(s === "8" || s === "12" || s === "999") return `border-radius:${s}px !important;`;
    return "";
  }

  function isSafeMediaUrl(u){
    try{
      // allow relative /media/* only (R2 public proxy)
      return typeof u === "string" && u.startsWith("/media/");
    }catch(_e){ return false; }
  }
  function cssEscapeUrl(u){
    // very small escaping for quotes/backslashes
    return String(u||"").replace(/\\/g,"\\\\").replace(/\"/g,"\\\"");
  }
  function cssSafeLen(v){
    // allow px, rem, em, %, vw, vh; reject anything else
    if(!v) return "";
    if(/^\d+(\.\d+)?(px|rem|em|%|vw|vh)$/.test(v)) return v;
    return "";
  }

  function applyTheme(theme){
    // Theme is applied via CSS variables already used by the template (:root in index.html)
    // Guardrails: only allow known keys + safe color strings.
    theme = theme || {};
    const preset = (theme.preset || "original").toLowerCase();

    const PRESETS = {
      original: {
        navy: "#0F172A",
        dark: "#020617",
        gold: "#D4AF37",
        white: "#F8FAFC",
        gray: "#CBD5E1",
        panel: "rgba(2, 6, 23, 0.78)",
        border: "#1E293B",
      },
      patriotic: {
        // Royal blue + red + white
        navy: "#4169E1",
        dark: "#0B1220",
        gold: "#B22234",
        white: "#FFFFFF",
        gray: "#E5E7EB",
        panel: "rgba(11, 18, 32, 0.78)",
        border: "#1F2937",
      },
      acu: {
        // ACU-inspired neutral/tactical
        navy: "#4B5563",      // foliage gray
        dark: "#1F2937",
        gold: "#A89B78",      // tan
        white: "#F5F5F4",
        gray: "#D6D3D1",
        panel: "rgba(31, 41, 55, 0.70)",
        border: "#374151",
      }
    };

    const base = PRESETS[preset] || PRESETS.original;
    const pal = (theme.palette && typeof theme.palette === "object") ? theme.palette : {};
    const root = document.documentElement;

    const setVar = (k, v)=>{ if(v!=null && v!=="") root.style.setProperty(`--${k}`, String(v)); };
    // Use preset defaults, allow override from theme.palette
    setVar("navy", safeColor(((pal.navy!=null && String(pal.navy).trim()!=="") ? pal.navy : base.navy)));
    setVar("dark", safeColor(((pal.dark!=null && String(pal.dark).trim()!=="") ? pal.dark : base.dark)));
    setVar("gold", safeColor(((pal.gold!=null && String(pal.gold).trim()!=="") ? pal.gold : base.gold)));
    setVar("white", safeColor(((pal.white!=null && String(pal.white).trim()!=="") ? pal.white : base.white)));
    setVar("gray", safeColor(((pal.gray!=null && String(pal.gray).trim()!=="") ? pal.gray : base.gray)));
    setVar("border", safeColor(((pal.border!=null && String(pal.border).trim()!=="") ? pal.border : base.border)));
    // panel can be rgba(); allow as-is if it matches a safe rgba format.
    setVar("panel", safeRGBA(((pal.panel!=null && String(pal.panel).trim()!=="") ? pal.panel : base.panel)));
  }

  function safeColor(v){
    // allow hex colors only
    v = String(v||"").trim();
    if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
    return "";
  }
  function safeRGBA(v){
    v = String(v||"").trim();
    if(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|0?\.\d+|1(\.0+)?)\s*\)$/.test(v)) return v;
    // if they put a hex here by mistake, still allow it
    if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
    return "";
  }

  function applyThemedLogo(data){
    try{
      const theme = (data && data.site && data.site.theme) ? data.site.theme : null;
      if(!theme) return;
      const preset = (theme.preset || "original").toLowerCase();
      const logos = theme.logos || {};
      const chosen = logos[preset] && logos[preset].url ? String(logos[preset].url) : "";
      if(chosen) data.site.logo_url = chosen;
    }catch(_e){}
  }

function applyLayoutControls(layout){
    layout = layout || {};
    const root = document.documentElement;

    // map choices to CSS variable values
    const padMap = { sm: "48px", md: "70px", lg: "92px" };
    const contMap = { narrow: "980px", normal: "1100px", wide: "1280px" };
    const gapMap = { tight: "12px", normal: "18px", spacious: "26px" };
    const heroMap = { short: "520px", normal: "640px", tall: "760px" };
    const btnMap = {
      sm: { py:"10px", px:"14px", fs:"14px" },
      md: { py:"12px", px:"18px", fs:"16px" },
      lg: { py:"14px", px:"22px", fs:"17px" }
    };
    const radMap = { tight:"12px", normal:"18px", round:"26px" };
    const fontMap = { "90":"0.90", "100":"1.00", "110":"1.10" };

    const pad = padMap[layout.section_pad] || padMap.md;
    const cont = contMap[layout.container] || contMap.normal;
    const gap = gapMap[layout.gap] || gapMap.normal;
    const hero = heroMap[layout.hero] || heroMap.normal;
    const btn = btnMap[layout.btn] || btnMap.md;
    const rad = radMap[layout.radius] || radMap.normal;
    const font = fontMap[layout.font] || fontMap["100"];

    root.style.setProperty("--vw-section-pad-y", pad);
    root.style.setProperty("--vw-container", cont);
    root.style.setProperty("--vw-gap", gap);
    root.style.setProperty("--vw-hero-minh", hero);
    root.style.setProperty("--vw-btn-py", btn.py);
    root.style.setProperty("--vw-btn-px", btn.px);
    root.style.setProperty("--vw-btn-fs", btn.fs);
    root.style.setProperty("--vw-radius", rad);
    root.style.setProperty("--vw-font-scale", font);

    // inject override css once (comes after base CSS so it wins)
    if(document.getElementById("vwLayoutStyle")) return;
    const st=document.createElement("style");
    st.id="vwLayoutStyle";
    st.textContent = `
      section{ max-width: var(--vw-container, 1100px) !important; padding: var(--vw-section-pad-y, 70px) 18px !important; }
      .grid{ gap: var(--vw-gap, 18px) !important; }
.card{ border-radius: var(--vw-radius, 18px) !important; }
.btn{ padding: var(--vw-btn-py, 12px) var(--vw-btn-px, 18px) !important; font-size: var(--vw-btn-fs, 16px) !important; border-radius: calc(var(--vw-radius, 18px) - 4px) !important; }
      header.hero{ min-height: var(--vw-hero-minh, 640px) !important; }
      body{ font-size: calc(16px * var(--vw-font-scale, 1.00)) !important; }
    

      }



      /* Services cards: centered + 2-up on mobile */
      #services .grid{
        display:flex !important;
        flex-wrap:wrap !important;
        justify-content:center !important;
        align-items:stretch !important;
      }
      #services .grid > .card{
        flex: 0 1 320px !important;
        max-width: 320px !important;
      }
      @media (max-width: 720px){
        #services .grid > .card{
          flex: 1 1 calc(50% - var(--vw-gap, 18px)) !important;
          max-width: calc(50% - var(--vw-gap, 18px)) !important;
        }
      }

`;
    document.head.appendChild(st);
  }


  function normalizeQuoteLinks(data){
    try{
      if(!data) return data;
      // Hero button
      if(data.home && data.home.hero && data.home.hero.button){
        const u = String(data.home.hero.button.url || "");
        data.home.hero.button.url = TARGET_QUOTE_URL;
      }
      // Header nav
      const nav = data.site && data.site.header && Array.isArray(data.site.header.nav_links) ? data.site.header.nav_links : null;
      if(nav){
        nav.forEach((l)=>{
          const url = String(l.url || "");
          const key = String(l.section_key || "");
          if(key === "quote" || url === "#quote" || url.startsWith("#quote") || (String(l.label||"").toLowerCase().includes("quote"))){
            l.url = TARGET_QUOTE_URL;
            // prevent section-link auto hide from treating it as internal section
            l.section_key = "";
          }
        });
      }
      // Quote banner button
      if(data.home && data.home.quote_banner){
        const u = String(data.home.quote_banner.button_url || "");
        if(u === "#quote" || u.startsWith("#quote")) data.home.quote_banner.button_url = TARGET_QUOTE_URL;
      }
      // Also patch any DOM anchors with data-cms-section-link="quote" to external, always visible
      setTimeout(()=>{
        document.querySelectorAll('[data-cms-section-link="quote"]').forEach((a)=>{
          try{
            a.setAttribute("href", TARGET_QUOTE_URL);
            a.removeAttribute("data-cms-section-link");
            a.style.display = "";
          }catch(e){}
        });
      }, 0);
    }catch(e){}
    return data;
  }

function pageSlug() {
    const p = (location.pathname || "/").toLowerCase();
    if (p.includes("testimonial-thank-you")) return "testimonial-thank-you";
    if (p.includes("thank-you")) return "thank-you";
    if (p === "/" || p.endsWith("/index.html") || p.endsWith("/")) return "home";
    if (p.startsWith("/p/")) return p.replace(/^\/+/, "").split("/").slice(1).join("/") || "home";
    return p.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.html$/, "") || "home";
  }


  function wrapPrimitiveRepeat(item){
    if(item === null || item === undefined) return {};
    const t = typeof item;
    if(t === "string" || t === "number" || t === "boolean") return { text: String(item) };
    return item;
  }


  function upsertMeta(nameOrProp, value, isProp) {
    if (!value) return;
    const sel = isProp ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
    let m = document.head.querySelector(sel);
    if (!m) {
      m = document.createElement("meta");
      if (isProp) m.setAttribute("property", nameOrProp);
      else m.setAttribute("name", nameOrProp);
      document.head.appendChild(m);
    }
    m.setAttribute("content", value);
  }


  function applyTypography(data){
    const site = (data && data.site) ? data.site : {};
    const t = (site && site.typography) ? site.typography : {};
    const bodyFont = (t.body_font === "serif") ? 'Georgia,"Times New Roman",serif' : 'Arial,Helvetica,sans-serif';
    const headingFont = (t.heading_font === "sans") ? 'Arial,Helvetica,sans-serif' : 'Georgia,"Times New Roman",serif';
    const baseSize = Number(t.base_size || 16);
    const lineH = Number(t.line_height || 1.6);
    const hScale = Number(t.heading_scale || 1.0);

    let st = document.getElementById("vwTypographyStyle");
    if(!st){
      st = document.createElement("style");
      st.id = "vwTypographyStyle";
      document.head.appendChild(st);
    }
    // Apply through a single style tag (guardrailed tokens only).
    st.textContent = `
:root{
  --vw-body-font: ${bodyFont};
  --vw-heading-font: ${headingFont};
  --vw-body-size: ${baseSize}px;
  --vw-line-height: ${lineH};
  --vw-heading-scale: ${hScale};
}
body{
  font-family: var(--vw-body-font);
  font-size: var(--vw-body-size);
  line-height: var(--vw-line-height);
}
h1,h2,h3,.kicker,.card-body h3,.bio-name{
  font-family: var(--vw-heading-font);
}
h1{ font-size: calc(40px * var(--vw-heading-scale)); }
h2{ font-size: calc(34px * var(--vw-heading-scale)); }
.card-body h3{ font-size: calc(26px * var(--vw-heading-scale)); }
.kicker{ font-size: calc(28px * var(--vw-heading-scale)); }
`;
  }

  function applySEO(data) {
    const site = (data && data.site) ? data.site : {};
    const seo = (site && site.seo) ? site.seo : {};
    const title = seo.title || document.title || (site.business_name ? site.business_name : "");
    const desc = seo.description || "";
    const og = seo.og_image || "";
    if (title) document.title = title;
    if (desc) upsertMeta("description", desc, false);
    if (title) upsertMeta("og:title", title, true);
    if (desc) upsertMeta("og:description", desc, true);
    if (og) upsertMeta("og:image", og, true);
    // Basic twitter cards
    if (title) upsertMeta("twitter:title", title, false);
    if (desc) upsertMeta("twitter:description", desc, false);
    if (og) upsertMeta("twitter:image", og, false);
    upsertMeta("twitter:card", og ? "summary_large_image" : "summary", false);
  }

  function get(obj, path) {

  // Inject once: horizontal scroller utility for "What Our Clients Say"
  (function ensureClientsSayStyle(){
    if(document.getElementById("vwClientsSayStyle")) return;
    const st=document.createElement("style");
    st.id="vwClientsSayStyle";
    st.textContent = `
      section[data-cms-section="clients-say"] .grid{
        display:flex !important;
        flex-wrap:nowrap !important;
        gap:18px !important;
        overflow-x:auto !important;
        padding-bottom:8px;
        scroll-snap-type:x mandatory;
        -webkit-overflow-scrolling:touch;
      }
      section[data-cms-section="clients-say"] .grid::-webkit-scrollbar{ height:10px; }
      section[data-cms-section="clients-say"] .grid > .card{
        flex:0 0 auto;
        width:min(320px, 82vw);
        scroll-snap-align:start;
      }
    `;
    document.head.appendChild(st);
  })();
    try {
      return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
    } catch (_) {
      return undefined;
    }
  }

  const setters = {
    text(el, v) { if (v !== undefined && v !== null) el.textContent = String(v); },
    html(el, v) { if (typeof v === "string") el.innerHTML = v; },
    href(el, v) { if (typeof v === "string") el.setAttribute("href", v); },
    src(el, v) { if (typeof v === "string") el.setAttribute("src", v); },
    value(el, v) { if (v !== undefined && v !== null) el.setAttribute("value", String(v)); },
    alt(el, v) { if (typeof v === "string") el.setAttribute("alt", v); }
  };


  function normalizeLegacy(data){
    try{
      if(!data || !data.home) return;
      const home = data.home;

      function parseHtml(html){
        const doc = new DOMParser().parseFromString(String(html||""), "text/html");
        return doc;
      }
      function textOf(el){ return el ? (el.textContent||"").trim() : ""; }

      // BIO
      if(!home.bio && typeof home.bio_html === "string" && home.bio_html.trim()){
        const doc = parseHtml(home.bio_html);
        const title = textOf(doc.querySelector("h2")) || "Meet the DJ";
        const img = doc.querySelector("img");
        const nameLine = textOf(doc.querySelector(".bio-name"));
        const ps = Array.from(doc.querySelectorAll("p")).map(p=>({text: textOf(p)})).filter(p=>p.text);
        home.bio = {
          title,
          image_url: img ? (img.getAttribute("src")||"") : "",
          image_alt: img ? (img.getAttribute("alt")||"") : "",
          name_line: nameLine,
          paragraphs: ps
        };
      }

      // BRAND
      if(!home.brand && typeof home.brand_html === "string" && home.brand_html.trim()){
        const doc = parseHtml(home.brand_html);
        const title = textOf(doc.querySelector("h2")) || "The Meaning Behind Valor Wave Entertainment";
        const ps = Array.from(doc.querySelectorAll("p")).map(p=>({text: textOf(p)})).filter(p=>p.text);
        home.brand = { title, paragraphs: ps };
      }

      // CHATTANOOGA
      if(!home.chattanooga && typeof home.chattanooga_html === "string" && home.chattanooga_html.trim()){
        const doc = parseHtml(home.chattanooga_html);
        const title = textOf(doc.querySelector("h2")) || "Wedding DJ Chattanooga";
        const intro = textOf(doc.querySelector(".service-area")) || textOf(doc.querySelector("p"));
        const cards = Array.from(doc.querySelectorAll(".grid .card")).map(c=>{
          const t = textOf(c.querySelector("h3"));
          const tx = textOf(c.querySelector("p"));
          return (t||tx) ? {title:t, text:tx} : null;
        }).filter(Boolean);
        home.chattanooga = { title, intro, cards };
      }

      // HERO DISCOUNT
      if(!home.hero_discount && typeof home.hero_discount_html === "string" && home.hero_discount_html.trim()){
        const doc = parseHtml(home.hero_discount_html);
        const title = textOf(doc.querySelector("h2")) || "Hero Discount";
        const subtitle = textOf(doc.querySelector(".bio-name")) || "";
        const ps = Array.from(doc.querySelectorAll("p")).map(p=>textOf(p)).filter(Boolean);
        const text = ps[0] || "";
        const note = ps[1] || "";
        home.hero_discount = { title, subtitle, text, note };
      }

      // QUOTE BANNER
      if(!home.quote_banner && typeof home.quote_banner_html === "string" && home.quote_banner_html.trim()){
        const doc = parseHtml(home.quote_banner_html);
        const headline = textOf(doc.querySelector("div[style*='font-weight']")) || textOf(doc.querySelector("div"));
        const subtext = textOf(doc.querySelectorAll("div")[1]) || "";
        const a = doc.querySelector("a");
        const button_text = a ? textOf(a) : "Request a Quote";
        const button_url = a ? (a.getAttribute("href")||"#quote") : "#quote";
        home.quote_banner = { headline, subtext, button_text, button_url };
      }

      // TESTIMONIAL SECTION CONTENT
      if(!home.testimonial_section && typeof home.submit_testimonial_html === "string" && home.submit_testimonial_html.trim()){
        const doc = parseHtml(home.submit_testimonial_html);
        const title = textOf(doc.querySelector("h2")) || "Submit a Testimonial";
        const note = textOf(doc.querySelector("p")) || "";
        const label = textOf(doc.querySelector("label")) || "I give Valor Wave Entertainment permission to use my testimonial on the website.";
        home.testimonial_section = { title, note_text: note, permission_label: label };
      }
    }catch(_){}
  }

  function applyFieldBindings(data) {
    document.querySelectorAll("[data-cms-text]").forEach((el) => setters.text(el, get(data, el.getAttribute("data-cms-text"))));
    document.querySelectorAll("[data-cms-html]").forEach((el) => setters.html(el, get(data, el.getAttribute("data-cms-html"))));
    document.querySelectorAll("[data-cms-href]").forEach((el) => setters.href(el, get(data, el.getAttribute("data-cms-href"))));
    document.querySelectorAll("[data-cms-src]").forEach((el) => setters.src(el, get(data, el.getAttribute("data-cms-src"))));
    document.querySelectorAll("[data-cms-value]").forEach((el) => setters.value(el, get(data, el.getAttribute("data-cms-value"))));
    document.querySelectorAll("[data-cms-alt]").forEach((el) => setters.alt(el, get(data, el.getAttribute("data-cms-alt"))));

    // Conditional nodes
    document.querySelectorAll("[data-cms-if]").forEach((el) => {
      const key = el.getAttribute("data-cms-if");
      const v = get(data, key);
      const enabled = (v === true || v === "true" || v === 1 || v === "1");
      el.style.display = enabled ? "" : "none";
    });

    // FormSubmit action helpers (email -> action URL)
    document.querySelectorAll("form[data-cms-action]").forEach((form) => {
      const key = form.getAttribute("data-cms-action");
      const email = get(data, key);
      if (typeof email === "string" && email.includes("@")) {
        form.setAttribute("action", "https://formsubmit.co/" + encodeURIComponent(email));
      }
    });

    // iFrame/embed src binding (common case)
    document.querySelectorAll("iframe[data-cms-src]").forEach((ifr) => {
      const key = ifr.getAttribute("data-cms-src");
      const v = get(data, key);
      if (typeof v === "string") ifr.setAttribute("src", v);
    });
  }

  function renderRepeater(container, items) {
    const tpl = container.querySelector("template[data-cms-template]");
    if (!tpl) return;

    // Clear everything except template
    Array.from(container.children).forEach((child) => {
      if (child.tagName.toLowerCase() !== "template") child.remove();
    });

    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      item = wrapPrimitiveRepeat(item);
      if (item && (item.enabled === false || item.hidden === true)) return;
      const frag = tpl.content.cloneNode(true);

      frag.querySelectorAll("[data-cms-text]").forEach((el) => {
        const key = el.getAttribute("data-cms-text");
        if (item && item[key] !== undefined) setters.text(el, item[key]);
      });
      frag.querySelectorAll("[data-cms-html]").forEach((el) => {
        const key = el.getAttribute("data-cms-html");
        if (item && item[key] !== undefined) setters.html(el, item[key]);
      });
      frag.querySelectorAll("[data-cms-href]").forEach((el) => {
        const key = el.getAttribute("data-cms-href");
        if (item && item[key] !== undefined) setters.href(el, item[key]);
      });
      frag.querySelectorAll("[data-cms-src]").forEach((el) => {
        const key = el.getAttribute("data-cms-src");
        if (item && item[key] !== undefined) setters.src(el, item[key]);
      });
      frag.querySelectorAll("[data-cms-alt]").forEach((el) => {
        const key = el.getAttribute("data-cms-alt");
        if (item && item[key] !== undefined) setters.alt(el, item[key]);
      });

      // Optional: section-link key for visibility coupling
      frag.querySelectorAll("[data-cms-section-link-from]").forEach((el) => {
        const key = el.getAttribute("data-cms-section-link-from");
        const v = item && item[key];
        if (typeof v === "string" && v) el.setAttribute("data-cms-section-link", v);
      });

      container.appendChild(frag);
    });
  }

  function applyRepeaters(data) {
    document.querySelectorAll("[data-cms-repeat]").forEach((container) => {
      const key = container.getAttribute("data-cms-repeat");
      renderRepeater(container, get(data, key));
    });
  }

  function applyOrder(data) {
    const order = get(data, "site.section_order");
    if (!Array.isArray(order) || order.length === 0) return;

    const all = Array.from(document.querySelectorAll("[data-cms-section]"));
    if (all.length === 0) return;
    const parent = all[0].parentElement;
    if (!parent) return;

    const map = new Map();
    all.forEach(el => {
      const k = el.getAttribute("data-cms-section");
      if (k) map.set(k, el);
    });

    order.forEach(k => {
      const el = map.get(k);
      if (el && el.parentElement === parent) parent.appendChild(el);
    });
  }


  function applyHeroBackground(data){
    const url = get(data, "home.hero.image_url");
    if(!url) return;
    const hero = document.querySelector("header.hero");
    if(!hero) return;
    // store as CSS var including url(...)
    hero.style.setProperty("--hero-bg", `url("${url}")`);
  }

  // Legacy/optional: render a separate [data-cms-section="testimonials"] section if present.
  // (Your primary section is "What Our Clients Say", handled by renderClientsSay.)
  function renderTestimonials(data){
    const section = document.querySelector('[data-cms-section="testimonials"]');
    if(!section) return;
    const grid = section.querySelector(".grid");
    if(!grid) return;

    const enabled = get(data, "site.sections.testimonials");
    const items = get(data, "home.testimonials");
    if(enabled === false || !Array.isArray(items) || items.length === 0){
      section.style.display = "none";
      return;
    }
    section.style.display = "";
    grid.innerHTML = "";

    items.forEach(t=>{
      const card = document.createElement("div");
      card.className = "card";
      const name = escapeHtml(t.name || "");
      const role = escapeHtml(t.event || "");
      const text = escapeHtml(t.text || "");
      const rating = (t.rating ? String(t.rating) : "");
      const n = parseInt(rating,10);
      const stars = (n && n>0) ? "★".repeat(Math.max(0, Math.min(5, n))) : "";
      card.innerHTML = `
        <div class="card-body">
          <div style="display:flex;gap:10px;align-items:baseline;justify-content:space-between;flex-wrap:wrap">
            <div style="font-weight:900">${name || "Anonymous"}</div>
            <div style="color:var(--gray);font-size:13px">${stars}</div>
          </div>
          ${role ? `<div style="color:var(--gray);font-size:13px;margin-top:4px">${role}</div>` : ``}
          <p style="margin-top:12px;line-height:1.6">${text}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }




  function renderClientsSay(data){
    const section = document.querySelector('[data-cms-section="clients-say"]');
    if(!section) return;
    const enabled = get(data, "site.sections.clients-say");
    if(enabled === false){ section.style.display = "none"; return; }
    section.style.display = "";

    // Optional: update the H2 if admin changes title
    const h2 = section.querySelector("h2");
    const title = get(data, "home.clients_say_section.title");
    if(h2 && title) h2.textContent = title;

    const items = get(data, "home.clients_say");
    const grid = section.querySelector(".grid");
    if(!grid) return;

    if(!Array.isArray(items) || items.length === 0){
      // No CMS items: keep existing HTML as-is
      return;
    }

    grid.innerHTML = "";
    items.forEach(it=>{
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-body">
          <p>${escapeHtml(it.text || "")}</p>
          <strong>- ${escapeHtml(it.name || "")}</strong>
        </div>`;
      grid.appendChild(card);
    });
  }

  function applyVisibility(data) {
    const sections = get(data, "site.sections");
    if (!sections || typeof sections !== "object") return;

    Object.keys(sections).forEach((key) => {
      const raw = sections[key];
      const enabled = (raw === true || raw === "true" || raw === 1 || raw === "1");
      document.querySelectorAll('[data-cms-section="' + key + '"]').forEach((el) => (el.style.display = enabled ? "" : "none"));

      // Keep quote CTAs visible even when the on-page quote section is disabled (they may be external portal links)
      if(key === "quote"){
        document.querySelectorAll('[data-cms-section-link="quote"]').forEach((el)=>{ el.style.display=""; });
        return;
      }

      document.querySelectorAll('[data-cms-section-link="' + key + '"]').forEach((el) => {
        // Only auto-hide "section-link" elements when they are actually linking to an on-page section (hash links).
        // External links should not be hidden when a section is disabled.
        const href = (el.getAttribute && el.getAttribute("href")) || "";
        const isHash = href.startsWith("#") || href === "" || href.startsWith(window.location.pathname + "#") || href.startsWith(window.location.href.split("#")[0] + "#");
        if (!isHash) return; // keep visible
        el.style.display = enabled ? "" : "none";
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderDynamicSections(data) {
    const key = document.querySelector("[data-cms-dynamic]")?.getAttribute("data-cms-dynamic");
    if (!key) return;
    const host = document.querySelector('[data-cms-dynamic="' + key + '"]');
    if (!host) return;

    const sections = get(data, key);
    if (!Array.isArray(sections)) return;

    host.innerHTML = "";
    sections.forEach((s) => {
      if (!s || (s.enabled === false)) return;
      const type = s.type || "text";
      const id = s.id ? String(s.id) : "";
      const label = s.label ? String(s.label) : type;

      const wrap = document.createElement("section");
      wrap.className = "card";
      if (id) wrap.id = id;
      wrap.setAttribute("data-cms-section", id || "");
      wrap.style.margin = "24px auto";
      wrap.style.maxWidth = "1100px";
      wrap.style.padding = "18px";

      if (type === "text") {
        wrap.innerHTML = `<h2 style="margin:0 0 10px 0">${escapeHtml(s.title || label)}</h2><div>${s.html || ""}</div>`;
      } else if (type === "cta") {
        const btn = s.button || {};
        wrap.innerHTML = `<h2 style="margin:0 0 10px 0">${escapeHtml(s.title || label)}</h2>
          <p style="margin:0 0 14px 0">${escapeHtml(s.text || "")}</p>
          <a class="btn" href="${escapeHtml(btn.url || "#")}" target="${escapeHtml(btn.target || "_self")}">${escapeHtml(btn.text || "Learn more")}</a>`;
      } else if (type === "image_text") {
        const img = s.image || {};
        wrap.innerHTML = `<div class="bio-wrap" style="grid-template-columns: 220px 1fr;">
          <div><img class="bio-image" src="${escapeHtml(img.url || "")}" alt="${escapeHtml(img.alt || "")}" style="width:100%;height:auto;border-radius:14px"/></div>
          <div><h2 style="margin:0 0 10px 0">${escapeHtml(s.title || label)}</h2><div>${s.html || ""}</div></div>
        </div>`;
      } else if (type === "pricing") {
        const plans = Array.isArray(s.plans) ? s.plans : [];
        const cards = plans.map(p => `<div class="card" style="padding:14px;">
            <h3 style="margin:0 0 6px 0">${escapeHtml(p.name || "")}</h3>
            <p style="margin:0 0 10px 0;font-weight:700">${escapeHtml(p.price || "")}</p>
            <div style="color:var(--muted)">${escapeHtml(p.details || "")}</div>
          </div>`).join("");
        wrap.innerHTML = `<h2 style="margin:0 0 10px 0">${escapeHtml(s.title || "Pricing")}</h2>
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));gap:12px;">${cards}</div>`;
      } else {
        // fallback
        wrap.innerHTML = `<h2 style="margin:0 0 10px 0">${escapeHtml(s.title || label)}</h2><div>${s.html || ""}</div>`;
      }

      host.appendChild(wrap);
    });
  }

  async function run() {
    const slug = pageSlug();
    try {
      const sp = new URLSearchParams(location.search);
      const preview = sp.get("vw_preview") === "1";
      const res = await fetch(
        CMS_ENDPOINT + "?slug=" + encodeURIComponent(slug) + (preview ? "&vw_preview=1" : ""),
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      // Theme + layout must be applied before bindings so the page paints correctly.
      applyTheme(data?.site?.theme);
      applyThemedLogo(data);
      applyLayoutControls(data?.site?.layout);
      applySectionOverrides(data?.site?.section_overrides);
      try { applySEO(data); } catch (e) {}
      try { applyTypography(data); } catch (e) {}
      applyRepeaters(data);
      renderDynamicSections(data);
      applyVisibility(data);
    renderTestimonials(data);
    renderClientsSay(data);
    applyHeroBackground(data);
    applyOrder(data);
      normalizeLegacy(data);
    applyFieldBindings(data);
    } catch (_) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
