
;(()=>{
const VERSION = "v76.7.1";
const HISTORY_KEEP = 10;
const COOKIE_NAME = "vw_admin";
const API = {
  login: "/api/cms/login",
  logout: "/api/cms/logout",
  session: "/api/cms/session",
  page: "/api/cms/page",
  migrateClientsSay: "/api/cms/migrate-clients-say",
  mediaList: "/api/cms/media-list",
  mediaDelete: "/api/cms/media-delete",
  upload: "/api/cms/upload",
  pages: "/api/cms/pages",
  duplicate: "/api/cms/duplicate-page",
  stats: "/api/cms/stats",
  publish: "/api/cms/publish",
  history: "/api/cms/history",
  rollback: "/api/cms/rollback",
};

function el(tag, attrs, ...kids){
  const n=document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)) {
    if(k==="class") n.className=v;
    else if(k==="html") n.innerHTML=v;
    else if(k.startsWith("on") && typeof v==="function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for(const k of kids) {
    if(k==null) continue;
    if(typeof k==="string") n.appendChild(document.createTextNode(k));
    else n.appendChild(k);
  }
  return n;
}
function $(id){ return document.getElementById(id); }

function toast(msg, type = "info", timeout = 2200) {
  const t = document.createElement("div");
  t.textContent = String(msg ?? "");
  t.style.position = "fixed";
  t.style.bottom = "18px";
  t.style.right = "18px";
  t.style.padding = "10px 14px";
  t.style.borderRadius = "10px";
  t.style.fontSize = "14px";
  t.style.fontWeight = "700";
  t.style.zIndex = "9999";
  t.style.background =
    type === "error" ? "#7f1d1d" :
    type === "success" ? "#14532d" :
    "#020617";
  t.style.color = "#f8fafc";
  t.style.border = "1px solid #1e293b";
  t.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), timeout);
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

async function apiJson(url, opts){
  const r = await fetch(url, opts||{});
  let data=null;
  try{ data = await r.json(); }catch(_e){}
  return { ok:r.ok, status:r.status, data };
}



async function deleteMedia(key){
  return await apiJson(API.mediaDelete, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body: JSON.stringify({ key })
  });
}

async function loadMediaList(prefix){
  const url = API.mediaList + "?prefix=" + encodeURIComponent(prefix || "images") + "&limit=100";
  return await apiJson(url);
}
async function uploadFile(file, folder){
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder || "images");
  return await apiJson(API.upload, { method:"POST", body: fd });
}
function mediaUrlFromKey(key){
  return "/media/" + encodeURIComponent(key);
}

async function fetchPages(){
  return await apiJson(API.pages);
}
async function duplicatePage(fromSlug, toSlug){
  return await apiJson(API.duplicate, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body: JSON.stringify({ from: fromSlug, to: toSlug })
  });
}
async function fetchStats(days){
  return await apiJson(API.stats + "?days=" + encodeURIComponent(String(days||30)));
}

let CURRENT=null;

// NOTE: keys must match elements rendered with data-cms-section on the frontend.
const DEFAULT_SECTION_KEYS = ["header-social", "hero", "services", "bio", "chattanooga-wedding-dj", "brand-meaning", "hero-discount", "calendar", "quote-banner", "quote", "submit-testimonial", "clients-say", "footer", "footer-social"];
const SECTION_LABELS = {
  "header-social":"Header Social",
  "hero":"Hero",
  "hero-discount":"Hero Discount",
  "services":"Services",
  "bio":"Bio",
  "chattanooga-wedding-dj":"Chattanooga Wedding DJ",
  "brand-meaning":"Brand Meaning",
  "calendar":"Calendar",
  "quote-banner":"Quote Banner",
  "quote":"Quote Form",
  "submit-testimonial":"Submit Testimonial",
  "clients-say":"What Our Clients Say",
  "footer":"Footer",
  "footer-social":"Footer Social"
};

function getSectionKeys(){
  try{
    const order = (CURRENT && CURRENT.site && Array.isArray(CURRENT.site.section_order)) ? CURRENT.site.section_order : [];
    const set = new Set();
    const out = [];

    const add = (k)=>{
      if(!k) return;
      if(set.has(k)) return;
      set.add(k);
      out.push(k);
    };

    order.forEach(add);
    DEFAULT_SECTION_KEYS.forEach(add);

    const secs = (CURRENT && CURRENT.site && CURRENT.site.sections) ? CURRENT.site.sections : null;
    if(secs && typeof secs === "object") Object.keys(secs).forEach(add);

    return out;
  }catch(e){
    return DEFAULT_SECTION_KEYS.slice();
  }
}


function notify(msg){
  try{
    if (typeof toast === "function") { toast(msg); return; }
    if (typeof setStatus === "function") { setStatus(String(msg)); return; }
    console.log(msg);
  }catch(e){}
}

function initVisualEditor(){
  try{
    if(!CURRENT || !CURRENT.site) return;

    const sectionSel = document.getElementById("ve_section");
    const pt = document.getElementById("ve_pt");
    const pb = document.getElementById("ve_pb");
    const mw = document.getElementById("ve_mw");
    const bg = document.getElementById("ve_bg");
    const bgimg = document.getElementById("ve_bgimg");
    const overlay = document.getElementById("ve_overlay");
    const align = document.getElementById("ve_align");
    const hsize = document.getElementById("ve_hsize");
    const cw = document.getElementById("ve_cw");
    const bstyle = document.getElementById("ve_bstyle");
    const bsize = document.getElementById("ve_bsize");
    const bradius = document.getElementById("ve_bradius");
    const balign = document.getElementById("ve_balign");
    const btnLoad = document.getElementById("ve_load");
    const btnApply = document.getElementById("ve_apply");
    const btnSave = document.getElementById("ve_save");
    const btnClear = document.getElementById("ve_clear");

    const pv = document.getElementById("vwPreview");
    const pvSlug = document.getElementById("pv_slug");
    const pvReload = document.getElementById("pv_reload");
    const pvSelect = document.getElementById("pv_select");

    function ensureOverrides(){
      if(!CURRENT.site.section_overrides) CURRENT.site.section_overrides = {};
      return CURRENT.site.section_overrides;
    }
    function setPreviewSrc(){
      if(!pv) return;
      const slug = (CURRENT_SLUG || "home");
      const path = (slug === "home") ? "/" : ("/" + slug);
      pv.src = path + "?vw_preview=1&v=" + Date.now();
      if(pvSlug) pvSlug.textContent = "Editing: " + slug;
    }

    if(pvReload) pvReload.onclick = ()=> setPreviewSrc();

    // Click-to-select support (true visual editing foundation)
    let SELECT_MODE = false;
    function setSelectMode(on){
      SELECT_MODE = !!on;
      if(pvSelect) pvSelect.textContent = SELECT_MODE ? "Selecting… (click section)" : "Select section";
      try{
        if(pv && pv.contentWindow){
          pv.contentWindow.postMessage({ type:"vw_select_mode", enabled: SELECT_MODE }, "*");
        }
      }catch(_e){}
    }
    if(pvSelect) pvSelect.onclick = ()=> setSelectMode(!SELECT_MODE);

    if(sectionSel){
      sectionSel.innerHTML = "";
      getSectionKeys().forEach(k=> sectionSel.appendChild(el("option",{value:k}, (SECTION_LABELS[k]||k))));
      if(!sectionSel.value) sectionSel.value = "hero";
    }

    async function populateBgImages(){
      if(!bgimg) return;
      bgimg.innerHTML = "";
      bgimg.appendChild(el("option", {value:""}, "(none)"));
      try{
        const r = await loadMediaList("images");
        const items = (r && r.ok && r.data && Array.isArray(r.data.items)) ? r.data.items : [];
        items
          .filter(it=>it && it.key && /\.(png|jpe?g|webp|gif|svg)$/i.test(it.key))
          .forEach(it=>{
            const o = el("option", {value: mediaUrlFromKey(it.key)}, it.key);
            bgimg.appendChild(o);
          });
      }catch(_e){}
    }

    function loadSection(){
      const key = (sectionSel && sectionSel.value) ? sectionSel.value : "hero";
      const ov = (ensureOverrides()[key]) || {};
      if(pt) pt.value = ov.pad_top || "";
      if(pb) pb.value = ov.pad_bottom || "";
      if(mw) mw.value = ov.max_width || "";
      if(bg) bg.value = ov.bg_preset || "";
      if(bgimg) bgimg.value = ov.bg_image || "";
      if(overlay) overlay.value = (typeof ov.bg_overlay === "number" ? String(Math.round(ov.bg_overlay*100)) : (ov.bg_overlay || ""));
      if(align) align.value = ov.heading_align || "";
      if(hsize) hsize.value = ov.heading_size || "";
      if(cw) cw.value = ov.content_width || "";
      if(bstyle) bstyle.value = ov.btn_style || "";
      if(bsize) bsize.value = ov.btn_size || "";
      if(bradius) bradius.value = ov.btn_radius || "";
      if(balign) balign.value = ov.btn_align || "";
    }

    function applySection(){
      const key = (sectionSel && sectionSel.value) ? sectionSel.value : "hero";
      const all = ensureOverrides();
      all[key] = all[key] || {};
      all[key].pad_top = (pt && pt.value) ? pt.value.trim() : "";
      all[key].pad_bottom = (pb && pb.value) ? pb.value.trim() : "";
      all[key].max_width = (mw && mw.value) ? mw.value.trim() : "";

      // background guardrails
      all[key].bg_preset = (bg && bg.value) ? String(bg.value).trim() : "";
      all[key].bg_image = (bgimg && bgimg.value) ? String(bgimg.value).trim() : "";
      // store overlay as 0..1 float, but keep empty if not set
      if(overlay && overlay.value!==""){
        const n = Number(String(overlay.value).trim());
        if(Number.isFinite(n)) all[key].bg_overlay = Math.max(0, Math.min(1, n/100));
      } else {
        delete all[key].bg_overlay;
      }
      // typography guardrails (enums only)
      const a = (align && align.value) ? String(align.value).trim() : "";
      const hs = (hsize && hsize.value) ? String(hsize.value).trim() : "";
      const cwv = (cw && cw.value) ? String(cw.value).trim() : "";
      if(a && !["left","center","right"].includes(a)) { /* ignore */ }
      else all[key].heading_align = a;
      if(hs && !["sm","md","lg"].includes(hs)) { /* ignore */ }
      else all[key].heading_size = hs;
      if(cwv && !["narrow","normal","wide"].includes(cwv)) { /* ignore */ }
      else all[key].content_width = cwv;

      // button guardrails (enums only)
      const bs = (bstyle && bstyle.value) ? String(bstyle.value).trim() : "";
      const bsz = (bsize && bsize.value) ? String(bsize.value).trim() : "";
      const br = (bradius && bradius.value) ? String(bradius.value).trim() : "";
      const ba = (balign && balign.value) ? String(balign.value).trim() : "";
      if(bs && !["primary","ghost","outline"].includes(bs)) { /* ignore */ }
      else all[key].btn_style = bs;
      if(bsz && !["sm","md","lg"].includes(bsz)) { /* ignore */ }
      else all[key].btn_size = bsz;
      if(br && !["8","12","999"].includes(br)) { /* ignore */ }
      else all[key].btn_radius = br;
      if(ba && !["left","center","right"].includes(ba)) { /* ignore */ }
      else all[key].btn_align = ba;
      setDirty(true);
    }

    if(btnLoad) btnLoad.onclick = ()=>{ loadSection(); notify("Loaded section: " + (sectionSel ? sectionSel.value : "")); };
    function pushLiveOverrides(){
      try{
        if(!pv || !pv.contentWindow) return;
        const payload = { type:"vw_overrides", section_overrides: (CURRENT && CURRENT.site && CURRENT.site.section_overrides) ? CURRENT.site.section_overrides : {} };
        pv.contentWindow.postMessage(payload, "*");
      }catch(e){ console.warn(e); }
    }

    function pushLiveSitePatch(patch){
      try{
        if(!pv || !pv.contentWindow) return;
        pv.contentWindow.postMessage({ type:"vw_site_patch", patch: patch || {} }, "*");
      }catch(e){ console.warn(e); }
    }

    if(btnApply) btnApply.onclick = ()=>{ applySection(); pushLiveOverrides(); notify("Applied (not saved)."); };
    if(btnSave) btnSave.onclick = async()=>{ applySection(); await saveDraft(); notify("Draft saved."); setPreviewSrc(); };
    const btnPublish = document.getElementById("ve_publish");
    if(btnPublish) btnPublish.onclick = async()=>{ await publish(); setPreviewSrc(); };
    if(btnClear) btnClear.onclick = ()=>{
      const key = (sectionSel && sectionSel.value) ? sectionSel.value : "hero";
      const all = ensureOverrides();
      delete all[key];
      if(pt) pt.value=""; if(pb) pb.value=""; if(mw) mw.value="";
      if(bg) bg.value=""; if(bgimg) bgimg.value=""; if(overlay) overlay.value=""; if(align) align.value=""; if(hsize) hsize.value=""; if(cw) cw.value="";
      if(bstyle) bstyle.value=""; if(bsize) bsize.value=""; if(bradius) bradius.value=""; if(balign) balign.value="";
      setDirty(true);
      notify("Cleared overrides for: " + key + " (not saved).");
    };

    // populate background image choices once per visual editor init
    populateBgImages().then(()=>{ loadSection(); }).catch(()=>{ loadSection(); });
    setPreviewSrc();

    // Listen for section selections from the preview iframe
    if(!window.__vwSelectBound){
      window.__vwSelectBound = true;
      window.addEventListener("message", (ev)=>{
        const d = ev && ev.data;
        if(!d || d.type !== "vw_section_selected") return;
        const key = d.key;
        if(typeof window.__vwSelectSection === "function") window.__vwSelectSection(key);
        // stop selecting after a successful click
        try{ setSelectMode(false); }catch(_e){}
      });
    }

    // Expose helper for messages from the preview iframe
    window.__vwSelectSection = (key)=>{
      try{
        if(!key || !sectionSel) return;
        sectionSel.value = key;
        loadSection();
        notify("Selected section: " + (SECTION_LABELS[key] || key));
      }catch(e){}
    };
  }catch(e){
    console.error(e);
  }
}

