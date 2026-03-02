/**
 * Valor Wave Entertainment CMS Worker (Option B)
 * Routes:
 *  - GET  /api/cms/page?slug=home|thank-you|testimonial-thank-you   (public read)
 *  - PUT  /api/cms/page?slug=...                                   (auth required)
 *  - GET  /api/cms/config                                          (auth required)
 *  - POST /api/cms/login                                           (password)
 *  - POST /api/cms/logout
 *  - GET  /admin                                                   (admin UI)
 *  - GET  /admin/*                                                 (admin assets)
 *
 * Bindings (Cloudflare Worker):
 *  - CMS_KV: KV Namespace
 *  - ADMIN_PASSWORD: secret (string)
 *  - SESSION_SECRET: secret (string, 32+ chars recommended)
 */

const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin | Valor Wave Entertainment</title>
  <link rel="stylesheet" href="/admin/style.css">
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="brand">
        <img src="/logo.png" alt="Valor Wave Entertainment">
        <div>
          <div class="t1">Valor Wave Entertainment</div>
          <div class="t2">Admin Settings</div>
        </div>
      </div>
      <div class="top-actions">
        <button id="btnLogout" class="btn secondary" type="button">Log out</button>
      </div>
    </div>

    <div id="app"></div>
  </div>

  <script src="/admin/app.js" defer></script>
