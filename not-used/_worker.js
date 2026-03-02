// Valor Wave Entertainment - Cloudflare Pages Worker (Option B)
// - Serves /admin (secure)
// - Provides /api/cms/page (GET/PUT) + /api/cms/login/logout
// - Stores content in KV namespace binding: CMS

const COOKIE_NAME = "vw_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

// --- Draft/Publish + Revision History (P0 governance) ---
const HISTORY_KEEP = 10;

function isTruthy(v){
  const s = String(v ?? "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function nowIso(){
  return new Date().toISOString();
}

function getClientIp(request){
  try{
    return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
  }catch{ return ""; }
}

async function isAuthed(request, env){
  const sessionSecret = env.SESSION_SECRET || "";
  const token = getCookie(request, COOKIE_NAME);
  return !!(sessionSecret && (await verifySessionToken(sessionSecret, token)));
}

function siteKeys(){
  return { draft: "site:global:draft", published: "site:global:published" };
}

function pageKeys(slug){
  return {
    draft: `page:${slug}:draft`,
    published: `page:${slug}:published`,
    legacy: `page:${slug}`,
    historyIndex: `history:${slug}`
  };
}

function revKey(slug, id){
  return `rev:${slug}:${id}`;
}

function safeJsonParse(raw, fallback){
  try{ return raw ? JSON.parse(raw) : fallback; }catch{ return fallback; }
}

function validateCmsPayload(payload){
  // P0: prevent accidental KV corruption. Strict-ish allowlist + type checks.
  if(!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok:false, error:"Payload must be an object" };
  const allowedTop = new Set(["site","home","thankyou","section_order","sections","dynamic_sections","testimonials","testimonials_section","testimonial_section","quote_banner","hero_discount","service_area","brand","bio","chattanooga","calendar","faqs","services","hero","clients_say","clients_say_section"]);
  for(const k of Object.keys(payload)){
    if(!allowedTop.has(k)) return { ok:false, error:`Unknown top-level key: ${k}` };
  }
  if(payload.site !== undefined){
    if(typeof payload.site !== "object" || payload.site === null || Array.isArray(payload.site)) return { ok:false, error:"site must be an object" };
    if(payload.site.header && (typeof payload.site.header !== "object" || payload.site.header === null)) return { ok:false, error:"site.header must be an object" };
    if(payload.site.header && payload.site.header.nav_links && !Array.isArray(payload.site.header.nav_links)) return { ok:false, error:"site.header.nav_links must be an array" };
    if(payload.site.footer && (typeof payload.site.footer !== "object" || payload.site.footer === null)) return { ok:false, error:"site.footer must be an object" };
    if(payload.site.sections && (typeof payload.site.sections !== "object" || payload.site.sections === null || Array.isArray(payload.site.sections))) return { ok:false, error:"site.sections must be an object" };
    if(payload.site.section_order && !Array.isArray(payload.site.section_order)) return { ok:false, error:"site.section_order must be an array" };
  }
  // minimal checks for common page containers
  if(payload.home !== undefined && (typeof payload.home !== "object" || payload.home === null || Array.isArray(payload.home))) return { ok:false, error:"home must be an object" };
  if(payload.dynamic_sections !== undefined && !Array.isArray(payload.dynamic_sections)) return { ok:false, error:"dynamic_sections must be an array" };
  return { ok:true };
}


// --- Simple Analytics (KV) ---
function isPageLikeRequest(req, path) {
  if (req.method !== "GET") return false;
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/admin")) return false;
  // Skip obvious assets
  if (/\.(css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|pdf|woff2?|ttf|eot)$/i.test(path)) return false;
  return true;
}
function isoDay(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
async function trackPageView(env, path) {
  try {
    const key = `stats:pv:${isoDay()}`;
    const raw = await env.CMS.get(key);
    let obj = null;
    try { obj = raw ? JSON.parse(raw) : null; } catch { obj = null; }
    if (!obj || typeof obj !== "object") obj = { total: 0, paths: {} };
    obj.total = (obj.total || 0) + 1;
    obj.paths = obj.paths && typeof obj.paths === "object" ? obj.paths : {};
    obj.paths[path] = (obj.paths[path] || 0) + 1;
    await env.CMS.put(key, JSON.stringify(obj));
  } catch (e) {
    // never break the site for analytics
  }
}



function deepMerge(base, override) {
  if (override === null || override === undefined) return base;
  if (Array.isArray(base) && Array.isArray(override)) return override; // arrays fully overridden
  if (typeof base !== "object" || base === null) return override;
  if (typeof override !== "object" || override === null) return override;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    out[k] = deepMerge(base[k], override[k]);
  }
  return out;
}

function defaultPageData(slug) {
  // Defaults mirror the static site so CMS works immediately.
  const baseSite = {
    business_name: "Valor Wave Entertainment",
    logo_url: "logo.png",
    social: {
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/",
      x: "https://x.com/ValorwaveEnt"
    },
    header: {
      nav_links: [
        { label: "Services", url: "#services", section_key: "services" },
        { label: "Availability", url: "#calendar", section_key: "calendar" },
        { label: "Hero Discount", url: "#hero-discount", section_key: "hero-discount" },
        { label: "Request a Quote", url: "#quote", section_key: "quote" }
      ]
    },
    footer: {
      copyright: "© 2026 Valor Wave Entertainment",
      tagline: "Faith-Based Wedding & Event DJ | Southeast TN & Northwest GA",
      phone_label: "Phone:",
      phone_text: "(423) 680-2700",
      phone_href: "tel:+14236802700",
      email_label: "Email:",
      email_text: "valorwaveentertainment@gmail.com",
      email_href: "mailto:valorwaveentertainment@gmail.com",
      address: "Address: 5424 School Dr, Hixson, TN 37343"
    },
    forms: {
      quote: {
        email: "valorwaveentertainment@gmail.com",
        subject: "New DJ Quote Request - Valor Wave Entertainment",
        template: "table",
        replyto: "valorwaveentertainment@gmail.com",
        autoresponse:
          "Thank you for reaching out to Valor Wave Entertainment! We have received your request and will be in touch within 24 hours (often sooner). If you have additional details, feel free to reply to this email. We look forward to honoring your event.",
        next: "https://valorwaveentertainment.com/thank-you.html",
        submit_text: "Send Request"
      },
      testimonial: {
        email: "valorwaveentertainment@gmail.com",
        next: "https://valorwaveentertainment.com/testimonial-thank-you.html",
        submit_text: "Submit Testimonial"
      }
    },
    // Section enable/disable switches (checkboxes map 1:1 to these keys)
    sections:{
      "hero": true,
        "services": true,
      "bio": true,
      "chattanooga-wedding-dj": true,
      "brand-meaning": true,
      "hero-discount": true,
      "calendar": true,
      "quote-banner": true,
      "quote": true,
      "submit-testimonial": true,
      "footer": true,
      "footer-social": true,
      "header-social": true
    ,"testimonials":true},
    section_order: ["services","bio","chattanooga-wedding-dj","brand-meaning","hero-discount","calendar","quote-banner","quote","testimonials","submit-testimonial","footer"]
    ,
    // THEME + BRANDING (site-wide)
    // Presets map to CSS variables used by the static template (see index.html :root)
    // NOTE: Logos are URLs. Use /media/... if you upload themed logos to R2.
    theme: {
      preset: "original", // original | patriotic | acu
      // If set, palette overrides the preset defaults.
      palette: {},
      // Logos per preset. Default uses current logo.png.
      // For 3D logos everywhere (your preference), upload the 3D transparents to R2 and paste URLs here.
      logos: {
        original: { url: "logo.png", label: "Original" },
        patriotic: { url: "", label: "Patriotic" },
        acu: { url: "", label: "Army ACU" }
      },
      logo_mode: "3d" // 2d | 3d (admin default)
    }
  };

  if (slug === "home") {
    return {
      site: baseSite,
      home: {
        hero: {
          kicker: "Veteran-owned • Faith-based",
          headline: "Premium DJ & MC Services in Chattanooga",
          tagline: "Clean music • Professional sound • Confident MC",
          subline: "Serving Southeast TN & Northwest GA",
          button: { text: "Request a Quote", url: "#quote" }
        },
        services: [
          { title: "Weddings", text: "Ceremony + reception DJ/MC, timeline coordination, and clean mixes.", image: "/images/service-wedding.jpg", alt: "Wedding DJ service" },
          { title: "DJ + MC", text: "Confident mic work, announcements, and energy without cringe.", image: "/images/service-dj-mc.jpg", alt: "DJ and MC service" },
          { title: "Sound + Lighting", text: "Pro audio, wireless mics, uplighting, and dance floor lighting.", image: "/images/service-sound-lighting.jpg", alt: "Sound and lighting" },
          { title: "Corporate + Schools", text: "Corporate events, school dances, and community events.", image: "/images/service-corporate.jpg", alt: "Corporate DJ service" }
        ],
        service_area: { title: "Serving Your Area", html: "Valor Wave Entertainment proudly serves weddings and events throughout <strong>Southeast Tennessee</strong>, including Chattanooga and Cleveland, as well as <strong>Northwest Georgia</strong> communities such as Dalton, Ringgold, and Fort Oglethorpe. Travel outside these areas may be available upon request." },
        faqs: [
          { q: "Do you provide clean music?", a: "Yes — we keep the vibe fun and event-appropriate with clean versions when needed." },
          { q: "How far do you travel?", a: "Chattanooga-based; travel is available with advance notice. Add details in the form and we’ll confirm." },
          { q: "What’s included?", a: "DJ/MC, pro sound, planning support, and optional lighting. Final details depend on your event." }
        ],
        calendar: {
          embed_url: "https://calendar.google.com/calendar/embed?src=valorwaveentertainment%40gmail.com&ctz=America%2FNew_York"
        },

        
        bio: {
          title: "Meet the DJ",
          image_url: "images/dj-portrait-sam.jpg",
          image_alt: "Sam Massengale - Founder & DJ",
          name_line: "Sam Massengale – Founder & DJ",
          paragraphs: ["Hello! My name is Sam Massengale, and I\u2019ve proudly called Chattanooga home my entire life. I served over 12 years in the United States Army and hold a Master\u2019s Degree from Belhaven University. I am blessed with a wonderful wife and four amazing boys.", "Alongside my wife, I decided it was time to turn our passion for music and singing into something special \u2014 and that\u2019s how Valor Wave Entertainment was born. With over 12 years of DJ experience across weddings, corporate events, and community celebrations, I bring professionalism, creativity, and heart to every event.", "Guided by our loving Father and Jesus Christ, our mission is simple: to provide a worry-free, faith-based, unforgettable experience. We look forward to honoring every moment \u2014 and all heroes \u2014 while creating memories that last a lifetime."]
        },
        brand: {
          title: "The Meaning Behind Valor Wave Entertainment",
          paragraphs: ["Valor Wave Entertainment represents the powerful blend of honor, service, and celebration. Valor reflects courage, sacrifice, and respect for those who serve \u2014 our military, veterans, first responders, healthcare workers, educators, and everyday heroes in our communities.", "The word Wave symbolizes movement, energy, and the moments that bring people together. Just like a wave, music carries emotion, creates connection, and leaves a lasting impact long after the event ends.", "Together, Valor Wave Entertainment stands for honoring what matters most while creating unforgettable, joy-filled experiences \u2014 all delivered with professionalism, integrity, and faith-based values."]
        },
        chattanooga: {
          title: "Wedding DJ Chattanooga",
          intro: "Looking for a wedding DJ in Chattanooga who brings modern energy with faith-based values? Valor Wave Entertainment provides DJ + MC services, sound, and lighting for weddings and events across Southeast Tennessee and Northwest Georgia. We focus on clear communication, clean music options, and a smooth, stress-free experience from ceremony to last dance.",
          cards: [{"title": "What you get", "text": "Professional planning, timeline support, reliable equipment, and a confident MC\u2014so your day stays on track."}, {"title": "Where we serve", "text": "Chattanooga, Cleveland, Hixson, and nearby communities\u2014plus Northwest GA including Ringgold, Fort Oglethorpe, and Dalton."}, {"title": "Faith-based option", "text": "We can tailor music to your preferences and venue guidelines while keeping the atmosphere fun and welcoming."}]
        },
        hero_discount: {
          title: "Hero Discount",
          subtitle: "We Honor All Heroes",
          text: "We proudly offer a Hero Discount for active-duty military, veterans, first responders, healthcare workers, and teachers. Mention it in your quote request and we\u2019ll apply it to qualifying events.",
          note: "Proof of service may be requested. Discount amount varies by package and date availability."
        },
        quote_banner: {
          headline: "Ready to lock in your date?",
          subtext: "Request a quote and we\u2019ll confirm availability quickly.",
          button_text: "Request a Quote",
          button_url: "#quote"
        },
        testimonial_section: {
          title: "Submit a Testimonial",
          permission_label: "I give Valor Wave Entertainment permission to use my testimonial on the website.",
          note_text: "Thank you—your feedback helps future couples and clients book with confidence."
        },
        testimonials_section: {
          title: "Testimonials",
          subtitle: "Real feedback from couples and clients."
        },
        testimonials: [],
dynamic_sections: [
          // New sections can be added via /admin
          // Example:
          // { id:"custom-cta", label:"Custom CTA", type:"cta", enabled:true, title:"Ready to book?", text:"Tell us about your event.", button:{text:"Request a Quote", url:"#quote"} }
        ]
      }
    };
  }

  if (slug === "thank-you") {
    return { site: baseSite, thankyou: { headline: "Thank you for your submission!", message_html: "We received your request and will follow up soon." } };
  }

  if (slug === "testimonial-thank-you") {
    return { site: baseSite, thankyou: { headline: "Thank you!", message_html: "We appreciate your testimonial." } };
  }

  return { site: baseSite };
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function html(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function badRequest(msg = "Bad request") {
  return json({ ok: false, error: msg }, { status: 400 });
}

function unauthorized(msg = "Unauthorized") {
  return json({ ok: false, error: msg }, { status: 401 });
}

function forbidden(msg = "Forbidden") {
  return json({ ok: false, error: msg }, { status: 403 });
}

function noCache(headers = {}) {
  return {
    "cache-control": "no-store, max-age=0",
    ...headers,
  };
}

function base64url(bytes) {
  const bin = String.fromCharCode(...bytes);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

function base64urlToBytes(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

async function makeSessionToken(sessionSecret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = JSON.stringify({ exp });
  const payloadB64 = base64url(new TextEncoder().encode(payload));
  const sig = await hmacSha256(sessionSecret, payloadB64);
  const sigB64 = base64url(sig);
  return `${payloadB64}.${sigB64}`;
}

async function verifySessionToken(sessionSecret, token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  try {
    const expectedSig = await hmacSha256(sessionSecret, payloadB64);
    const givenSig = base64urlToBytes(sigB64);
    if (givenSig.length !== expectedSig.length) return false;
    // constant-time compare
    let diff = 0;
    for (let i = 0; i < givenSig.length; i++) diff |= givenSig[i] ^ expectedSig[i];
    if (diff !== 0) return false;

    const payloadJson = new TextDecoder().decode(base64urlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload.exp !== "number") return false;
    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === name) return v;
  }
  return null;
}

function setCookieHeader(token) {
  // Secure + HttpOnly recommended; SameSite=Lax allows normal nav
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function readJson(request) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}


function adminHtml() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Valor Wave Admin</title>
<style>
:root{--navy:#0F172A;--gold:#D4AF37;--bg:#0b1220;--card:#0f1a34;--text:#e5e7eb;--muted:#9ca3af;--border:rgba(255,255,255,.14);--ok:#22c55e}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:linear-gradient(180deg,#0b1220,#071227);color:var(--text)}
header{position:sticky;top:0;background:var(--admin-header,var(--navy));background:color-mix(in srgb, var(--admin-header,var(--navy)) 92%, transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);z-index:20}
.wrap{max-width:1100px;margin:0 auto;padding:14px 16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
h1{margin:0;font-size:18px}
.pill{font-size:12px;color:var(--muted);border:1px solid var(--border);padding:6px 10px;border-radius:999px}
.card{background:rgba(15,26,52,.92);border:1px solid var(--border);border-radius:14px;padding:14px;margin:14px 0}
label{display:block;font-size:12px;color:var(--muted);margin:0 0 6px}
input, textarea, select{width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:rgba(2,6,23,.6);color:var(--text);outline:none}
textarea{min-height:90px;resize:vertical}
.grid{display:block!important}
.grid>*{width:100%!important;display:block!important;margin:0 0 12px!important}
.btn{background:linear-gradient(180deg,#D4AF37,#b89022);color:#071227;border:0;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer}
.btn.secondary{background:transparent;color:var(--text);border:1px solid var(--border)}
.btn.danger{background:transparent;color:#fecaca;border:1px solid rgba(239,68,68,.5)}
.muted{color:var(--muted)}
.small{font-size:12px}
.list{display:flex;flex-direction:column;gap:10px}
.item{border:1px solid var(--border);border-radius:12px;padding:10px;background:rgba(2,6,23,.35)}
.itemhead{display:flex;align-items:center;justify-content:space-between;gap:10px}
.k{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#93c5fd}
hr{border:0;border-top:1px solid var(--border);margin:12px 0}
.stickybar{position:sticky;bottom:0;background:rgba(11,18,32,.92);backdrop-filter:blur(8px);border-top:1px solid var(--border);padding:12px 16px}
.hidden{display:none}

.thumb{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:rgba(2,6,23,.35);cursor:pointer}
.thumb img{width:100%;height:110px;object-fit:cover;display:block}
.thumb .cap{padding:8px;font-size:12px;color:var(--muted);word-break:break-all}
.previewWrap{margin-top:8px}
.previewWrap img{max-width:220px;max-height:140px;border:1px solid var(--border);border-radius:12px;display:block}
</style>
</head>
<body>
<header>
  <div class="wrap row">
    <div class="row" style="gap:12px">
      <h1>Valor Wave Admin <span class="pill">v68</span></h1>
      <span id="statusPill" class="pill">Loading…</span>
    </div>
    <div class="row" style="gap:10px">
      <select id="pageSelect">
        <option value="home">Home</option>
        <option value="thank-you">Thank You</option>
        <option value="testimonial-thank-you">Testimonial Thank You</option>
      </select>
      <button class="btn secondary" id="previewBtn" type="button">Preview Site</button>
      <button class="btn secondary" id="duplicateBtn" type="button">Duplicate Page</button>
      <button class="btn secondary" id="logoutBtn" type="button">Log out</button>
    </div>
  </div>
</header>

<div class="wrap">
  <div id="loginCard" class="card hidden">
    <h2 style="margin:0 0 10px 0">Admin Login</h2>
    <p class="muted small" style="margin:0 0 12px 0">Enter your admin password.</p>
    <label>Password</label>
    <input id="pw" type="password" placeholder="Admin password">
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
      <button class="btn" id="loginBtn" type="button">Log in</button>
      <span id="loginMsg" class="muted small"></span>
    </div>
  </div>

  <div id="app" class="hidden">

    <div class="card">
      <h2 style="margin:0 0 10px 0">Site Globals</h2>
      <p class="muted small" style="margin:0 0 10px 0">These values apply across the site. Click <strong>Sync Defaults</strong> to repopulate from the site template.</p>
      <button class="btn secondary" id="syncBtn" type="button">Sync Defaults</button>
      <div style="height:10px"></div>
      <div class="grid">
        <div><label>Business Name</label><input data-bind="site.business_name"></div>
        <div><label>Logo URL</label><input data-bind="site.logo_url"></div>
        <div><label>Facebook URL</label><input data-bind="site.social.facebook"></div>
        <div><label>Instagram URL</label><input data-bind="site.social.instagram"></div>
        <div><label>X URL</label><input data-bind="site.social.x"></div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin:0 0 10px 0">Header Navigation</h2>
      <p class="muted small" style="margin:0 0 12px 0">Add / remove / reorder nav links. <span class="k">section_key</span> ties a link to a section checkbox so it hides when that section is disabled.</p>
      <div id="navLinks" class="list"></div>
      <button class="btn secondary" id="addNavLinkBtn" type="button">Add nav link</button>
    </div>

    <div class="card">
      <h2 style="margin:0 0 10px 0">Footer</h2>
      <div class="grid">
        <div><label>Footer Logo URL</label><input data-bind="site.logo_url"></div>
        <div><label>Copyright</label><input data-bind="site.footer.copyright"></div>
        <div><label>Tagline</label><input data-bind="site.footer.tagline"></div>
        <div><label>Phone label</label><input data-bind="site.footer.phone_label"></div>
        <div><label>Phone text</label><input data-bind="site.footer.phone_text"></div>
        <div><label>Phone link (tel:)</label><input data-bind="site.footer.phone_href"></div>
        <div><label>Email label</label><input data-bind="site.footer.email_label"></div>
        <div><label>Email text</label><input data-bind="site.footer.email_text"></div>
        <div><label>Email link (mailto:)</label><input data-bind="site.footer.email_href"></div>
        <div><label>Address</label><input data-bind="site.footer.address"></div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin:0 0 10px 0">Forms</h2>
      <div class="grid">
        <div><label>RFQ Email (FormSubmit)</label><input data-bind="site.forms.quote.email"></div>
        <div><label>RFQ Subject</label><input data-bind="site.forms.quote.subject"></div>
        <div><label>RFQ Template</label><input data-bind="site.forms.quote.template"></div>
        <div><label>RFQ Reply-To</label><input data-bind="site.forms.quote.replyto"></div>
        <div><label>RFQ Autoresponse</label><textarea data-bind="site.forms.quote.autoresponse"></textarea></div>
        <div><label>RFQ Redirect URL (_next)</label><input data-bind="site.forms.quote.next"></div>
        <div><label>RFQ Submit Button Text</label><input data-bind="site.forms.quote.submit_text"></div>
        <hr>
        <div><label>Testimonial Email (FormSubmit)</label><input data-bind="site.forms.testimonial.email"></div>
        <div><label>Testimonial Redirect URL (_next)</label><input data-bind="site.forms.testimonial.next"></div>
        <div><label>Testimonial Submit Button Text</label><input data-bind="site.forms.testimonial.submit_text"></div>
      </div>
    </div>

    <div id="pageEditor"></div>


    <div class="card">
      <h2 style="margin:0 0 10px 0">Image Upload</h2>
      <p class="muted small" style="margin:0 0 12px 0">Upload an image to Cloudflare R2. You will get a URL you can paste into any image field.</p>
      <div class="grid">
        <div><label>Select image</label><input id="uploadFile" type="file" accept="image/*"></div>
        <div><label>Folder (optional)</label><input id="uploadFolder" placeholder="uploads"></div>
        <div><button class="btn" id="uploadBtn" type="button">Upload to R2</button></div>
        <div><label>Uploaded URL</label><input id="uploadUrl" readonly></div>
      </div>
    </div>
    <div class="card" id="sec-media">
      <h2 style="margin:0 0 10px 0">Media Library</h2>
      <p class="muted small" style="margin:0 0 12px 0">Browse images already uploaded to R2. Click a thumbnail to copy its URL.</p>
      <div class="grid">
        <div><label>Folder / Prefix</label><input id="mediaPrefix" placeholder="images" value="images"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn secondary" id="mediaRefreshBtn" type="button">Refresh</button>
          <button class="btn secondary" id="mediaMoreBtn" type="button">Load more</button>
        </div>
        <div><label>Selected URL</label><input id="mediaSelectedUrl" readonly></div>
      </div>
      <div id="mediaGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:12px"></div>
      <div class="muted small" id="mediaMsg" style="margin-top:10px"></div>
    </div>



    <div class="card" id="sec-visibility">
      <h2 style="margin:0 0 10px 0">Section Visibility</h2>
      <p class="muted small" style="margin:0 0 12px 0">Drag sections to reorder how they appear on the homepage. Toggle Enabled to hide/show.</p>
      <p class="muted small" style="margin:0 0 12px 0">Each checkbox maps 1:1 to <span class="k">site.sections.&lt;key&gt;</span> and <span class="k">data-cms-section="&lt;key&gt;"</span>.</p>
      <div id="sectionsGrid" class="grid"></div>
    </div>

  </div>
</div>

<div class="stickybar">
  <div class="wrap row">
    <div class="muted small" id="saveMsg">No changes.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn" id="saveBtn" type="button">Save changes</button>
    </div>
  </div>
</div>

    <script src="/admin.js?v=76.6.0"></script>
</body>
</html>`;
}


function normalizeSlug(s) {
  const slug = String(s || "").trim().toLowerCase();
  if (!slug) return "home";
  // only allow safe slugs
  return slug.replace(/[^a-z0-9\-]/g, "") || "home";
}


// Build a safe default "page:home" object for CMS KV.
// This matches the structure the admin expects.
function defaultHomePageData() {
  // If a full default CMS blob builder exists, prefer it.
  try {
    if (typeof DEFAULT_CMS === "object" && DEFAULT_CMS) {
      return JSON.parse(JSON.stringify(DEFAULT_CMS));
    }
  } catch (_) {}

  // Minimal safe fallback (covers admin + renderers)
  return {
    site: {
      business_name: "Valor Wave Entertainment",
      logo_url: "/logo.png",
      social: { facebook:"", instagram:"", x:"" },
      header: { nav_links: [
        { label:"Services", url:"#services", section_key:"services" },
        { label:"Availability", url:"#calendar", section_key:"calendar" },
        { label:"Hero Discount", url:"#hero-discount", section_key:"hero-discount" },
        { label:"Request a Quote", url:"#quote", section_key:"quote" },
      ]},
      footer: {
        copyright: "© 2026 Valor Wave Entertainment",
        tagline: "Faith-Based Wedding & Event DJ | Southeast TN & Northwest GA",
        phone_label: "Phone:",
        phone_text: "(423) 680-2700",
        phone_href: "tel:+14236802700",
        email_label: "Email:",
        email_text: "valorwaveentertainment@gmail.com",
        email_href: "mailto:valorwaveentertainment@gmail.com",
        address: "Address: 5424 School Dr, Hixson, TN 37343"
      },
      forms: {
        quote: {
          email:"valorwaveentertainment@gmail.com",
          subject:"New DJ Quote Request - Valor Wave Entertainment",
          template:"table",
          replyto:"valorwaveentertainment@gmail.com",
          autoresponse:"Thank you for reaching out to Valor Wave Entertainment! We have received your request and will be in touch within 24 hours (often sooner). If you have additional details, feel free to reply to this email. We look forward to honoring your event.",
          next:"https://valorwaveentertainment.com/thank-you.html",
          submit_text:"Send Request"
        },
        testimonial: {
          email:"valorwaveentertainment@gmail.com",
          next:"https://valorwaveentertainment.com/testimonial-thank-you.html",
          submit_text:"Submit Testimonial"
        }
      },
      sections: {
        "services": true,
        "service-area": true,
        "bio": true,
        "chattanooga-wedding-dj": true,
        "brand-meaning": true,
        "hero-discount": true,
        "clients-say": true,
        "calendar": true,
        "quote-banner": true,
        "quote": true,
        "submit-testimonial": true,
        "footer": true,
        "footer-social": true,
        "header-social": true
      }
    },
    home: {
      hero: {
        kicker:"Veteran-owned • Faith-based",
        headline:"Premium DJ & MC Services in Chattanooga",
        tagline:"Clean music • Professional sound • Confident MC",
        subline:"Serving Southeast TN & Northwest GA",
        button:{ text:"Request a Quote", url:"#quote" }
      },
      services: [
        { title:"Weddings", text:"Ceremony + reception DJ/MC, timeline coordination, and clean mixes.", image:"/images/service-wedding.jpg", alt:"Wedding DJ service" },
        { title:"DJ + MC", text:"Confident mic work, announcements, and energy without cringe.", image:"/images/service-dj-mc.jpg", alt:"DJ and MC service" },
        { title:"Sound + Lighting", text:"Pro audio, wireless mics, uplighting, and dance floor lighting.", image:"/images/service-sound-lighting.jpg", alt:"Sound and lighting" },
        { title:"Corporate + Schools", text:"Corporate events, school dances, and community events.", image:"/images/service-corporate.jpg", alt:"Corporate DJ service" },
      ],
        service_area: { title: "Serving Your Area", html: "Valor Wave Entertainment proudly serves weddings and events throughout <strong>Southeast Tennessee</strong>, including Chattanooga and Cleveland, as well as <strong>Northwest Georgia</strong> communities such as Dalton, Ringgold, and Fort Oglethorpe. Travel outside these areas may be available upon request." },
        faqs: [],
      calendar: { embed_url:"" },
      bio: {
        image_url: "/images/dj-portrait-sam.jpg",
        image_alt: "Sam Massengale – Founder & DJ",
        name_line: "Sam Massengale – Founder & DJ",
        paragraphs: []
      },
      brand: { paragraphs: [] },
      chattanooga: { paragraphs: [] },
      hero_discount: { title:"Hero Discount", subtitle:"", text:"", note:"" },
      quote_banner: { headline:"Ready to lock in your date?", subtext:"Request a quote and we’ll confirm availability quickly.", button_text:"Request a Quote", button_url:"#quote" },
      clients_say_section: { title:"What Our Clients Say" },
      clients_say: [
        { name:"Sarah M.", text:"\"Valor Wave Entertainment made our wedding absolutely perfect. Professional, faith-centered, and fun!\"" },
        { name:"James & Emily", text:"\"Sam was incredible. From ceremony to reception, everything was smooth and stress-free.\"" },
        { name:"Pastor David R.", text:"\"Highly recommend for church and community events. Clean music and great energy.\"" }
      ]
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Ensure KV is bound
    if (!env.CMS) {
      return json({ ok: false, error: "KV binding 'CMS' is not configured." }, { status: 500, headers: noCache() });
    }


    // Dynamic landing pages: /p/<slug> renders index.html but loads CMS slug <slug>
    if (request.method === "GET" && path.startsWith("/p/") && path.length > 3) {
      // Track as a page view
      if (isPageLikeRequest(request, path)) ctx.waitUntil(trackPageView(env, path));
      const u = new URL(request.url);
      u.pathname = "/index.html";
      const resp = await env.ASSETS.fetch(new Request(u.toString(), request));
      // Force HTML
      const h = new Headers(resp.headers);
      h.set("content-type", "text/html; charset=utf-8");
      return new Response(await resp.text(), { status: resp.status, headers: h });
    }

    // Admin UI (GET only)
    if (path === "/admin" || path === "/admin/") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      // Always serve the UI; it will check session and show login if needed.
      return html(adminHtml(), { status: 200, headers: noCache() });
    }

    // Session status endpoint
    if (path === "/api/cms/session") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return json({ ok:false, error:"Not logged in" }, { status: 200, headers: noCache() });
return json({ ok: true }, { headers: noCache() });
    }


    // Analytics (requires login)
    if (path === "/api/cms/stats") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      const url2 = new URL(request.url);
      const days = Math.min(60, Math.max(1, parseInt(url2.searchParams.get("days") || "30", 10) || 30));
      const now = new Date();
      // Build list of days (UTC) back from today
      const out = { ok: true, days, total: 0, byPath: {}, daily: [] };
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = `stats:pv:${isoDay(d)}`;
        const raw = await env.CMS.get(key);
        let obj = null;
        try { obj = raw ? JSON.parse(raw) : null; } catch { obj = null; }
        if (!obj || typeof obj !== "object") obj = { total: 0, paths: {} };
        out.daily.push({ day: isoDay(d), total: obj.total || 0 });
        out.total += obj.total || 0;
        const paths = obj.paths && typeof obj.paths === "object" ? obj.paths : {};
        for (const p of Object.keys(paths)) {
          out.byPath[p] = (out.byPath[p] || 0) + (paths[p] || 0);
        }
      }
      // Sort byPath into top array
      const top = Object.entries(out.byPath).sort((a,b)=>b[1]-a[1]).slice(0, 15).map(([path,count])=>({ path, count }));
      out.top = top;
      return json(out, { status: 200, headers: noCache() });
    }

    // Login
    if (path === "/api/cms/login") {
      if (request.method !== "POST") return badRequest("Use POST");
      const body = await readJson(request);
      if (!body || typeof body.password !== "string") return badRequest("Missing password");
      const adminPassword = env.ADMIN_PASSWORD || "";
      const sessionSecret = env.SESSION_SECRET || "";
      if (!adminPassword || !sessionSecret) {
        return json({ ok: false, error: "Worker secrets are not configured (ADMIN_PASSWORD, SESSION_SECRET)." }, { status: 500, headers: noCache() });
      }
      if (body.password !== adminPassword) return forbidden("Invalid password");
      const token = await makeSessionToken(sessionSecret);
      return json(
        { ok: true },
        { headers: noCache({ "set-cookie": setCookieHeader(token) }) }
      );
    }

    // Logout
    if (path === "/api/cms/logout") {
      if (request.method !== "POST") return badRequest("Use POST");
      return json({ ok: true }, { headers: noCache({ "set-cookie": clearCookieHeader() }) });
    }


    // Reset Site Globals to built-in defaults (requires login)
    if (path === "/api/cms/reset-site") {
      if (request.method !== "POST") return badRequest("Use POST");
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      const siteKey = `site:global`;
      const d = defaultPageData("home");
      const siteObj = (d && d.site) ? d.site : {};
      await env.CMS.put(siteKey, JSON.stringify(siteObj));
      return json({ ok: true }, { headers: noCache() });
    }


    // Sync Site Globals to built-in defaults (requires login)
    if (path === "/api/cms/sync-site") {
      if (request.method !== "POST") return badRequest("Use POST");
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      const siteKey = `site:global`;
      const d = defaultPageData("home");
      const siteObj = (d && d.site) ? d.site : {};
      await env.CMS.put(siteKey, JSON.stringify(siteObj));
      return json({ ok: true }, { headers: noCache() });
    }


    // List pages (requires login)
    if (path === "/api/cms/pages") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      const out = [];
      let cursor = undefined;
      do {
        const res = await env.CMS.list({ prefix: "page:", cursor });
        (res.keys || []).forEach(k => out.push(k.name.replace(/^page:/,"")));
        cursor = res.list_complete ? undefined : res.cursor;
      } while (cursor);
      ["home","thank-you","testimonial-thank-you"].forEach(s=>{ if(!out.includes(s)) out.unshift(s); });
      return json({ ok:true, pages: out, slugs: out }, { headers: noCache() });
    }

    // Duplicate a page (requires login)
    if (path === "/api/cms/duplicate-page") {
      if (request.method !== "POST") return badRequest("Use POST");
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      const body = await request.json().catch(()=>null);
      const from = (body && body.from) ? String(body.from) : "";
      const to = (body && body.to) ? String(body.to) : "";
      if (!from || !to) return badRequest("from/to required");
      if (!/^[a-z0-9\-]+$/.test(from) || !/^[a-z0-9\-]+$/.test(to)) return badRequest("Invalid slug");
      const fromKey = `page:${from}`;
      const toKey = `page:${to}`;
      const raw = await env.CMS.get(fromKey);
      if (!raw) return badRequest("Source page not found");
      await env.CMS.put(toKey, raw);
      return json({ ok:true }, { headers: noCache() });
    }

    // R2 Media: serve uploaded files
    if (path.startsWith("/media/")) {
      const key = decodeURIComponent(path.slice("/media/".length));
      if (!key) return notFound();
      if (!env.MEDIA) return badRequest("R2 bucket not configured");
      const obj = await env.MEDIA.get(key);
      if (!obj) return notFound();
      const headers = new Headers();
      headers.set("cache-control","public, max-age=31536000, immutable");
      if (obj.httpMetadata && obj.httpMetadata.contentType) headers.set("content-type", obj.httpMetadata.contentType);
      return new Response(obj.body, { headers });
    }

    // R2 Media: upload (requires login)
    if (path === "/api/cms/upload") {
      if (request.method !== "POST") return badRequest("Use POST");
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      if (!env.MEDIA) return badRequest("R2 bucket not configured");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return badRequest("file required");
      const folder = String(form.get("folder") || "uploads").replace(/[^a-z0-9\-_/]/gi,"");
      const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop() : "";
      const safeExt = ext ? ("." + ext.replace(/[^a-z0-9]/gi,"").slice(0,10)) : "";
      const key = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      return json({ ok:true, key, url: "/media/" + encodeURIComponent(key) }, { headers: noCache() });
    }



    // Import testimonials from current homepage HTML (requires login)
    
    if (path === "/api/cms/import-clients-say") {
      try {
        // Require login
        const sessionSecret = env.SESSION_SECRET || "";
        const token = getCookie(request, COOKIE_NAME);
        const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
        if (!ok) return unauthorized("Not logged in");

        // Fetch live homepage HTML
        const homeUrl = new URL("/", request.url);
        const htmlRes = await fetch(homeUrl.toString(), { method: "GET", headers: { "accept": "text/html" } });
        const html = await htmlRes.text();

        // Scope to section with heading "What Our Clients Say"
        let scope = html;
        const sec = html.match(/<section\b[\s\S]*?<h2[^>]*>\s*What\s+Our\s+Clients\s+Say\s*<\/h2>[\s\S]*?<\/section>/i);
        if (sec) scope = sec[0];

        const strip = (s)=> (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();

        // Robust extraction: find each <p> + following <strong>- Name</strong> within the section
        const items = [];
        const pairRe = /<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<strong[^>]*>\s*-\s*([\s\S]*?)<\/strong>/gi;
        let m;
        while ((m = pairRe.exec(scope)) && items.length < 50) {
          const text = strip(m[1]);
          const name = strip(m[2]);
          if (!text) continue;
          items.push({ name, text });
        }

        if (items.length === 0) {
          return json({ ok:false, error:"No cards found under 'What Our Clients Say' on the homepage." }, { status: 200, headers: noCache() });
        }

        // Merge into KV without wiping other fields
        const pageKey = "page:home";
        const backupKey = `backup:page:home:${Date.now()}`;
        const raw = await env.CMS.get(pageKey);
        if (raw) await env.CMS.put(backupKey, raw);

        let pageObj = {};
        try { pageObj = raw ? JSON.parse(raw) : {}; } catch { pageObj = {}; }
        pageObj.home = pageObj.home || {};
        pageObj.home.clients_say = items;
        pageObj.home.clients_say_section = pageObj.home.clients_say_section || {};
        pageObj.home.clients_say_section.title = pageObj.home.clients_say_section.title || "What Our Clients Say";

        // Ensure visibility key exists
        pageObj.site = pageObj.site || {};
        pageObj.site.sections = pageObj.site.sections || {};
        if (pageObj.site.sections["clients-say"] === undefined) pageObj.site.sections["clients-say"] = true;

        await env.CMS.put(pageKey, JSON.stringify(pageObj));
        return json({ ok:true, count: items.length, items, backupKey }, { status: 200, headers: noCache() });
      } catch (err) {
        return json({ ok:false, error: (err && err.stack) ? String(err.stack) : String(err) }, { status: 200, headers: noCache() });
      }
    }


      if (path === "/api/cms/import-clients-say") {
      try {
        const sessionSecret = env.SESSION_SECRET || "";
        const token = getCookie(request, COOKIE_NAME);
        const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
        if (!ok) return unauthorized("Not logged in");

        const homeRes = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
        const html = await homeRes.text();

        function stripTags(s){ return (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(); }

        // Scope to the section with heading "What Our Clients Say" if possible
        let scope = html;
        const m1 = html.match(/<section\b[^>]*>[\s\S]*?<h2[^>]*>\s*What\s+Our\s+Clients\s+Say\s*<\/h2>[\s\S]*?<\/section>/i);
        if (m1) scope = m1[0];

        const items = [];

        // Extract cards: look for blocks that contain a quoted sentence and a dash-name line
        const quoteRe = /[“"]([^”"]{10,400})[”"]/g;
        let qm;
        while ((qm = quoteRe.exec(scope)) && items.length < 50) {
          const q = stripTags(qm[1]);
          const after = scope.slice(qm.index, qm.index + 800);
          const nm = after.match(/[\-–—]\s*([A-Za-z0-9 &.'’]{2,80})/);
          const name = nm ? stripTags(nm[1]) : "";
          if (q) items.push({ name, text: q });
        }

        // fallback: scan for <p> quotes inside cards
        if (items.length === 0) {
          const cardRe = /<div[^>]*class=["'][^"']*(?:testimonial|review|card)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
          let dc;
          while ((dc = cardRe.exec(scope)) && items.length < 50) {
            const chunk = dc[0];
            const p = chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            const q = p ? stripTags(p[1]) : "";
            const nameMatch = stripTags(chunk).match(/[\-–—]\s*([A-Za-z0-9 &.'’]{2,80})/);
            const name = nameMatch ? nameMatch[1].trim() : "";
            if (q) items.push({ name, text: q });
          }
        }

        if (items.length === 0) {
          return json({ ok:false, error:"No testimonials found on homepage. Open View Source and paste the HTML for the 'What Our Clients Say' section so I can match it exactly." }, { status: 400, headers: noCache() });
        }

        return json({ ok:true, count: items.length, items }, { headers: noCache() });
      } catch (e) {
        return json({ ok:false, error:String(e && e.message ? e.message : e) }, { status: 500, headers: noCache() });
      }
    }

if (path === "/api/cms/media-list") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      if (!env.MEDIA) return badRequest("R2 bucket not configured");
      const url = new URL(request.url);
      const prefix = (url.searchParams.get("prefix") || "uploads").replace(/[^a-z0-9\-_/]/gi,"");
      const cursor = url.searchParams.get("cursor") || undefined;
      const limitRaw = parseInt(url.searchParams.get("limit") || "50", 10);
      const limit = Math.max(1, Math.min(200, isFinite(limitRaw) ? limitRaw : 50));
      const res = await env.MEDIA.list({ prefix, cursor, limit });
      const items = (res.objects || []).map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }));
      return json({ ok:true, prefix, items, cursor: res.truncated ? res.cursor : null }, { headers: noCache() });
    }

    if (path === "/api/cms/media-delete") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");
      if (!env.MEDIA) return badRequest("R2 bucket not configured");
      if (request.method !== "POST") return badRequest("POST required");
      try {
        const body = await request.json();
        const keyRaw = (body && body.key) ? String(body.key) : "";
        const key = keyRaw.replace(/[^a-z0-9\-_/\.]/gi, "");
        if (!key) return badRequest("Missing key");
        await env.MEDIA.delete(key);
        return json({ ok:true, key }, { headers: noCache() });
      } catch (e) {
        return json({ ok:false, error:String(e && e.message ? e.message : e) }, { status: 500, headers: noCache() });
      }
    }

    
    // Recover home page CMS data (requires login)
    // Rebuilds page:home with safe defaults so admin UI can load again.
    if (path === "/api/cms/recover-home") {
      const sessionSecret = env.SESSION_SECRET || "";
      const token = getCookie(request, COOKIE_NAME);
      const ok = sessionSecret && (await verifySessionToken(sessionSecret, token));
      if (!ok) return unauthorized("Not logged in");

      const pageKey = "page:home";
      const backupKey = `backup:page:home:${Date.now()}`;
      const raw = await env.CMS.get(pageKey);
      if (raw) await env.CMS.put(backupKey, raw);

      // Use built-in defaults from this worker (same as first-run content)
      const fresh = defaultHomePageData();

      await env.CMS.put(pageKey, JSON.stringify(fresh));
      return json({ ok:true, recovered:true, backupKey }, { headers: noCache() });
    }

    // Publish draft -> published
    if (path === "/api/cms/publish") {
      if (request.method !== "POST") return badRequest("Use POST");
      if (!(await isAuthed(request, env))) return unauthorized("Not logged in");

      const slug = normalizeSlug(url.searchParams.get("slug") || "home");
      const sk = siteKeys();
      const pk = pageKeys(slug);

      // Ensure draft exists (migrate legacy if needed)
      let siteDraft = safeJsonParse(await env.CMS.get(sk.draft), null);
      let pageDraft = safeJsonParse(await env.CMS.get(pk.draft), null);

      if (!siteDraft) {
        const legacySite = safeJsonParse(await env.CMS.get("site:global"), null);
        const d = defaultPageData(slug);
        siteDraft = deepMerge(d.site || {}, legacySite || {});
        await env.CMS.put(sk.draft, JSON.stringify(siteDraft));
      }
      if (!pageDraft) {
        const legacyPage = safeJsonParse(await env.CMS.get(pk.legacy), null);
        const d = defaultPageData(slug);
        const base = { ...d }; delete base.site;
        pageDraft = deepMerge(base, legacyPage || {});
        await env.CMS.put(pk.draft, JSON.stringify(pageDraft));
      }

      const payload = { site: siteDraft, ...pageDraft };
      const val = validateCmsPayload(payload);
      if (!val.ok) return badRequest(val.error);

      // Save snapshot
      const id = Date.now().toString();
      const snapshot = {
        id,
        slug,
        at: nowIso(),
        by: "admin",
        ip: getClientIp(request),
        payload
      };
      await env.CMS.put(revKey(slug, id), JSON.stringify(snapshot));

      // Update history index
      const idx = safeJsonParse(await env.CMS.get(pk.historyIndex), []);
      const next = Array.isArray(idx) ? idx : [];
      next.unshift({ id, at: snapshot.at, ip: snapshot.ip });
      while (next.length > HISTORY_KEEP) {
        const drop = next.pop();
        if (drop && drop.id) await env.CMS.delete(revKey(slug, drop.id));
      }
      await env.CMS.put(pk.historyIndex, JSON.stringify(next));

      // Write published
      await env.CMS.put(sk.published, JSON.stringify(siteDraft));
      await env.CMS.put(pk.published, JSON.stringify(pageDraft));
      // Also migrate/overwrite legacy keys for backward compatibility
      await env.CMS.put("site:global", JSON.stringify(siteDraft));
      await env.CMS.put(pk.legacy, JSON.stringify(pageDraft));

      return json({ ok:true, id, published:true }, { headers: noCache() });
    }

    // Revision history list
    if (path === "/api/cms/history") {
      if (request.method !== "GET") return badRequest("Use GET");
      if (!(await isAuthed(request, env))) return unauthorized("Not logged in");
      const slug = normalizeSlug(url.searchParams.get("slug") || "home");
      const pk = pageKeys(slug);
      const idx = safeJsonParse(await env.CMS.get(pk.historyIndex), []);
      return json({ ok:true, slug, items: Array.isArray(idx) ? idx : [] }, { headers: noCache() });
    }

    // Rollback a snapshot into draft (default) or published
    if (path === "/api/cms/rollback") {
      if (request.method !== "POST") return badRequest("Use POST");
      if (!(await isAuthed(request, env))) return unauthorized("Not logged in");
      const body = await readJson(request);
      const slug = normalizeSlug((body && body.slug) || url.searchParams.get("slug") || "home");
      const id = body && body.id ? String(body.id) : "";
      const target = body && body.target ? String(body.target) : "draft";
      if (!id) return badRequest("Missing id");
      const snap = safeJsonParse(await env.CMS.get(revKey(slug, id)), null);
      if (!snap || !snap.payload) return badRequest("Snapshot not found");

      const sk = siteKeys();
      const pk = pageKeys(slug);
      const p = snap.payload;
      const val = validateCmsPayload(p);
      if (!val.ok) return badRequest(val.error);

      // Write to draft
      await env.CMS.put(sk.draft, JSON.stringify(p.site || {}));
      const pagePayload = { ...p }; delete pagePayload.site;
      await env.CMS.put(pk.draft, JSON.stringify(pagePayload));

      // Optionally write to published as emergency restore
      if (target === "published") {
        await env.CMS.put(sk.published, JSON.stringify(p.site || {}));
        await env.CMS.put(pk.published, JSON.stringify(pagePayload));
        await env.CMS.put("site:global", JSON.stringify(p.site || {}));
        await env.CMS.put(pk.legacy, JSON.stringify(pagePayload));
      }

      return json({ ok:true, slug, restored:true, target }, { headers: noCache() });
    }

    // CMS Page API (Draft/Published)
    if (path === "/api/cms/page") {
      const slug = normalizeSlug(url.searchParams.get("slug") || "home");
      const modeParam = String(url.searchParams.get("mode") || "").toLowerCase();
      const preview = isTruthy(url.searchParams.get("vw_preview"));
      const authed = await isAuthed(request, env);
      const mode = (preview && authed) ? "draft" : (modeParam === "draft" ? "draft" : "published");

      const sk = siteKeys();
      const pk = pageKeys(slug);

      // GET: public gets published; authed preview can get draft.
      if (request.method === "GET") {
        if (mode === "draft" && !authed) return unauthorized("Not logged in");

        // Load site state (with safe defaults)
        const defaults = defaultPageData(slug);
        const siteBase = defaults.site || {};

        // Migrate legacy site into published/draft if needed
        let siteObj = safeJsonParse(await env.CMS.get(mode === "draft" ? sk.draft : sk.published), null);
        if (!siteObj) {
          const legacySite = safeJsonParse(await env.CMS.get("site:global"), null);
          siteObj = deepMerge(siteBase, legacySite || {});
          await env.CMS.put(mode === "draft" ? sk.draft : sk.published, JSON.stringify(siteObj));
        } else {
          siteObj = deepMerge(siteBase, siteObj);
          await env.CMS.put(mode === "draft" ? sk.draft : sk.published, JSON.stringify(siteObj));
        }

        // Load page state
        let pageObj = safeJsonParse(await env.CMS.get(mode === "draft" ? pk.draft : pk.published), null);
        if (!pageObj) {
          const legacy = safeJsonParse(await env.CMS.get(pk.legacy), null);
          const base = { ...defaults }; delete base.site;
          pageObj = deepMerge(base, legacy || {});
          await env.CMS.put(mode === "draft" ? pk.draft : pk.published, JSON.stringify(pageObj));
        } else {
          const base = { ...defaults }; delete base.site;
          pageObj = deepMerge(base, pageObj || {});
          await env.CMS.put(mode === "draft" ? pk.draft : pk.published, JSON.stringify(pageObj));
        }

        // Compatibility normalization for older saved content
        try {
          pageObj.home = pageObj.home || {};
          const h = pageObj.home;

          if (h.hero_discount) {
            const hd = h.hero_discount;
            if (!hd.note && hd.fine_print) hd.note = hd.fine_print;
            if (!hd.fine_print && hd.note) hd.fine_print = hd.note;
          }
          if (h.quote_banner) {
            const qb = h.quote_banner;
            if (!qb.headline && qb.heading) qb.headline = qb.heading;
            if (!qb.heading && qb.headline) qb.heading = qb.headline;
          }
          if (h.testimonial_section) {
            const ts = h.testimonial_section;
            if (!ts.permission_label && ts.permission_text) ts.permission_label = ts.permission_text;
            if (!ts.note_text && ts.note) ts.note_text = ts.note;
          }
          if (!h.service_area) h.service_area = { title:"Serving Your Area", html:"" };
        } catch (_e) {}

        return json({ site: siteObj, ...(pageObj || {}), _mode: mode }, { status: 200, headers: noCache() });
      }

      // PUT: save draft (auth required)
      if (request.method === "PUT") {
        if (!authed) return unauthorized("Not logged in");
        const body = await readJson(request);
        if (!body || typeof body !== "object") return badRequest("Invalid JSON");
        const val = validateCmsPayload(body);
        if (!val.ok) return badRequest(val.error);

        // Always save into draft. Published only via /publish.
        const siteObj = (body.site && typeof body.site === "object") ? body.site : {};
        const pagePayload = { ...body }; delete pagePayload.site;
        await env.CMS.put(sk.draft, JSON.stringify(siteObj));
        await env.CMS.put(pk.draft, JSON.stringify(pagePayload));

        return json({ ok:true, saved:"draft" }, { headers: noCache() });
      }

      return badRequest("Unsupported method");
    }

    // Track page views (non-API, non-admin, non-asset)
    if (isPageLikeRequest(request, path)) {
      ctx.waitUntil(trackPageView(env, path));
    }

    // For everything else, let Pages serve static assets
    return env.ASSETS.fetch(request);
  },
};