let DIRTY=false;

function setStatus(text){ const s=$("vw_status"); if(s) s.textContent=text; }
function setDirty(v){ DIRTY=!!v; const p=$("vw_dirty"); if(p) p.textContent = DIRTY ? "Unsaved changes" : "No changes."; }

function ensureBaseUI(){
  // wipe the old stuck UI and replace with our own stable layout
  const root = document.body;
  root.innerHTML = "";
  const wrap = el("div", {class:"container"});
  wrap.innerHTML = `
    <style>

/* v67 admin form safety */
input,select,textarea{display:block;width:100%;max-width:100%;box-sizing:border-box}
.row{gap:12px}
.row.stack{display:block}
.row.stack > div{margin-top:10px}

      :root{
        --admin-header: #071940;
        --admin-accent: #CEA25D;
        --admin-on-accent: #071940;
        --admin-bg: #071940;
        --admin-card: rgba(255,255,255,.05);
        --admin-text: #E9DCC2;
        --admin-muted: rgba(233,220,194,.8);
        --admin-border: rgba(255,255,255,.14);
        --admin-select-bg: #c7d3b1;
        --admin-select-text: #0b1220;
      }
        --admin-on-accent: #071940;
      }
      body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:var(--admin-bg);color:var(--admin-text)}
      .container{max-width:1100px;margin:0 auto;padding:18px}
      .topbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .topbar{background:var(--admin-header);border-radius:16px;padding:12px;border:1px solid var(--admin-border)}
      .pill{display:inline-block;background:rgba(255,255,255,.08);border:1px solid var(--admin-border);padding:4px 10px;border-radius:999px;font-size:12px}
      .btn{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:var(--admin-text);font-weight:700;cursor:pointer}
      .btn.primary{background:var(--admin-accent);color:var(--admin-on-accent);border-color:var(--admin-accent)}
      .btn.danger{background:rgba(255,60,60,.18);border-color:rgba(255,60,60,.35)}
      .card{margin-top:14px;background:var(--admin-card);border:1px solid var(--admin-border);border-radius:16px;padding:14px}
      label{display:block;font-size:12px;opacity:.9;margin:10px 0 6px}
      input,textarea{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.25);color:var(--admin-text);outline:none}
      select{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:var(--admin-select-bg, #c7d3b1);color:var(--admin-select-text, #0b1220);outline:none}
      textarea{min-height:90px;resize:vertical}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      @media(max-width:720px){.row{grid-template-columns:1fr}}
      .muted{opacity:.85;color:var(--admin-muted)}
      details{border:1px solid var(--admin-border);border-radius:14px;padding:10px;background:rgba(0,0,0,.12)}
      summary{cursor:pointer;font-weight:800}
      .listItem{border:1px solid var(--admin-border);border-radius:14px;padding:12px;margin-top:10px;background:rgba(0,0,0,.12)}
      /* Toggle rows: label left, checkbox right (Header Nav + Footer/Social visibility) */
      .vwToggleRow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 10px}
      .vwToggleRow input[type=checkbox]{width:auto;min-width:18px;height:18px;accent-color: var(--admin-accent)}
      .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .footerbar{position:fixed;right:16px;bottom:16px;display:flex;gap:10px;align-items:center}
    
.vwSplit{display:grid;grid-template-columns:1fr 460px;gap:14px;align-items:start;}
@media (max-width:1200px){.vwSplit{grid-template-columns:1fr;}}
.previewFrame{width:100%;height:720px;border:1px solid var(--admin-border);border-radius:14px;background:#fff;}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
@media (max-width:900px){.grid2{grid-template-columns:1fr;}}
</style>
    <div class="topbar">
      <div style="font-weight:900;font-size:18px">Valor Wave Admin</div>
      <span class="pill">${VERSION}</span>
      <span id="vw_status" class="pill">Loading…</span>
      <span id="vw_dirty" class="pill">No changes.</span>
      <span style="flex:1"></span>
      <button id="vw_preview" class="btn">Preview Site</button>
      <button id="vw_logout" class="btn danger">Log out</button>
    </div>

    <div id="vw_login" class="card" style="display:none">
      <div style="font-weight:900;font-size:18px;margin-bottom:6px">Login</div>
      <div class="muted" style="margin-bottom:10px">Enter your admin password.</div>
      <form id="vw_login_form" action="javascript:void(0)">
      <label>Password</label>
      <input id="vw_pw" type="password" autocomplete="current-password" />
      <div class="actions">
        <button id="vw_login_btn" type="submit" class="btn primary">Log in</button>
      </div>
      <div id="vw_login_msg" class="muted" style="margin-top:8px"></div>
    </div>

    <div id="vw_app" class="card" style="display:none">
      <div style="font-weight:900;font-size:18px;margin-bottom:6px">Home Page Editor</div>
      <div class="muted">Edit content below and click <b>Save Draft</b>. Publish when you’re ready to update the live site.</div>

      <div id="vw_sections" style="margin-top:14px;display:flex;flex-direction:column;gap:10px"></div>

      <div class="footerbar" style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="vw_save_draft" class="btn primary">Save Draft</button>
      <button id="vw_publish" class="btn">Publish</button>
      <button id="vw_history" class="btn secondary">History</button>
    </div>

      <div class="vwSplit">
      <div>
        <div class="card" id="visualEditorCard">
          <h2>Visual Editor (Guardrails)</h2>
          <p class="muted">Adjust section spacing + guardrailed backgrounds. Use Apply (no save) to preview instantly.</p>
          <div class="grid2">
            <label>Section
              <select id="ve_section"></select>
            </label>
            <label>Max width
              <input id="ve_mw" placeholder="e.g. 1100px or 90%">
            </label>
            <label>Padding top
              <input id="ve_pt" placeholder="e.g. 48px or 4rem">
            </label>
            <label>Padding bottom
              <input id="ve_pb" placeholder="e.g. 48px or 4rem">
            </label>
            <label>Background preset
              <select id="ve_bg">
                <option value="">(none)</option>
                <option value="panel">Panel</option>
                <option value="navy">Navy</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>Background image (R2)
              <select id="ve_bgimg"></select>
            </label>
            <label>Overlay strength (Hero only)
              <input id="ve_overlay" placeholder="0-100" inputmode="numeric">
            </label>
          
            <label>Heading align
              <select id="ve_align">
                <option value="">(default)</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label>Heading size
              <select id="ve_hsize">
                <option value="">(default)</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </label>
            <label>Content width
              <select id="ve_cw">
                <option value="">(default)</option>
                <option value="narrow">Narrow</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </label>

            <label>Button style
              <select id="ve_bstyle">
                <option value="">(default)</option>
                <option value="primary">Primary</option>
                <option value="ghost">Ghost</option>
                <option value="outline">Outline</option>
              </select>
            </label>
            <label>Button size
              <select id="ve_bsize">
                <option value="">(default)</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </label>
            <label>Button radius
              <select id="ve_bradius">
                <option value="">(default)</option>
                <option value="8">8</option>
                <option value="12">12</option>
                <option value="999">Pill</option>
              </select>
            </label>
            <label>Button align
              <select id="ve_balign">
                <option value="">(default)</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
</div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn secondary" id="ve_load" type="button">Load section</button>
            <button class="btn" id="ve_apply" type="button">Apply (no save)</button>
            <button class="primary" id="ve_save" type="button">Save Draft</button>
            <button class="btn" id="ve_publish" type="button">Publish</button>
            <button class="btn" id="ve_clear" type="button">Clear overrides</button>
          </div>
        </div>
      </div>
      <div>
        <div class="card" id="previewCard">
          <h2>Page Preview</h2>
          <p class="muted">Preview the currently loaded page.</p>
          <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn secondary" id="pv_reload" type="button">Reload preview</button>
            <button class="btn" id="pv_select" type="button">Select section</button>
            <span class="muted" id="pv_slug"></span>
          </div>
          <iframe id="vwPreview" class="previewFrame" src="/?vw_preview=1"></iframe>
        </div>
      </div>
    </div>

    </div>
`;
  root.appendChild(wrap);

  $("vw_preview").onclick = ()=>window.open("/", "_blank");
  $("vw_logout").onclick = doLogout;
  $("vw_login_btn").onclick = doLogin;
  $("vw_login_form").addEventListener("submit",(e)=>{ e.preventDefault(); doLogin(); });
  $("vw_pw").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); doLogin(); } });
  $("vw_save_draft").onclick = saveDraft;
  $("vw_publish").onclick = publish;
  $("vw_history").onclick = openHistory;

  // Keyboard shortcut: Ctrl/Cmd+S = Save Draft
  document.addEventListener("keydown", (e)=>{
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if(mod && e.key.toLowerCase() === "s"){
      e.preventDefault();
      saveDraft();
    }
  });
}