</body>
</html>`;

const ADMIN_CSS = `
:root{--navy:#0E1F45;--navy2:#071940;--gold:#CEA25D;--cream:#E9DCC2;--ink:#0b1220;--muted:#566;--panel:#fff;--border:rgba(0,0,0,.12)}
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--cream);color:var(--ink)}
.shell{max-width:1200px;margin:0 auto;padding:18px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--navy);color:#fff;border-radius:14px;padding:14px 16px}
.brand{display:flex;align-items:center;gap:12px}
.brand img{width:44px;height:44px;border-radius:10px;background:#fff;padding:6px}
.t1{font-weight:700}
.t2{opacity:.85;font-size:13px}
.btn{border:0;border-radius:12px;padding:10px 14px;font-weight:700;cursor:pointer}
.btn.secondary{background:rgba(255,255,255,.16);color:#fff}
.btn.primary{background:var(--gold);color:#111}
.grid{display:grid;grid-template-columns:320px 1fr;gap:16px;margin-top:16px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px}
.card h3{margin:0 0 10px 0}
.small{font-size:13px;color:var(--muted)}
.list{display:flex;flex-direction:column;gap:8px}
.navbtn{display:flex;justify-content:space-between;align-items:center;width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:#fff;cursor:pointer;text-align:left}
.navbtn.active{outline:2px solid rgba(14,31,69,.25)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.field label{font-size:12px;color:var(--muted);font-weight:700}
.field input,.field textarea, .field select{padding:10px 12px;border-radius:12px;border:1px solid var(--border);font-size:14px}
.field textarea{min-height:88px;resize:vertical}
.hr{height:1px;background:var(--border);margin:12px 0}
.actions{display:flex;gap:10px;flex-wrap:wrap}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:999px;background:#fff;font-size:13px}
.iconbtn{border:1px solid var(--border);background:#fff;border-radius:10px;padding:6px 10px;cursor:pointer}
.item{border:1px dashed var(--border);border-radius:14px;padding:12px;margin-bottom:10px;background:rgba(255,255,255,.7)}
.itemhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
@media (max-width: 980px){
  .grid{grid-template-columns:1fr}
  .top-actions{display:none}
}
`;

const ADMIN_APP_JS = `
// Minimal admin app (schema-driven).
const state = { config: null, slug: "home", data: null };

function el(tag, attrs={}, children=[]) {
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k==="class") n.className=v;
    else if(k==="html") n.innerHTML=v;
    else if(k.startsWith("on") && typeof v==="function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=>{
    if(typeof c==="string") n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  });
  return n;
}

async function api(path, opts={}) {
  const res = await fetch(path, Object.assign({credentials:"include"}, opts));
  const text = await res.text();
  let json=null;
  try{ json = text ? JSON.parse(text) : null; } catch(_){}
  if(!res.ok){
    const msg = (json && json.error) ? json.error : (text || ("HTTP "+res.status));
    throw new Error(msg);
  }
  return json;
}

function toast(msg){
  alert(msg);
}

function renderLogin(target){
  target.innerHTML = "";
  const card = el("div", {class:"card"}, [
    el("h3", {}, ["Admin Login"]),
    el("div", {class:"small"}, ["Enter your admin password."]),
    el("div", {class:"hr"}),
  ]);
  const pw = el("input", {type:"password", placeholder:"Admin password"});
  const btn = el("button", {class:"btn primary", type:"button", onclick: async ()=>{
    try{
      await api("/api/cms/login", {method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({password: pw.value})});
      await boot();
    }catch(e){ toast(e.message); }
  }}, ["Log in"]);
  card.appendChild(el("div",{class:"field"},[el("label",{},["Password"]), pw]));
  card.appendChild(btn);
  target.appendChild(card);
}

function fieldInput(def, value, onChange){
  if(def.type==="textarea"){
    const t = el("textarea", {}, []);
    t.value = value || "";
    t.addEventListener("input", ()=>onChange(t.value));
    return t;
  }
  const i = el("input", {type:def.type || "text"}, []);
  i.value = value || "";
  i.addEventListener("input", ()=>onChange(i.value));
  return i;
}

function ensurePath(obj, path){
  const parts = path.split(".");
  let cur=obj;
  for(let i=0;i<parts.length-1;i++){
    const k=parts[i];
    if(typeof cur[k] !== "object" || !cur[k]) cur[k]={};
    cur=cur[k];
  }
  return {parent: cur, key: parts[parts.length-1]};
}

function getPath(obj, path){
  return path.split(".").reduce((a,k)=>(a && a[k]!==undefined)?a[k]:undefined, obj);
}

function setPath(obj, path, value){
  const {parent,key}=ensurePath(obj, path);
  parent[key]=value;
}

function renderEditor(root){
  root.innerHTML = "";
  const grid = el("div", {class:"grid"}, []);
  const nav = el("div", {class:"card"}, []);
  nav.appendChild(el("h3", {}, ["Pages"]));
  nav.appendChild(el("div",{class:"small"},["Select a page to edit."]));
  nav.appendChild(el("div",{class:"hr"}));
  const list = el("div", {class:"list"}, []);
  state.config.pages.forEach(p=>{
    const b = el("button", {class:"navbtn"+(state.slug===p.slug?" active":""), type:"button", onclick: async ()=>{
      state.slug = p.slug;
      await loadPage();
      renderEditor(root);
    }}, [
      el("span", {}, [p.title]),
      el("span", {class:"small"}, [p.slug])
    ]);
    list.appendChild(b);
  });
  nav.appendChild(list);
  grid.appendChild(nav);

  const main = el("div", {class:"card"}, []);
  const pageMeta = state.config.pages.find(p=>p.slug===state.slug);
  main.appendChild(el("h3", {}, ["Edit: ", pageMeta ? pageMeta.title : state.slug]));
  main.appendChild(el("div",{class:"small"},["Changes save immediately to your CMS. Your live site updates on refresh."]));

  main.appendChild(el("div",{class:"hr"}));

  // Fields
  const fields = state.config.fields.filter(f=>f.page===state.slug || f.page==="*");
  if(fields.length){
    main.appendChild(el("div",{class:"pill"},["Basic fields"]));
    fields.forEach(f=>{
      const cur = getPath(state.data, f.path);
      const input = fieldInput(f, cur, (v)=>setPath(state.data, f.path, v));
      main.appendChild(el("div",{class:"field"},[el("label",{},[f.label]), input]));
    });
  }

  // Repeaters
  const reps = state.config.repeaters.filter(r=>r.page===state.slug);
  if(reps.length){
    main.appendChild(el("div",{class:"hr"}));
    main.appendChild(el("div",{class:"pill"},["Repeating sections"]));

    reps.forEach(r=>{
      main.appendChild(el("h4", {}, [r.label]));
      const items = getPath(state.data, r.path) || [];
      const container = el("div", {}, []);
      const draw = ()=>{
        container.innerHTML="";
        items.forEach((it, idx)=>{
          const itemBox = el("div",{class:"item"},[]);
          const head = el("div",{class:"itemhead"},[
            el("div",{class:"small"},[r.itemLabel + " " + (idx+1)]),
            el("div",{class:"actions"},[
              el("button",{class:"iconbtn",type:"button",onclick:()=>{ if(idx>0){ const t=items[idx-1]; items[idx-1]=items[idx]; items[idx]=t; draw(); }}},["↑"]),
              el("button",{class:"iconbtn",type:"button",onclick:()=>{ if(idx<items.length-1){ const t=items[idx+1]; items[idx+1]=items[idx]; items[idx]=t; draw(); }}},["↓"]),
              el("button",{class:"iconbtn",type:"button",onclick:()=>{ items.splice(idx,1); draw(); }},["Delete"])
            ])
          ]);
          itemBox.appendChild(head);
          r.itemFields.forEach(ff=>{
            const inp = fieldInput(ff, it[ff.key], (v)=>{ it[ff.key]=v; });
            itemBox.appendChild(el("div",{class:"field"},[el("label",{},[ff.label]), inp]));
          });
          container.appendChild(itemBox);
        });
      };
      draw();
      main.appendChild(container);
      main.appendChild(el("div",{class:"actions"},[
        el("button",{class:"btn primary",type:"button",onclick:()=>{ items.push(Object.assign({}, r.itemDefaults)); draw(); }},["Add "+r.itemLabel])
      ]));
      main.appendChild(el("div",{class:"hr"}));
      // persist repeater back to data
      setPath(state.data, r.path, items);
    });
  }

  // Save button
  main.appendChild(el("div",{class:"actions"},[
    el("button",{class:"btn primary",type:"button",onclick: async ()=>{
      try{
        await api("/api/cms/page?slug="+encodeURIComponent(state.slug), {method:"PUT", headers:{"content-type":"application/json"}, body: JSON.stringify(state.data)});
        toast("Saved.");
      }catch(e){ toast(e.message); }
    }}, ["Save changes"]),
    el("button",{class:"btn",type:"button",onclick: async ()=>{
      try{
        await loadPage();
        renderEditor(root);
        toast("Reloaded from server.");
      }catch(e){ toast(e.message); }
    }}, ["Reload"])
  ]));

  grid.appendChild(main);
  root.appendChild(grid);
}

async function loadConfig(){
  state.config = await api("/api/cms/config");
}

async function loadPage(){
  state.data = await api("/api/cms/page?slug="+encodeURIComponent(state.slug));
}

async function boot(){
  const root = document.getElementById("app");
  try{
    await loadConfig();
    await loadPage();
    renderEditor(root);
  }catch(e){
    // likely not logged in
    renderLogin(root);
  }
}

document.getElementById("btnLogout")?.addEventListener("click", async ()=>{
  try{ await api("/api/cms/logout", {method:"POST"}); }catch(_){}
  location.reload();
});

boot();
`;

const DEFAULT_CONTENT = {
  site: {
    brand_name: "Valor Wave Entertainment",
    logo_url: "/logo.png",
    facebook_url: "https://www.facebook.com/profile.php?id=61586296074548",
    instagram_url: "https://www.instagram.com/valorwaveentertainment/",
    formsubmit_email: "valorwaveentertainment@gmail.com",
    quote_thankyou_url: "https://valorwaveentertainment.com/thank-you.html",
    testimonial_thankyou_url: "https://valorwaveentertainment.com/testimonial-thank-you.html",
  },
  home: {
    hero_title: "Wedding DJ in Chattanooga • Faith-Based Events",
    hero_kicker: "Faith-Based DJ Services",
    hero_tagline: "Honoring Every Moment • Honoring All Heroes",
    hero_subline: "Veteran-owned • Faith-based • Professional DJ services",
    hero_button_text: "Request a Quote",
    hero_button_url: "#quote",
    calendar_embed_url: "https://calendar.google.com/calendar/embed?src=valorwaveentertainment%40gmail.com",
    services: [
      { title: "Wedding DJ Services", text: "Professional, faith-respectful wedding DJ services with clean music, structured timelines, and stress-free coordination.", image: "images/service-wedding.jpg", alt:"Wedding DJ Services" },
      { title: "DJ & MC Services", text: "Confident MC presence, clear communication, and modern music tailored to your values and your guests.", image: "images/service-dj-mc.jpg", alt:"DJ and MC Services" },
      { title: "Sound & Lighting", text: "High-quality audio and tasteful lighting designed to enhance your event without overwhelming it.", image: "images/service-sound-lighting.jpg", alt:"Sound and Lighting" },
      { title: "Corporate & Community Events", text: "Reliable, positive entertainment for corporate gatherings, churches, and community celebrations.", image: "images/service-corporate.jpg", alt:"Corporate and Community Events" },
    ],
    faq: [
      { q: "How far in advance should we book?", a: "For peak wedding season, we recommend reaching out as early as possible to secure your date." },
      { q: "Do you travel outside Chattanooga?", a: "Yes—Southeast Tennessee and Northwest Georgia are our core service areas, and extended travel is available upon request." },
      { q: "Can you keep music clean/family-friendly?", a: "Absolutely. We can customize playlists to be clean, family-friendly, and aligned with venue guidelines." },
    ]
  },

  thankyou: {
    h1: 'Thank you for your <span>submission</span>!',
    message: 'We received your request. We will contact you soon.',
  },
  testimonial_thankyou: {
    h1: 'Thank you for your <span>testimonial</span>!',
    message: 'We appreciate your feedback.',
  },
  "thank-you": {},
  "testimonial-thank-you": {}
};

const CONFIG = {
  pages: [
    { slug: "home", title: "Home" },
    { slug: "thank-you", title: "Quote Thank You" },
    { slug: "testimonial-thank-you", title: "Testimonial Thank You" }
  ],
  fields: [
    { page:"*", path:"site.brand_name", label:"Business name", type:"text" },
    { page:"*", path:"site.logo_url", label:"Logo URL", type:"text" },
    { page:"*", path:"site.facebook_url", label:"Facebook URL", type:"text" },
    { page:"*", path:"site.instagram_url", label:"Instagram URL", type:"text" },
    { page:"*", path:"site.formsubmit_email", label:"FormSubmit email (receives form leads)", type:"email" },
    { page:"*", path:"site.quote_thankyou_url", label:"Quote form Thank You URL", type:"text" },
    { page:"*", path:"site.testimonial_thankyou_url", label:"Testimonial form Thank You URL", type:"text" },

    { page:"home", path:"home.hero_title", label:"Hero title", type:"text" },
    { page:"home", path:"home.hero_kicker", label:"Hero kicker", type:"text" },
    { page:"home", path:"home.hero_tagline", label:"Hero tagline", type:"text" },
    { page:"home", path:"home.hero_subline", label:"Hero subline", type:"text" },
    { page:"home", path:"home.hero_button_text", label:"Hero button text", type:"text" },
    { page:"home", path:"home.hero_button_url", label:"Hero button link (URL or #anchor)", type:"text" },
    { page:"home", path:"home.calendar_embed_url", label:"Google Calendar embed URL", type:"text" },
    { page:"thank-you", path:"thankyou.h1", label:"Thank You page heading (HTML allowed)", type:"textarea" },
    { page:"thank-you", path:"thankyou.message", label:"Thank You page message (HTML allowed)", type:"textarea" },
    { page:"testimonial-thank-you", path:"testimonial_thankyou.h1", label:"Testimonial Thank You heading (HTML allowed)", type:"textarea" },
    { page:"testimonial-thank-you", path:"testimonial_thankyou.message", label:"Testimonial Thank You message (HTML allowed)", type:"textarea" },
  ],
  repeaters: [
    {
      page:"home",
      path:"home.services",
      label:"Services cards",
      itemLabel:"Service",
      itemDefaults:{ title:"New service", text:"Describe your service.", image:"images/service-wedding.jpg", alt:"Service image" },
      itemFields:[
        { key:"title", label:"Title", type:"text" },
        { key:"text", label:"Description", type:"textarea" },
        { key:"image", label:"Image path/URL", type:"text" },
        { key:"alt", label:"Image alt text", type:"text" },
      ]
    },
    {
      page:"home",
      path:"home.faq",
      label:"FAQ items",
      itemLabel:"FAQ",
      itemDefaults:{ q:"New question", a:"New answer" },
      itemFields:[
        { key:"q", label:"Question", type:"text" },
        { key:"a", label:"Answer", type:"textarea" },
      ]
    }
  ]
};

function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }, headers)
  });
}

function text(data, status=200, headers={}) {
  return new Response(data, { status, headers });
}

function cookie(name, value, opts={}) {
  const parts = [`${name}=${value}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  return parts.join("; ");
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
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/,"");
}

function base64urlEncode(str){
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function base64urlDecode(b64){
  b64 = b64.replace(/-/g,"+").replace(/_/g,"/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const s = atob(b64 + pad);
  return decodeURIComponent(escape(s));
}

async function makeSession(secret, ttlSeconds=60*60*8) {
  const payload = { exp: Math.floor(Date.now()/1000) + ttlSeconds };
  const body = base64urlEncode(JSON.stringify(payload));
  const sig = await hmacSha256(secret, body);
  return body + "." + sig;
}

async function verifySession(secret, token) {
  if (!token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  const expected = await hmacSha256(secret, body);
  if (sig !== expected) return false;
  const payload = JSON.parse(base64urlDecode(body));
  if (!payload.exp || payload.exp < Math.floor(Date.now()/1000)) return false;
  return true;
}

function getCookie(req, name){
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "=([^;]*)"));
  return m ? m[1] : null;
}

async function readPage(env, slug){
  const raw = await env.CMS_KV.get("cms:page:" + slug);
  if (raw) return JSON.parse(raw);
  // seed with defaults
  await env.CMS_KV.put("cms:page:" + slug, JSON.stringify(DEFAULT_CONTENT));
  return DEFAULT_CONTENT;
}

async function writePage(env, slug, obj){
  await env.CMS_KV.put("cms:page:" + slug, JSON.stringify(obj));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Admin UI assets
    if (path === "/admin" || path === "/admin/") {
      return text(ADMIN_HTML, 200, {"content-type":"text/html; charset=utf-8", "cache-control":"no-store"});
    }
    if (path === "/admin/style.css") {
      return text(ADMIN_CSS, 200, {"content-type":"text/css; charset=utf-8", "cache-control":"no-store"});
    }
    if (path === "/admin/app.js") {
      return text(ADMIN_APP_JS, 200, {"content-type":"application/javascript; charset=utf-8", "cache-control":"no-store"});
    }

    // API
    if (path === "/api/cms/login" && req.method === "POST") {
      const body = await req.json().catch(()=>({}));
      if (!body.password || body.password !== env.ADMIN_PASSWORD) {
        return json({error:"Invalid password."}, 401);
      }
      const token = await makeSession(env.SESSION_SECRET);
      return json({ok:true}, 200, {
        "set-cookie": cookie("vw_admin", token, { httpOnly:true, secure:true, sameSite:"Lax", path:"/", maxAge: 60*60*8 })
      });
    }

    if (path === "/api/cms/logout" && req.method === "POST") {
      return json({ok:true}, 200, {
        "set-cookie": cookie("vw_admin", "", { httpOnly:true, secure:true, sameSite:"Lax", path:"/", maxAge: 0 })
      });
    }

    if (path === "/api/cms/config") {
      const ok = await verifySession(env.SESSION_SECRET, getCookie(req, "vw_admin"));
      if (!ok) return json({error:"Not authenticated."}, 401);
      return json(CONFIG);
    }

    if (path === "/api/cms/page") {
      const slug = (url.searchParams.get("slug") || "home").toLowerCase();
      const data = await readPage(env, slug);

      if (req.method === "GET") {
        return json(data);
      }

      if (req.method === "PUT") {
        const ok = await verifySession(env.SESSION_SECRET, getCookie(req, "vw_admin"));
        if (!ok) return json({error:"Not authenticated."}, 401);
        const incoming = await req.json().catch(()=>null);
        if (!incoming || typeof incoming !== "object") return json({error:"Invalid JSON."}, 400);
        await writePage(env, slug, incoming);
        return json({ok:true});
      }

      return json({error:"Method not allowed."}, 405);
    }

    return new Response("Not found", { status: 404 });
  }
};