function showLogin(show){
  $("vw_login").style.display = show ? "" : "none";
  $("vw_app").style.display = show ? "none" : "";
}

async function checkSession(){
  const r = await apiJson(API.session);
  if(r.ok && r.data && r.data.ok) return true;
  // treat 401 as not logged in, but don't break
  return false;
}

async function doLogin(){
  const pw = ($("vw_pw").value||"").trim();
  if(!pw) { $("vw_login_msg").textContent="Enter password."; return; }
  const r = await apiJson(API.login, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body: JSON.stringify({password: pw})
  });
  if(!r.ok || !(r.data && r.data.ok)) {
    $("vw_login_msg").textContent = (r.data && r.data.error) ? r.data.error : "Login failed.";
    return;
  }
  $("vw_pw").value="";
  $("vw_login_msg").textContent="";
  await boot();
}

async function doLogout(){
  try{ await apiJson(API.logout, {method:"POST"}); }catch(_e){}
  // clear cookie client-side as a fallback
  document.cookie = COOKIE_NAME + "=; Max-Age=0; path=/";
  document.cookie = COOKIE_NAME + "=; Max-Age=0; path=/; SameSite=Lax";
  // also clear common variants
  document.cookie = "vw_session=; Max-Age=0; path=/";
  document.cookie = "vw_cms_session=; Max-Age=0; path=/";
  location.reload();
}

async function migrateClientsSayIfNeeded(page){
  try{
    const legacy = page?.home?.testimonials?.length;
    const cs = page?.home?.clients_say?.length;
    const enabledLegacy = page?.site?.sections?.testimonials === true;
    if((legacy && !cs) || enabledLegacy) {
      const r = await apiJson(API.migrateClientsSay, {method:"POST"});
      if(r.status===405) return false; // endpoint not enabled on this deploy
      return !!(r.ok && r.data && r.data.ok);
    }
  }catch(e){ console.error(e); }
  return false;
}

function ensureStructure(){
  CURRENT = CURRENT || {};
  CURRENT.site = CURRENT.site || {};
  CURRENT.site.sections = CURRENT.site.sections || {};
  CURRENT.site.section_order = Array.isArray(CURRENT.site.section_order) ? CURRENT.site.section_order : [];
  CURRENT.home = CURRENT.home || {};
  // ensure hero discount data shape
  CURRENT.home.hero_discount = CURRENT.home.hero_discount || {};
  // ensure clients-say
  CURRENT.home.clients_say_section = CURRENT.home.clients_say_section || { title:"What Our Clients Say" };
  CURRENT.home.clients_say = Array.isArray(CURRENT.home.clients_say) ? CURRENT.home.clients_say : [];
  // keep legacy off
  CURRENT.site.sections["testimonials"] = false;
  if(CURRENT.site.section_order.includes("testimonials")) {
    CURRENT.site.section_order = CURRENT.site.section_order.filter(k=>k!=="testimonials");
  }

  // Ensure layout list contains all known keys (do not reorder existing; append missing)
  // This prevents "missing Hero" / "missing Hero Discount" in Website Layout for older saved pages.
  try{
    const order = CURRENT.site.section_order;
    DEFAULT_SECTION_KEYS.forEach(k=>{
      if(!order.includes(k)) order.push(k);
    });
  }catch(e){ /* noop */ }
}

function onChange(fn){
  return (ev)=>{ fn(ev); setDirty(true); };
}

function sectionDetails(title){
  const d = el("details", {});
  const s = el("summary", {}, title);
  d.appendChild(s);
  return d;
}

function render(){
  ensureStructure();
  const host = $("vw_sections");
  host.innerHTML = "";

  // HERO
  const hero = CURRENT.home.hero || (CURRENT.home.hero={});
  {
    const d = sectionDetails("Hero");
    d.appendChild(el("label",null,"Kicker"));
    const kicker = el("input", {value: hero.kicker||""});
    kicker.oninput = onChange(()=>hero.kicker = kicker.value);
    d.appendChild(kicker);

    d.appendChild(el("label",null,"Headline"));
    const headline = el("input", {value: hero.headline||""});
    headline.oninput = onChange(()=>hero.headline = headline.value);
    d.appendChild(headline);

    d.appendChild(el("label",null,"Tagline"));
    const tagline = el("input", {value: hero.tagline||""});
    tagline.oninput = onChange(()=>hero.tagline = tagline.value);
    d.appendChild(tagline);

    d.appendChild(el("label",null,"Subline"));
    const subline = el("input", {value: hero.subline||""});
    subline.oninput = onChange(()=>hero.subline = subline.value);
    d.appendChild(subline);

    d.appendChild(el("label",null,"Hero image URL"));
    const img = el("input", {value: hero.image_url||""});
    img.oninput = onChange(()=>hero.image_url = img.value);
    d.appendChild(img);

    d.appendChild(el("label",null,"Button text"));
    const btxt = el("input", {value: hero.button?.text||""});
    btxt.oninput = onChange(()=>{ hero.button = hero.button||{}; hero.button.text=btxt.value; });
    d.appendChild(btxt);

    d.appendChild(el("label",null,"Button link"));
    const burl = el("input", {value: hero.button?.url||""});
    burl.oninput = onChange(()=>{ hero.button = hero.button||{}; hero.button.url=burl.value; });
    d.appendChild(burl);

    host.appendChild(d);

  // LAYOUT CONTROLS (site-wide)
  {
    const d = sectionDetails("Layout Controls (Site-wide)");
    CURRENT.site.layout = CURRENT.site.layout || {};
    const L = CURRENT.site.layout;

    function selRow(label, options, key){
      const wrap = el("div",{class:"row"});
      const left = el("div");
      left.appendChild(el("label",null,label));
      const s = el("select");
      options.forEach(([val, txt])=>{
        const o = el("option",{value:val}, txt);
        if((L[key]||"") === val) o.selected = true;
        s.appendChild(o);
      });
      s.onchange = onChange(()=>{ L[key]=s.value; });
      left.appendChild(s);
      wrap.appendChild(left);
      return wrap;
    }

    d.appendChild(selRow("Section spacing (top/bottom)", [
      ["sm","Small"],["md","Medium (default)"],["lg","Large"]
    ], "section_pad"));

    d.appendChild(selRow("Site width", [
      ["narrow","Narrow"],["normal","Normal (default)"],["wide","Wide"]
    ], "container"));

    d.appendChild(selRow("Card spacing (gap)", [
      ["tight","Tight"],["normal","Normal (default)"],["spacious","Spacious"]
    ], "gap"));

    d.appendChild(selRow("Hero height", [
      ["short","Short"],["normal","Normal (default)"],["tall","Tall"]
    ], "hero"));

    d.appendChild(selRow("Button size", [
      ["sm","Small"],["md","Normal (default)"],["lg","Large"]
    ], "btn"));

    d.appendChild(selRow("Corner rounding", [
      ["tight","Tight"],["normal","Normal (default)"],["round","Round"]
    ], "radius"));

    d.appendChild(selRow("Text size", [
      ["90","90%"],["100","100% (default)"],["110","110%"]
    ], "font"));

    const reset = el("button",{class:"btn danger",type:"button"},"Reset to Defaults");
    reset.onclick = ()=>{
      CURRENT.site.layout = {};
      setDirty(true);
      location.reload();
    };
    d.appendChild(reset);

    host.appendChild(d);
  }

  // THEME + BRANDING (site-wide)
  {
    const d = sectionDetails("Theme & Branding (Site-wide)");
    CURRENT.site.theme = CURRENT.site.theme || {};
    const T = CURRENT.site.theme;
    T.palette = T.palette || {};
    T.logos = T.logos || { original:{url:""}, patriotic:{url:""}, acu:{url:""} };

    d.appendChild(el("div",{class:"muted"},"Pick a theme preset, then optionally override colors. Logos are URLs (use /media/... from your R2 media library). Default is 3D logos everywhere."));

    // preset
    d.appendChild(el("label",null,"Theme preset"));
    const preset = el("select");
    [
      ["original","Original"],
      ["patriotic","Patriotic (Royal Blue / Red / White)"],
      ["acu","Army ACU (Foliage / Tan / Gray)"],
    ].forEach(([v,txt])=>{
      const o = el("option",{value:v},txt);
      if((T.preset||"original")===v) o.selected = true;
      preset.appendChild(o);
    });
    preset.onchange = onChange(()=>{
      T.preset = preset.value;
      // IMPORTANT: palette overrides lock colors. Clear them when switching presets so preset colors apply.
      if (T.palette && typeof T.palette === "object") {
        Object.keys(T.palette).forEach(k=>{ T.palette[k] = ""; });
      }
      // also clear the visible inputs
      d.querySelectorAll("input[placeholder]").forEach(inp=>{
        if (inp.placeholder && inp.placeholder.includes("#RRGGBB")) inp.value = "";
      });
    });
    d.appendChild(preset);

    // logo mode (you selected B = 3D everywhere)
    d.appendChild(el("label",null,"Logo mode"));
    const lmode = el("select");
    [["3d","3D (recommended)"],["2d","2D"]].forEach(([v,txt])=>{
      const o=el("option",{value:v},txt);
      if((T.logo_mode||"3d")===v) o.selected=true;
      lmode.appendChild(o);
    });
    lmode.onchange = onChange(()=>{ T.logo_mode = lmode.value; });
    d.appendChild(lmode);

    // logo urls per preset
    const logoWrap = el("div",{class:"row"});
    function logoField(key, label){
      const box = el("div");
      box.appendChild(el("label",null,`${label} logo URL`));
      const inp = el("input",{value:(T.logos?.[key]?.url||"")});
      inp.oninput = onChange(()=>{ T.logos = T.logos||{}; T.logos[key]=T.logos[key]||{}; T.logos[key].url = inp.value; });
      box.appendChild(inp);
      return box;
    }
    logoWrap.appendChild(logoField("original","Original"));
    logoWrap.appendChild(logoField("patriotic","Patriotic"));
    logoWrap.appendChild(logoField("acu","Army ACU"));
    d.appendChild(logoWrap);

    d.appendChild(el("div",{class:"muted"},"Color overrides (optional). Leave blank to use the preset defaults."));

    const clear = el("button",{class:"btn",type:"button",style:"margin-top:10px"},"Clear color overrides");
    clear.onclick = ()=>{
      T.palette = T.palette || {};
      Object.keys(T.palette).forEach(k=>{ T.palette[k] = ""; });
      // clear the inputs in this section
      d.querySelectorAll("input[placeholder]").forEach(inp=>{
        if (inp.placeholder && inp.placeholder.includes("#RRGGBB")) inp.value = "";
      });
      setDirty(true);
    };
    d.appendChild(clear);


    function colorRow(k, label){
      const wrap = el("div",{class:"row"});
      const box = el("div");
      box.appendChild(el("label",null,label));
      const inp = el("input",{value:(T.palette[k]||""), placeholder:"#RRGGBB or leave blank"});
      inp.oninput = onChange(()=>{ T.palette[k] = inp.value; });
      box.appendChild(inp);
      wrap.appendChild(box);
      return wrap;
    }
    // These map 1:1 to index.html CSS vars: --navy --dark --gold --white --gray --border --panel
    d.appendChild(colorRow("navy","--navy (page background)"));
    d.appendChild(colorRow("dark","--dark (deep background)"));
    d.appendChild(colorRow("gold","--gold (accent / links / buttons)"));
    d.appendChild(colorRow("white","--white (text on dark)"));
    d

  // TYPOGRAPHY (Site-wide) - guardrailed
  {
    const d = sectionDetails("Typography (Site-wide)");
    CURRENT.site.typography = CURRENT.site.typography || {};
    const T = CURRENT.site.typography;

    const row = el("div",{class:"grid2"});
    function selField(label, key, options){
      const wrap = el("div");
      wrap.appendChild(el("label",null,label));
      const sel = el("select",{});
      options.forEach(o=> sel.appendChild(el("option",{value:o.value}, o.label)));
      sel.value = (T && T[key]) ? String(T[key]) : options[0].value;
      sel.onchange = onChange(()=>{ T[key] = sel.value; pushLiveSitePatch({ typography: T }); });
      wrap.appendChild(sel);
      row.appendChild(wrap);
    }

    selField("Body Font", "body_font", [
      {value:"sans", label:"Sans (Arial/Helvetica)"},
      {value:"serif", label:"Serif (Georgia/Times)"},
    ]);

    selField("Heading Font", "heading_font", [
      {value:"serif", label:"Serif (Georgia/Times)"},
      {value:"sans", label:"Sans (Arial/Helvetica)"},
    ]);

    selField("Base Text Size", "base_size", [
      {value:"14", label:"Small — 14px"},
      {value:"16", label:"Normal — 16px"},
      {value:"18", label:"Large — 18px"},
    ]);

    selField("Line Height", "line_height", [
      {value:"1.5", label:"Tight — 1.5"},
      {value:"1.6", label:"Normal — 1.6"},
      {value:"1.7", label:"Relaxed — 1.7"},
    ]);

    selField("Heading Scale", "heading_scale", [
      {value:"0.9", label:"Compact — 0.9×"},
      {value:"1.0", label:"Default — 1.0×"},
      {value:"1.1", label:"Large — 1.1×"},
      {value:"1.2", label:"XL — 1.2×"},
    ]);

    d.appendChild(el("p",{class:"muted"},"These are safe typography tokens (no custom CSS). Changes apply to the preview immediately; click Save changes to persist."));
    d.appendChild(row);
    host.appendChild(d);
  }
d.appendChild(colorRow("gray","--gray (muted text)"));
    d.appendChild(colorRow("border","--border (lines/borders)"));
    d.appendChild(colorRow("panel","--panel (rgba(...) recommended)"));

    host.appendChild(d);
  }

  }

  
  // ADMIN APPEARANCE (/admin only)
  {
    const d = sectionDetails("Admin Appearance");
    CURRENT.site.adminAppearance = CURRENT.site.adminAppearance || {};
    const A = CURRENT.site.adminAppearance;

    const ADMIN_PRESETS = {
      original:{
        header:"#071940",
        accent:"#CEA25D",
        bg:"#0E1F45",
        card:"rgba(255,255,255,.06)",
        text:"#E9DCC2",
        muted:"rgba(233,220,194,.80)",
        border:"rgba(255,255,255,.18)",
        on_accent:"#071940",
      },
      acu:{
        header:"#4B5320",
        accent:"#C2B280",
        bg:"#1F2A16",
        card:"rgba(255,255,255,.06)",
        text:"#F7F4EE",
        muted:"rgba(247,244,238,.82)",
        border:"rgba(194,178,128,.30)",
        on_accent:"#111827",
      },
      patriotic:{
        header:"#0B3D91",
        accent:"#B22234",
        bg:"#F8FAFC",
        card:"#FFFFFF",
        text:"#0B1220",
        muted:"#475569",
        border:"#E2E8F0",
        on_accent:"#FFFFFF",
      },
    };

    d.appendChild(el("p",{class:"muted"},"Choose a preset for each admin area (guardrailed)."));

    const grid = el("div",{class:"grid2"});
    function presetField(label, key, token){
      const cur = (A && A[key]) ? String(A[key]) : "original";
      const wrap = el("div");
      wrap.appendChild(el("label",null,label));
      const sel = el("select",{});
      ["original","acu","patriotic"].forEach(p=>{
        const val = (ADMIN_PRESETS[p] && ADMIN_PRESETS[p][token]) ? String(ADMIN_PRESETS[p][token]) : "";
        const txt = `${p.toUpperCase()} — ${val}`;
        sel.appendChild(el("option",{value:p}, txt));
      });
      sel.value = (cur in ADMIN_PRESETS) ? cur : "original";
      sel.onchange = onChange(()=>{ A[key] = sel.value; applyAdminAppearance(); });
      wrap.appendChild(sel);
      grid.appendChild(wrap);
    }

    presetField("Admin Header", "header_preset", "header");
    presetField("Admin Accent", "accent_preset", "accent");
    presetField("Admin Background", "bg_preset", "bg");
    presetField("Admin Card", "card_preset", "card");
    presetField("Admin Text", "text_preset", "text");
    presetField("Admin Muted", "muted_preset", "muted");
    presetField("Admin Border", "border_preset", "border");

    d.appendChild(grid);

    // Show the actual color values for each preset (requested)
    const palWrap = el("div",{style:"margin-top:12px"});
    palWrap.appendChild(el("div",{class:"muted",style:"margin-bottom:8px"},"Preset color values:"));
    Object.entries(ADMIN_PRESETS).forEach(([p, vals])=>{
      const box = el("div",{class:"listItem"});
      box.appendChild(el("div",{style:"font-weight:900;margin-bottom:8px"}, p.toUpperCase()));
      const tbl = el("div",{style:"display:grid;grid-template-columns:140px 1fr;gap:8px;align-items:center"});
      Object.entries(vals).forEach(([k,v])=>{
        const sw = el("span",{style:`display:inline-block;width:18px;height:18px;border-radius:6px;border:1px solid rgba(255,255,255,.22);background:${v};margin-right:8px;vertical-align:middle`});
        tbl.appendChild(el("div",{class:"muted"}, k));
        tbl.appendChild(el("div",null, sw, el("span",{class:"pill",style:"font-size:11px"}, String(v))));
      });
      box.appendChild(tbl);
      palWrap.appendChild(box);
    });
    d.appendChild(palWrap);

    const row = el("div",{style:"margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"});
    const applyBtn = el("button",{class:"btn secondary", type:"button"},"Apply");
    applyBtn.onclick = ()=>{ applyAdminAppearance(); toast("Applied admin appearance (not saved)."); };
    row.appendChild(applyBtn);

    const applySaveBtn = el("button",{class:"btn primary", type:"button"},"Apply + Save");
    applySaveBtn.onclick = async()=>{ applyAdminAppearance(); await saveDraft(); toast("Applied and saved admin appearance."); };
    row.appendChild(applySaveBtn);
    const clear = el("button",{class:"btn", type:"button"},"Clear");
    clear.onclick = ()=>{ CURRENT.site.adminAppearance = {}; applyAdminAppearance(); render(); toast("Cleared admin appearance (not saved)."); };
    row.appendChild(clear);
    d.appendChild(row);

    host.appendChild(d);
  }


  // SEO (Site Metadata)
  {
    const d = sectionDetails("SEO (Google + Social Sharing)");
    CURRENT.site.seo = CURRENT.site.seo || {};
    const seo = CURRENT.site.seo;

    d.appendChild(el("label",null,"Page Title (shows in browser tab & Google)"));
    const t = el("input",{value: seo.title || document.title || ""});
    t.oninput = onChange(()=>seo.title = t.value);
    d.appendChild(t);

    d.appendChild(el("label",null,"Meta Description (Google snippet)"));
    const desc = el("textarea",null, seo.description || "");
    desc.oninput = onChange(()=>seo.description = desc.value);
    d.appendChild(desc);

    d.appendChild(el("label",null,"Open Graph Image URL (for Facebook/Instagram share)"));
    const og = el("input",{value: seo.og_image || ""});
    og.oninput = onChange(()=>seo.og_image = og.value);
    d.appendChild(og);

    host.appendChild(d);
  }

// NAV LINKS
  {
    const d = sectionDetails("Header Navigation Links");
    const links = (CURRENT.site.header && Array.isArray(CURRENT.site.header.nav_links)) ? CURRENT.site.header.nav_links : (CURRENT.site.header={nav_links:[]}).nav_links;
    const list = el("div");
    function renderLinks(){
      list.innerHTML = "";
      links.forEach((ln, idx)=>{
        const item = el("div", {class:"listItem"});
        const enRow = el("div", {class:"vwToggleRow"});
        enRow.appendChild(el("span", null, "Enabled"));
        const en = el("input",{type:"checkbox"});
        en.checked = (ln.enabled !== false);
        en.onchange = onChange(()=>ln.enabled = en.checked);
        enRow.appendChild(en);
        item.appendChild(enRow);

        item.appendChild(el("label",null,"Label"));
        const lab=el("input", {value: ln.label||""});
        lab.oninput=onChange(()=>ln.label=lab.value);
        item.appendChild(lab);

        // Link type: external URL vs section jump (guardrailed)
        const allowedKeys = getSectionKeys();
        const isJump = (ln.section_key && allowedKeys.includes(String(ln.section_key))) || (String(ln.url||"").trim().startsWith("#"));

        item.appendChild(el("label",null,"Link type"));
        const typeSel = el("select", null,
          el("option", {value:"url"}, "URL"),
          el("option", {value:"section"}, "Section jump")
        );
        typeSel.value = isJump ? "section" : "url";
        typeSel.onchange = onChange(()=>{
          if(typeSel.value === "section"){
            // default to first available enabled section
            const first = allowedKeys[0] || "";
            ln.section_key = ln.section_key && allowedKeys.includes(String(ln.section_key)) ? String(ln.section_key) : first;
            ln.url = ln.section_key ? ("#" + ln.section_key) : "#";
          } else {
            ln.section_key = "";
            if(String(ln.url||"").trim().startsWith("#")) ln.url = "";
          }
          renderLinks();
        });
        item.appendChild(typeSel);

        item.appendChild(el("label",null,"URL"));
        const url=el("input", {value: ln.url||"", placeholder: typeSel.value==="section" ? "Auto from section" : "https://... or /path"});
        url.disabled = typeSel.value === "section";
        url.oninput=onChange(()=>ln.url=url.value);
        item.appendChild(url);

        item.appendChild(el("label",null,"Section (for jump links)"));
        const keySel = el("select");
        keySel.appendChild(el("option", {value:""}, "(select section)"));
        allowedKeys.forEach(k=> keySel.appendChild(el("option", {value:k}, (SECTION_LABELS[k]||k))));
        keySel.value = ln.section_key && allowedKeys.includes(String(ln.section_key)) ? String(ln.section_key) : "";
        keySel.disabled = typeSel.value !== "section";
        keySel.onchange = onChange(()=>{
          ln.section_key = keySel.value || "";
          ln.url = ln.section_key ? ("#" + ln.section_key) : "#";
        });
        item.appendChild(keySel);

        const actions=el("div", {class:"actions"});
        actions.appendChild(el("button", {class:"btn secondary", type:"button", onclick:()=>{ if(idx>0){ const t=links[idx-1]; links[idx-1]=links[idx]; links[idx]=t; setDirty(true); renderLinks();} } }, "Move Up"));
        actions.appendChild(el("button", {class:"btn secondary", type:"button", onclick:()=>{ if(idx<links.length-1){ const t=links[idx+1]; links[idx+1]=links[idx]; links[idx]=t; setDirty(true); renderLinks();} } }, "Move Down"));
        actions.appendChild(el("button", {class:"btn danger", type:"button", onclick:()=>{ links.splice(idx,1); setDirty(true); renderLinks(); } }, "Delete"));
        item.appendChild(actions);
        list.appendChild(item);
      });
    }
    renderLinks();
    const add = el("button", {class:"btn secondary", type:"button", onclick:()=>{ links.push({label:"",url:"",section_key:""}); setDirty(true); renderLinks(); } }, "Add Nav Link");
    d.appendChild(add);
    d.appendChild(list);
    host.appendChild(d);
  }

  // WHAT OUR CLIENTS SAY
  {
    const d = sectionDetails("What Our Clients Say");
    d.open = false;
    d.appendChild(el("label",null,"Section title"));
    const t = el("input", {value: CURRENT.home.clients_say_section.title||"What Our Clients Say"});
    t.oninput = onChange(()=>CURRENT.home.clients_say_section.title=t.value);
    d.appendChild(t);

    const items = CURRENT.home.clients_say;
    const list = el("div");
    function renderItems(){
      list.innerHTML="";
      items.forEach((it, idx)=>{
        const item = el("div", {class:"listItem"});
        item.appendChild(el("label",null,"Name"));
        const name=el("input", {value: it.name||""});
        name.oninput=onChange(()=>it.name=name.value);
        item.appendChild(name);

        item.appendChild(el("label",null,"Quote (paragraph)"));
        const txt=el("textarea", null, it.text||"");
        txt.oninput=onChange(()=>it.text=txt.value);
        item.appendChild(txt);

        const actions=el("div", {class:"actions"});
        actions.appendChild(el("button", {class:"btn secondary", type:"button", onclick:()=>{ if(idx>0){ const a=items[idx-1]; items[idx-1]=items[idx]; items[idx]=a; setDirty(true); renderItems(); } } }, "Move Up"));
        actions.appendChild(el("button", {class:"btn secondary", type:"button", onclick:()=>{ if(idx<items.length-1){ const a=items[idx+1]; items[idx+1]=items[idx]; items[idx]=a; setDirty(true); renderItems(); } } }, "Move Down"));
        actions.appendChild(el("button", {class:"btn danger", type:"button", onclick:()=>{ items.splice(idx,1); setDirty(true); renderItems(); } }, "Delete"));
        item.appendChild(actions);

        list.appendChild(item);
      });
      if(items.length===0) list.appendChild(el("div", {class:"muted"}, "No quotes yet. Click Add Quote."));
    }
    renderItems();
    d.appendChild(el("button", {class:"btn secondary", type:"button", onclick:()=>{ items.push({name:"",text:""}); setDirty(true); renderItems(); } }, "Add Quote"));
    d.appendChild(list);
    
    host.appendChild(d);
  }

  // SERVICES (cards)
  {
    const d = sectionDetails("Services (Cards)");
    const arr = Array.isArray(CURRENT.home.services) ? CURRENT.home.services : (CURRENT.home.services = []);
    const list = el("div");
    function renderServices(){
      list.innerHTML = "";
      arr.forEach((sv, idx)=>{
        const item = el("div", {class:"listItem"});
        item.appendChild(el("label",null,"Title"));
        const title = el("input",{value: sv.title||""});
        title.oninput = onChange(()=>sv.title = title.value);
        item.appendChild(title);

        item.appendChild(el("label",null,"Text"));
        const text = el("textarea",null, sv.text||"");
        text.oninput = onChange(()=>sv.text = text.value);
        item.appendChild(text);

        item.appendChild(el("label",null,"Image URL"));
        const img = el("input",{value: sv.image||""});
        img.oninput = onChange(()=>sv.image = img.value);
        item.appendChild(img);

        item.appendChild(el("label",null,"Image Alt"));
        const alt = el("input",{value: sv.alt||""});
        alt.oninput = onChange(()=>sv.alt = alt.value);
        item.appendChild(alt);

        const actions = el("div",{class:"actions"});
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx>0){ const a=arr[idx-1]; arr[idx-1]=arr[idx]; arr[idx]=a; setDirty(true); renderServices(); } }},"Move Up"));
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx<arr.length-1){ const a=arr[idx+1]; arr[idx+1]=arr[idx]; arr[idx]=a; setDirty(true); renderServices(); } }},"Move Down"));
        actions.appendChild(el("button",{class:"btn danger",type:"button",onclick:()=>{ arr.splice(idx,1); setDirty(true); renderServices(); }},"Delete"));
        item.appendChild(actions);

        list.appendChild(item);
      });
      if(arr.length===0) list.appendChild(el("div",{class:"muted"},"No service cards yet. Click Add Service."));
    }
    renderServices();
    d.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ arr.push({title:"",text:"",image:"",alt:""}); setDirty(true); renderServices(); }},"Add Service"));
    d.appendChild(list);
    host.appendChild(d);
  }

  // FAQ
  {
    const d = sectionDetails("FAQ");
    const arr = Array.isArray(CURRENT.home.faqs) ? CURRENT.home.faqs : (CURRENT.home.faqs = []);
    const list = el("div");
    function renderFaq(){
      list.innerHTML = "";
      arr.forEach((it, idx)=>{
        const item = el("div",{class:"listItem"});
        item.appendChild(el("label",null,"Question"));
        const q = el("input",{value: it.q||""});
        q.oninput = onChange(()=>it.q=q.value);
        item.appendChild(q);

        item.appendChild(el("label",null,"Answer"));
        const a = el("textarea",null, it.a||"");
        a.oninput = onChange(()=>it.a=a.value);
        item.appendChild(a);

        const actions = el("div",{class:"actions"});
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx>0){ const t=arr[idx-1]; arr[idx-1]=arr[idx]; arr[idx]=t; setDirty(true); renderFaq(); } }},"Move Up"));
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx<arr.length-1){ const t=arr[idx+1]; arr[idx+1]=arr[idx]; arr[idx]=t; setDirty(true); renderFaq(); } }},"Move Down"));
        actions.appendChild(el("button",{class:"btn danger",type:"button",onclick:()=>{ arr.splice(idx,1); setDirty(true); renderFaq(); }},"Delete"));
        item.appendChild(actions);

        list.appendChild(item);
      });
      if(arr.length===0) list.appendChild(el("div",{class:"muted"},"No FAQ items yet. Click Add FAQ."));
    }
    renderFaq();
    d.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ arr.push({q:"",a:""}); setDirty(true); renderFaq(); }},"Add FAQ"));
    d.appendChild(list);
    host.appendChild(d);


  // CHATTANOOGA WEDDING DJ (optional image)
  {
    const d = sectionDetails("Chattanooga Wedding DJ");
    CURRENT.home.chattanooga = CURRENT.home.chattanooga || { title:"", intro:"", cards:[] };
    const C = CURRENT.home.chattanooga;
    C.image_url = C.image_url || "";
    C.image_alt = C.image_alt || "";

    d.appendChild(el("label",null,"Title"));
    const t = el("input",{value:C.title||""}); t.oninput = onChange(()=>C.title=t.value); d.appendChild(t);

    d.appendChild(el("label",null,"Intro text"));
    const intro = el("textarea",null,C.intro||""); intro.oninput = onChange(()=>C.intro=intro.value); d.appendChild(intro);

    d.appendChild(el("label",null,"Optional image URL"));
    const img = el("input",{value:C.image_url||""}); img.oninput = onChange(()=>C.image_url=img.value.trim()); d.appendChild(img);

    d.appendChild(el("label",null,"Image alt text"));
    const alt = el("input",{value:C.image_alt||""}); alt.oninput = onChange(()=>C.image_alt=alt.value); d.appendChild(alt);

    host.appendChild(d);
  }

  // BRAND MEANING (optional image)
  {
    const d = sectionDetails("Brand Meaning");
    CURRENT.home.brand = CURRENT.home.brand || { title:"", paragraphs:[] };
    const B = CURRENT.home.brand;
    B.image_url = B.image_url || "";
    B.image_alt = B.image_alt || "";
    B.paragraphs = B.paragraphs || [];

    d.appendChild(el("label",null,"Title"));
    const bt = el("input",{value:B.title||""}); bt.oninput = onChange(()=>B.title=bt.value); d.appendChild(bt);

    d.appendChild(el("label",null,"Optional image URL"));
    const bimg = el("input",{value:B.image_url||""}); bimg.oninput = onChange(()=>B.image_url=bimg.value.trim()); d.appendChild(bimg);

    d.appendChild(el("label",null,"Image alt text"));
    const balt = el("input",{value:B.image_alt||""}); balt.oninput = onChange(()=>B.image_alt=balt.value); d.appendChild(balt);

    d.appendChild(el("label",null,"Paragraphs"));
    const list = el("div");
    function renderBrandParas(){
      list.innerHTML="";
      (B.paragraphs||[]).forEach((p,i)=>{
        const item = el("div",{class:"listItem"});
        const ta = el("textarea",null,(p && p.text)!=null ? p.text : (p||""));
        ta.oninput = onChange(()=>{ B.paragraphs[i] = {text: ta.value}; });
        item.appendChild(ta);
        item.appendChild(el("button",{class:"btn danger",type:"button",onclick:()=>{ B.paragraphs.splice(i,1); setDirty(true); renderBrandParas(); }},"Remove"));
        list.appendChild(item);
      });
    }
    d.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ B.paragraphs.push({text:""}); setDirty(true); renderBrandParas(); }},"Add paragraph"));
    d.appendChild(list);
    renderBrandParas();

    host.appendChild(d);
  }

  // HERO DISCOUNT
  {
    const d = sectionDetails("Hero Discount");
    const HD = CURRENT.home.hero_discount || (CURRENT.home.hero_discount = {});

    d.appendChild(el("label",null,"Title"));
    const title = el("input",{value: HD.title||""});
    title.oninput = onChange(()=>HD.title=title.value);
    d.appendChild(title);

    d.appendChild(el("label",null,"Subtitle"));
    const sub = el("input",{value: HD.subtitle||""});
    sub.oninput = onChange(()=>HD.subtitle=sub.value);
    d.appendChild(sub);

    d.appendChild(el("label",null,"Body text"));
    const text = el("textarea",null,HD.text||"");
    text.oninput = onChange(()=>HD.text=text.value);
    d.appendChild(text);

    d.appendChild(el("label",null,"Note (small text)"));
    const note = el("textarea",null,HD.note||"");
    note.oninput = onChange(()=>HD.note=note.value);
    d.appendChild(note);

    host.appendChild(d);
  }


  // SERVING YOUR AREA
  {
    const d = sectionDetails("Serving Your Area");
    const SA = CURRENT.home.service_area || (CURRENT.home.service_area = {});

    d.appendChild(el("label",null,"Section title"));
    const t = el("input",{value: SA.title||"Serving Your Area"});
    t.oninput = onChange(()=>SA.title=t.value);
    d.appendChild(t);

    d.appendChild(el("label",null,"Body (HTML allowed: <strong>, <br>, <a>)"));
    const h = el("textarea",null, SA.html||"");
    h.oninput = onChange(()=>SA.html=h.value);
    d.appendChild(h);

    host.appendChild(d);
  }

  // QUOTE BANNER
  {
    const d = sectionDetails("Quote Banner");
    const QB = CURRENT.home.quote_banner || (CURRENT.home.quote_banner = {});

    d.appendChild(el("label",null,"Headline"));
    const hd = el("input",{value: QB.headline||""});
    hd.oninput = onChange(()=>QB.headline=hd.value);
    d.appendChild(hd);

    d.appendChild(el("label",null,"Subtext"));
    const st = el("input",{value: QB.subtext||""});
    st.oninput = onChange(()=>QB.subtext=st.value);
    d.appendChild(st);

    d.appendChild(el("label",null,"Button text"));
    const bt = el("input",{value: QB.button_text||""});
    bt.oninput = onChange(()=>QB.button_text=bt.value);
    d.appendChild(bt);

    d.appendChild(el("label",null,"Button URL"));
    const bu = el("input",{value: QB.button_url||""});
    bu.oninput = onChange(()=>QB.button_url=bu.value);
    d.appendChild(bu);

    host.appendChild(d);
  }

  // SUBMIT A TESTIMONIAL
  {
    const d = sectionDetails("Submit a Testimonial");
    const TS = CURRENT.home.testimonial_section || (CURRENT.home.testimonial_section = {});

    d.appendChild(el("label",null,"Section title"));
    const tt = el("input",{value: TS.title||""});
    tt.oninput = onChange(()=>TS.title=tt.value);
    d.appendChild(tt);

    d.appendChild(el("label",null,"Permission checkbox label"));
    const pl = el("textarea",null, TS.permission_label||"");
    pl.oninput = onChange(()=>TS.permission_label=pl.value);
    d.appendChild(pl);

    d.appendChild(el("label",null,"Note text"));
    const nt = el("textarea",null, TS.note_text||"");
    nt.oninput = onChange(()=>TS.note_text=nt.value);
    d.appendChild(nt);

    host.appendChild(d);
  }

  // FOOTER + SOCIALS
  {
    const d = sectionDetails("Footer + Social Links");
    CURRENT.site.social = CURRENT.site.social || {};
    CURRENT.site.footer = CURRENT.site.footer || {};
    const social = CURRENT.site.social;
    const foot = CURRENT.site.footer;

    CURRENT.site.social_visibility = CURRENT.site.social_visibility || {header:{facebook:true,instagram:true,x:true}, footer:{facebook:true,instagram:true,x:true}};
    const vis = CURRENT.site.social_visibility;
    vis.header = vis.header || {facebook:true,instagram:true,x:true};
    vis.footer = vis.footer || {facebook:true,instagram:true,x:true};
    foot.show_admin_link = (foot.show_admin_link !== false);

    d.appendChild(el("div",{class:"muted"},"Visibility toggles (hide if unchecked)."));
    function chk(label, obj, key){
      const wrap = el("div", {class:"vwToggleRow"});
      wrap.appendChild(el("span", null, label));
      const c = el("input",{type:"checkbox"});
      c.checked = (obj[key] !== false);
      c.onchange = onChange(()=>{ obj[key] = c.checked; });
      wrap.appendChild(c);
      return wrap;
    }

    d.appendChild(chk("Show Facebook in header", vis.header, "facebook"));
    d.appendChild(chk("Show Instagram in header", vis.header, "instagram"));
    d.appendChild(chk("Show X in header", vis.header, "x"));
    d.appendChild(chk("Show Facebook in footer", vis.footer, "facebook"));
    d.appendChild(chk("Show Instagram in footer", vis.footer, "instagram"));
    d.appendChild(chk("Show X in footer", vis.footer, "x"));
    d.appendChild(chk("Show Admin link in footer", foot, "show_admin_link"));

    d.appendChild(el("label",null,"Facebook URL"));
    const fb = el("input",{value: social.facebook||""}); fb.oninput = onChange(()=>social.facebook=fb.value); d.appendChild(fb);
    d.appendChild(el("label",null,"Instagram URL"));
    const ig = el("input",{value: social.instagram||""}); ig.oninput = onChange(()=>social.instagram=ig.value); d.appendChild(ig);
    d.appendChild(el("label",null,"X/Twitter URL"));
    const xx = el("input",{value: social.x||""}); xx.oninput = onChange(()=>social.x=xx.value); d.appendChild(xx);

    d.appendChild(el("label",null,"Footer Tagline"));
    const tag = el("input",{value: foot.tagline||""}); tag.oninput = onChange(()=>foot.tagline=tag.value); d.appendChild(tag);

    d.appendChild(el("label",null,"Phone text"));
    const ph = el("input",{value: foot.phone_text||""}); ph.oninput = onChange(()=>foot.phone_text=ph.value); d.appendChild(ph);
    d.appendChild(el("label",null,"Phone link (tel:)"));
    const phh = el("input",{value: foot.phone_href||""}); phh.oninput = onChange(()=>foot.phone_href=phh.value); d.appendChild(phh);

    d.appendChild(el("label",null,"Email text"));
    const em = el("input",{value: foot.email_text||""}); em.oninput = onChange(()=>foot.email_text=em.value); d.appendChild(em);
    d.appendChild(el("label",null,"Email link (mailto:)"));
    const emm = el("input",{value: foot.email_href||""}); emm.oninput = onChange(()=>foot.email_href=emm.value); d.appendChild(emm);

    d.appendChild(el("label",null,"Address"));
    const ad = el("input",{value: foot.address||""}); ad.oninput = onChange(()=>foot.address=ad.value); d.appendChild(ad);

    d.appendChild(el("label",null,"Copyright"));
    const cp = el("input",{value: foot.copyright||""}); cp.oninput = onChange(()=>foot.copyright=cp.value); d.appendChild(cp);

    host.appendChild(d);
  }

  // QUOTE FORM SETTINGS
  {
    const d = sectionDetails("Request a Quote Form");
    CURRENT.site.forms = CURRENT.site.forms || {};
    CURRENT.site.forms.quote = CURRENT.site.forms.quote || {};
    const q = CURRENT.site.forms.quote;

    d.appendChild(el("label",null,"Send to email"));
    const email = el("input",{value: q.email||""}); email.oninput = onChange(()=>q.email=email.value); d.appendChild(email);

    d.appendChild(el("label",null,"Email subject"));
    const subj = el("input",{value: q.subject||""}); subj.oninput = onChange(()=>q.subject=subj.value); d.appendChild(subj);

    d.appendChild(el("label",null,"Redirect URL after submit"));
    const next = el("input",{value: q.next||""}); next.oninput = onChange(()=>q.next=next.value); d.appendChild(next);

    d.appendChild(el("label",null,"Submit button text"));
    const st = el("input",{value: q.submit_text||""}); st.oninput = onChange(()=>q.submit_text=st.value); d.appendChild(st);

    d.appendChild(el("label",null,"Auto-response message (optional)"));
    const ar = el("textarea",null, q.autoresponse||""); ar.oninput = onChange(()=>q.autoresponse=ar.value); d.appendChild(ar);

    host.appendChild(d);
  }

  // CALENDAR
  {
    const d = sectionDetails("Calendar");
    CURRENT.home.calendar = CURRENT.home.calendar || {};
    d.appendChild(el("label",null,"Google Calendar embed URL"));
    const cu = el("input",{value: CURRENT.home.calendar.embed_url||""});
    cu.oninput = onChange(()=>CURRENT.home.calendar.embed_url=cu.value);
    d.appendChild(cu);
    host.appendChild(d);
  }

  
  

  // ANALYTICS DASHBOARD (Simple Page Views)
  {
    const d = sectionDetails("Analytics (Page Views)");
    d.open = false;
    const msg = el("div",{class:"muted",style:"margin-top:8px"},"");
    const actions = el("div",{class:"actions"});
    const daysSel = el("select",{});
    [7,14,30,60].forEach(n=>daysSel.appendChild(el("option",{value:String(n)}, String(n)+" days")));
    const refreshBtn = el("button",{class:"btn secondary",type:"button"},"Refresh");
    actions.appendChild(daysSel);
    actions.appendChild(refreshBtn);
    d.appendChild(actions);
    d.appendChild(msg);

    const topList = el("div",{style:"margin-top:10px"});
    d.appendChild(topList);

    async function refresh(){
      msg.textContent="Loading…";
      topList.innerHTML="";
      const r = await fetchStats(parseInt(daysSel.value,10)||30);
      if(!r.ok){
        msg.textContent = (r.data && r.data.error) ? r.data.error : ("Failed: "+r.status);
        return;
      }
      const total = r.data.total || 0;
      msg.textContent = "Total page views (last " + r.data.days + " days): " + total;

      const top = r.data.top || [];
      top.forEach((it)=>{
        const row = el("div",{class:"listItem"});
        row.appendChild(el("div",null, el("span",{class:"pill",style:"margin-right:8px"}, String(it.count)), el("span",null, it.path)));
        row.appendChild(el("div",{class:"actions"},
          el("button",{class:"btn secondary",type:"button",onclick:()=>window.open(it.path==="/" ? "/" : it.path, "_blank")},"Open")
        ));
        topList.appendChild(row);
      });
      if(top.length===0) topList.appendChild(el("div",{class:"muted"},"No data yet."));
    }
    refreshBtn.onclick = refresh;

    host.appendChild(d);
  }

  // PAGE DUPLICATION (Landing Pages)
  {
    const d = sectionDetails("Page Duplication (Landing Pages)");
    d.open = false;

    const msg = el("div",{class:"muted",style:"margin-top:8px"},"");
    d.appendChild(msg);

    const controls = el("div",{class:"row"});
    const fromSel = el("select", {});
    const toInp = el("input",{placeholder:"new-page-slug (e.g. weddings)"});
    controls.appendChild(el("div",null, el("label",null,"Duplicate from"), fromSel));
    controls.appendChild(el("div",null, el("label",null,"New slug"), toInp));
    d.appendChild(controls);

    const actions = el("div",{class:"actions"});
    const refreshBtn = el("button",{class:"btn secondary",type:"button"},"Refresh Pages");
    const dupBtn = el("button",{class:"btn primary",type:"button"},"Duplicate Page");
    actions.appendChild(refreshBtn);
    actions.appendChild(dupBtn);
    d.appendChild(actions);

    const list = el("div",{style:"margin-top:10px"});
    d.appendChild(list);

    async function refresh(){
      msg.textContent="Loading pages…";
      fromSel.innerHTML="";
      list.innerHTML="";
      const r = await fetchPages();
      if(!r.ok){ msg.textContent="Failed: "+(r.data && r.data.error ? r.data.error : r.status); return; }
      const pages = (r.data && r.data.pages) ? r.data.pages : [];
      pages.sort();
      pages.forEach(p=>{
        fromSel.appendChild(el("option",{value:p}, p));
      });
      msg.textContent = pages.length ? ("Pages: "+pages.length) : "No pages found.";
      pages.forEach(p=>{
        const url = (p==="home") ? "/" : ("/p/" + p);
        const row = el("div",{class:"listItem"});
        row.appendChild(el("div",null, el("span",{class:"pill",style:"margin-right:8px"}, p), el("span",{class:"muted"},"URL: "+url)));
        row.appendChild(el("div",{class:"actions"},
          el("button",{class:"btn secondary",type:"button",onclick:()=>window.open(url,"_blank")},"Open"),
          el("button",{class:"btn secondary",type:"button",onclick:async()=>{ try{ await navigator.clipboard.writeText(url); alert("Copied: "+url);}catch(e){ prompt("Copy URL:", url);} }},"Copy URL")
        ));
        list.appendChild(row);
      });
    }

    refreshBtn.onclick = refresh;
    dupBtn.onclick = async()=>{
      const from = fromSel.value || "home";
      const to = (toInp.value||"").trim().toLowerCase().replace(/[^a-z0-9\-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
      if(!to){ alert("Enter a new slug (letters/numbers/dashes)."); return; }
      msg.textContent="Duplicating…";
      const r = await duplicatePage(from, to);
      if(!r.ok){ msg.textContent = (r.data && r.data.error) ? r.data.error : ("Failed: "+r.status); return; }
      msg.textContent = "Created: /p/" + to;
      toInp.value="";
      await refresh();
    };

    host.appendChild(d);
    // auto-load list once
    refresh();
  }

// MEDIA LIBRARY (R2)
  {
    const d = sectionDetails("Media Library (R2)");
    d.open = false;

    const prefixWrap = el("div");
    d.appendChild(el("label",null,"Folder (default: images)"));
    const folderInput = el("input",{value:"images"});
    folderInput.oninput = ()=>{};
    d.appendChild(folderInput);

    const actions = el("div",{class:"actions"});
    const refreshBtn = el("button",{class:"btn secondary",type:"button"},"Refresh");
    const uploadInput = el("input",{type:"file",accept:"image/*"});
    uploadInput.style.maxWidth="320px";
    const uploadBtn = el("button",{class:"btn secondary",type:"button"},"Upload Selected");
    actions.appendChild(refreshBtn);
    actions.appendChild(uploadInput);
    actions.appendChild(uploadBtn);
    d.appendChild(actions);

    const msg = el("div",{class:"muted",style:"margin-top:8px"}, "");
    d.appendChild(msg);

    const grid = el("div");
    grid.style.display="grid";
    grid.style.gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))";
    grid.style.gap="10px";
    grid.style.marginTop="10px";
    d.appendChild(grid);

    async function refresh(){
      msg.textContent = "Loading…";
      grid.innerHTML = "";
      const pref = (folderInput.value||"images").trim() || "images";
      const r = await loadMediaList(pref);
      if(!r.ok){
        msg.textContent = (r.data && r.data.error) ? r.data.error : ("Failed: "+r.status);
        return;
      }
      const items = (r.data && r.data.items) ? r.data.items : [];
      msg.textContent = items.length ? ("Showing "+items.length+" file(s) in "+pref) : ("No files found in "+pref);
      items.forEach((it)=>{
        const key = it.key;
        const url = mediaUrlFromKey(key);
        const card = el("div",{class:"listItem"});
        card.style.marginTop="0";
        card.style.padding="10px";
        const img = el("img",{src:url, alt:key});
        img.style.width="100%";
        img.style.height="110px";
        img.style.objectFit="cover";
        img.style.borderRadius="10px";
        card.appendChild(img);
        card.appendChild(el("div",{class:"muted",style:"font-size:12px;margin-top:8px;word-break:break-all"}, key));
        const btns = el("div",{class:"actions"});
        btns.appendChild(el("button",{class:"btn secondary",type:"button",onclick:async()=>{ try{ await navigator.clipboard.writeText(url); alert("Copied URL: "+url);}catch(e){ prompt("Copy this URL:", url);} }},"Copy URL"));
        btns.appendChild(el("button",{class:"btn danger",type:"button",onclick:async()=>{
          if(!confirm("Delete this file from R2?\n\n"+key)) return;
          msg.textContent = "Deleting…";
          const r = await deleteMedia(key);
          if(!r.ok){ msg.textContent = (r.data && r.data.error) ? r.data.error : ("Delete failed: "+r.status); return; }
          msg.textContent = "Deleted: "+key;
          await refresh();
        }},"Delete"));
        card.appendChild(btns);
        grid.appendChild(card);
      });
    }

    refreshBtn.onclick = refresh;
    uploadBtn.onclick = async()=>{
      const file = uploadInput.files && uploadInput.files[0];
      if(!file){ alert("Choose an image first."); return; }
      msg.textContent = "Uploading…";
      const pref = (folderInput.value||"images").trim() || "images";
      const r = await uploadFile(file, pref);
      if(!r.ok){
        msg.textContent = (r.data && r.data.error) ? r.data.error : ("Upload failed: "+r.status);
        return;
      }
      msg.textContent = "Uploaded: " + r.data.url;
      uploadInput.value = "";
      await refresh();
    };

    host.appendChild(d);
  }

// VISIBILITY + ORDER
  {
    const d = sectionDetails("Website Layout (Visibility + Order)");
    d.open = false;
    CURRENT.site.sections = CURRENT.site.sections || {};
    CURRENT.site.section_order = Array.isArray(CURRENT.site.section_order) ? CURRENT.site.section_order : [];
    // Ensure some known keys exist
    const known = ["hero","header-social","services","clients-say","bio","chattanooga-wedding-dj","brand-meaning","hero-discount","calendar","quote-banner","quote","submit-testimonial","footer","footer-social"];
    known.forEach(k=>{ if(!(k in CURRENT.site.sections)) CURRENT.site.sections[k]=true; });

    
    // Register new section key safely (adds to order + defaults Hidden)
    const regWrap = el("div",{class:"row"});
    const newKey = el("input",{placeholder:"new-section-key (e.g. packages)"});
    const addBtn = el("button",{class:"btn secondary",type:"button"},"Register Section");
    regWrap.appendChild(el("div",null, el("label",null,"Add new section key"), newKey));
    regWrap.appendChild(el("div",null, el("label",null,""), addBtn));
    d.appendChild(regWrap);

    addBtn.onclick = ()=>{
      const key = (newKey.value||"").trim();
      if(!key) return alert("Enter a section key.");
      if(!/^[a-z0-9\-]+$/.test(key)) return alert("Use only lowercase letters, numbers, and dashes.");
      if(!(key in CURRENT.site.sections)) CURRENT.site.sections[key] = false; // hidden by default
      if(!CURRENT.site.section_order.includes(key)) CURRENT.site.section_order.push(key);
      newKey.value = "";
      setDirty(true);
      renderLayout();
    };

const list = el("div");
    function renderLayout(){
      list.innerHTML="";
      const order = CURRENT.site.section_order.length ? CURRENT.site.section_order : known.slice();
      // sync back if empty
      if(CURRENT.site.section_order.length===0) CURRENT.site.section_order = order.slice();

      order.forEach((key, idx)=>{
        const item = el("div",{class:"listItem"});
        const on = !!CURRENT.site.sections[key];
        item.appendChild(el("div",null, el("span",{class:"pill",style:"margin-right:8px"}, key), " ", on ? "Visible" : "Hidden"));

        // per-section overrides (optional)
        CURRENT.site.section_overrides = CURRENT.site.section_overrides || {};
        const ov = CURRENT.site.section_overrides[key] || (CURRENT.site.section_overrides[key] = {});
        const ovWrap = el("div",{class:"row stack"});
        const padTop = el("input",{placeholder:"Pad top (e.g. 60px)", value: ov.pad_top || ""});
        const padBot = el("input",{placeholder:"Pad bottom (e.g. 60px)", value: ov.pad_bottom || ""});
        const maxW = el("input",{placeholder:"Max width (e.g. 1100px)", value: ov.max_width || ""});

        padTop.oninput = onChange(()=>{ ov.pad_top = padTop.value.trim(); });
        padBot.oninput = onChange(()=>{ ov.pad_bottom = padBot.value.trim(); });
        maxW.oninput = onChange(()=>{ ov.max_width = maxW.value.trim(); });

        const c1 = el("div"); c1.appendChild(el("label",null,"Override padding top")); c1.appendChild(padTop);
        const c2 = el("div"); c2.appendChild(el("label",null,"Override padding bottom")); c2.appendChild(padBot);
        const c3 = el("div"); c3.appendChild(el("label",null,"Override max width")); c3.appendChild(maxW);
        ovWrap.appendChild(c1); ovWrap.appendChild(c2); ovWrap.appendChild(c3);
        item.appendChild(ovWrap);

        const clear = el("button",{class:"btn secondary",type:"button",onclick:()=>{ delete CURRENT.site.section_overrides[key]; setDirty(true); renderLayout(); }},"Clear Overrides");
        item.appendChild(clear);

        const toggle = el("button",{class:"btn secondary",type:"button",onclick:()=>{ CURRENT.site.sections[key]=!CURRENT.site.sections[key]; setDirty(true); renderLayout(); }}, on ? "Hide" : "Show");
        item.appendChild(toggle);

        const actions = el("div",{class:"actions"});
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx>0){ const a=order[idx-1]; order[idx-1]=order[idx]; order[idx]=a; CURRENT.site.section_order=order; setDirty(true); renderLayout(); } }},"Move Up"));
        actions.appendChild(el("button",{class:"btn secondary",type:"button",onclick:()=>{ if(idx<order.length-1){ const a=order[idx+1]; order[idx+1]=order[idx]; order[idx]=a; CURRENT.site.section_order=order; setDirty(true); renderLayout(); } }},"Move Down"));
        item.appendChild(actions);

        list.appendChild(item);
      });
    }
    renderLayout();
    d.appendChild(list);
    host.appendChild(d);
  }
host.appendChild(d);
  }

  initVisualEditor();

  setStatus("Ready");
}

async function loadPage(slug){
  CURRENT_SLUG = slug || "home";
  setStatus("Loading " + CURRENT_SLUG + "…");
  const r = await apiJson(API.page + "?slug=" + encodeURIComponent(CURRENT_SLUG) + "&mode=draft");
  if(!r.ok){
    if(r.status===401) {
      setStatus("Not logged in");
      showLogin(true);
      return;
    }
    setStatus("Load failed");
    alert("Failed to load page: " + CURRENT_SLUG + " (" + r.status + ")");
    return;
  }
  CURRENT = r.data || {};
  // keep existing migrations working
  if(await migrateClientsSayIfNeeded(CURRENT)) {
    const rr = await apiJson(API.page + "?slug=" + encodeURIComponent(CURRENT_SLUG) + "&mode=draft");
    if(rr.ok) CURRENT = rr.data || CURRENT;
  }
  showLogin(false);
  setDirty(false);
  render();
}

async function loadHome(){
  return await loadPage("home");
}

async function saveDraft(){
  if(!CURRENT) return;
  setStatus("Saving draft…");
  const payload = JSON.parse(JSON.stringify(CURRENT));
  const r = await apiJson(API.page + "?slug=" + encodeURIComponent(CURRENT_SLUG) + "&mode=draft", {
    method:"PUT",
    headers:{"content-type":"application/json"},
    body: JSON.stringify(payload)
  });
  if(!r.ok){
    if(r.status===401) {
      setStatus("Not logged in");
      showLogin(true);
      return;
    }
    setStatus("Save draft failed");
    alert("Save draft failed: " + ((r.data && r.data.error) ? r.data.error : r.status));
    return;
  }
  setDirty(false);
  setStatus("Draft saved");
}

async function publish(){
  if(!CURRENT_SLUG) CURRENT_SLUG = "home";
  const ok = confirm("Publish draft to live site for '" + CURRENT_SLUG + "'?\n\nThis will update the public website.");
  if(!ok) return;
  setStatus("Publishing…");
  const r = await apiJson(API.publish + "?slug=" + encodeURIComponent(CURRENT_SLUG), { method:"POST" });
  if(!r.ok){
    if(r.status===401) { setStatus("Not logged in"); showLogin(true); return; }
    setStatus("Publish failed");
    alert("Publish failed: " + ((r.data && r.data.error) ? r.data.error : r.status));
    return;
  }
  setStatus("Published");
  toast("Published to live.", "success");
}

async function openHistory(){
  try{
    if(!CURRENT_SLUG) CURRENT_SLUG = "home";
    setStatus("Loading history…");
    const r = await apiJson(API.history + "?slug=" + encodeURIComponent(CURRENT_SLUG));
    if(!r.ok){
      if(r.status===401) { setStatus("Not logged in"); showLogin(true); return; }
      setStatus("History failed");
      alert("History failed: " + ((r.data && r.data.error) ? r.data.error : r.status));
      return;
    }
    const items = (r.data && Array.isArray(r.data.items)) ? r.data.items : [];
    setStatus("Ready");
    const wrap = el("div", {style:"position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px"});
    const card = el("div", {class:"card", style:"max-width:820px;width:100%;max-height:80vh;overflow:auto"});
    card.appendChild(el("div", {style:"display:flex;justify-content:space-between;align-items:center;gap:12px"},
      el("div", null,
        el("div", {style:"font-weight:900;font-size:18px"}, "Revision History"),
        el("div", {class:"muted"}, "Last " + HISTORY_KEEP + " publishes for " + CURRENT_SLUG)
      ),
      el("button", {class:"btn secondary", type:"button", onclick:()=>wrap.remove()}, "Close")
    ));
    card.appendChild(el("div", {class:"hr"}));
    if(!items.length){
      card.appendChild(el("div", {class:"muted"}, "No published revisions yet. Publish once to start history."));
    } else {
      items.forEach(it=>{
        const row = el("div", {class:"listItem", style:"display:flex;justify-content:space-between;align-items:center;gap:10px"});
        row.appendChild(el("div", null,
          el("div", {style:"font-weight:800"}, (it.at || "") ),
          el("div", {class:"muted", style:"font-size:12px"}, "ID: " + (it.id || "") + (it.ip ? (" • " + it.ip) : ""))
        ));
        const btn = el("button", {class:"btn danger", type:"button", onclick: async()=>{
          const ok2 = confirm("Restore this revision into Draft?\n\nYou can then preview and publish.");
          if(!ok2) return;
          const rr = await apiJson(API.rollback, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ slug: CURRENT_SLUG, id: it.id, target: "draft" }) });
          if(!rr.ok){ alert("Rollback failed: " + ((rr.data && rr.data.error) ? rr.data.error : rr.status)); return; }
          toast("Restored into draft.", "success");
          wrap.remove();
          await loadPage(CURRENT_SLUG);
        }}, "Restore to Draft");
        row.appendChild(btn);
        card.appendChild(row);
      });
    }
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }catch(e){
    setStatus("History error");
    alert(String(e && e.message ? e.message : e));
  }
}

async function boot(){
  ensureBaseUI();
  const ok = await checkSession();
  if(!ok) {
    setStatus("Not logged in");
    showLogin(true);
    return;
  }
  showLogin(false);
  await loadHome();
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

})()
function applyThemeToAdmin(){
  try{
    const theme = (CURRENT && CURRENT.site && CURRENT.site.theme) ? CURRENT.site.theme : null;
    const preset = (theme && theme.preset) ? String(theme.preset) : "original";
    const presets = {
      original:{navy:"#0F172A", gold:"#D4AF37", bg:"#0b1220", card:"#0f1a34", text:"#e5e7eb", muted:"#9ca3af", border:"rgba(255,255,255,.14)"},
      patriotic:{navy:"#4169E1", gold:"#B22234", bg:"#ffffff", card:"#f8fafc", text:"#0b1220", muted:"#475569", border:"#e2e8f0"},
      acu:{navy:"#4b5320", gold:"#C2B280", bg:"#f7f4ee", card:"#ffffff", text:"#111827", muted:"#4b5563", border:"#d1d5db"}
    };
    const base = presets[preset] || presets.original;
    const palette = (theme && theme.palette) ? theme.palette : {};
    const v = (k)=> (palette && palette[k] && String(palette[k]).trim()) ? String(palette[k]).trim() : base[k];
    const root = document.documentElement;
    root.style.setProperty("--navy", v("navy"));
    root.style.setProperty("--gold", v("gold"));
    root.style.setProperty("--bg", v("bg"));
    root.style.setProperty("--card", v("card"));
    root.style.setProperty("--text", v("text"));
    root.style.setProperty("--muted", v("muted"));
    root.style.setProperty("--border", v("border"));
  }catch(e){/* ignore */}
}

function applyAdminAppearance(){
  try{
    const ap = (CURRENT && CURRENT.site && CURRENT.site.adminAppearance) ? CURRENT.site.adminAppearance : null;
    if(!ap) return;
    const PRE = {
      original:{header:"#071940",accent:"#CEA25D",bg:"#0E1F45",card:"rgba(255,255,255,.06)",text:"#E9DCC2",muted:"rgba(233,220,194,.80)",border:"rgba(255,255,255,.18)",on_accent:"#071940"},
      acu:{header:"#4B5320",accent:"#C2B280",bg:"#1F2A16",card:"rgba(255,255,255,.06)",text:"#F7F4EE",muted:"rgba(247,244,238,.82)",border:"rgba(194,178,128,.30)",on_accent:"#111827"},
      patriotic:{header:"#0B3D91",accent:"#B22234",bg:"#F8FAFC",card:"#FFFFFF",text:"#0B1220",muted:"#475569",border:"#E2E8F0",on_accent:"#FFFFFF"},
    };
    const root = document.documentElement;
    const set = (k,v)=>{ if(typeof v==="string" && v.trim()) root.style.setProperty(k, v.trim()); };
    // Backwards compatible: if user previously saved raw color strings, respect them.
    const pick = (raw, fallback)=>{
      const r = String(raw||"").trim().toLowerCase();
      if(r in PRE) return PRE[r][fallback];
      return String(raw||"").trim() || fallback;
    };
    const hp = (ap.header_preset||"original").toLowerCase();
    const apc = (ap.accent_preset||"original").toLowerCase();
    const bp = (ap.bg_preset||"original").toLowerCase();
    const cp = (ap.card_preset||"original").toLowerCase();
    const tp = (ap.text_preset||"original").toLowerCase();
    const mp = (ap.muted_preset||"original").toLowerCase();
    const bdp = (ap.border_preset||"original").toLowerCase();
    set("--admin-header", (PRE[hp]||PRE.original).header);
    set("--admin-accent", (PRE[apc]||PRE.original).accent);
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-bg", (PRE[bp]||PRE.original).bg);
    set("--admin-card", (PRE[cp]||PRE.original).card);
    set("--admin-text", (PRE[tp]||PRE.original).text);
    set("--admin-muted", (PRE[mp]||PRE.original).muted);
    set("--admin-border", (PRE[bdp]||PRE.original).border);
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
    set("--admin-on-accent", (PRE[apc]||PRE.original).on_accent || "#071940");
  }catch(e){}
}
applyThemeToAdmin();
  applyAdminAppearance();
;

// P0 scaffold: draft/publish/versioning UI hooks (no backend logic yet)
// TODO: integrate with Workers endpoints
