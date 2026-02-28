(function () {

  // ============================================================
  // SAFE HELPERS
  // ============================================================
  const qs = (s, p = document) => p.querySelector(s);
  const qsa = (s, p = document) => [...p.querySelectorAll(s)];

  const safe = {
    str(v) { return typeof v === "string" ? v : ""; },
    num(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; },
    url(v) {
      if (typeof v !== "string") return "";
      try { return new URL(v, location.origin).toString(); }
      catch { return ""; }
    }
  };

  // ============================================================
  // PAGE LOAD/SAVE HELPERS
  // ============================================================
  async function loadPage(slug) {
    const res = await fetch(`/api/cms/page?slug=${encodeURIComponent(slug)}&mode=draft`, {
      credentials: "include",
      cache: "no-cache"
    });
    return await res.json();
  }

  async function savePage(slug, data) {
    const res = await fetch(`/api/cms/page?slug=${encodeURIComponent(slug)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  // ============================================================
  // CMS DRAFT + PUBLISH HELPERS  (BLOCK 1)
  // ============================================================
  async function saveDraft(slug, data) {
    const res = await fetch(`/api/cms/page?slug=${encodeURIComponent(slug)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  async function publishPage(slug) {
    const res = await fetch(`/api/cms/publish`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug })
    });
    return await res.json();
  }

  // ============================================================
  // FIELD BINDING (TEXT, HTML, IMG, HREF)
  // ============================================================
  function bindFields(root, dataObj) {
    if (!root || !dataObj) return;

    qsa("[data-cms-text]", root).forEach(el => {
      const key = el.getAttribute("data-cms-text");
      const val = getDeep(dataObj, key);
      if (typeof val === "string") el.textContent = val;
    });

    qsa("[data-cms-html]", root).forEach(el => {
      const key = el.getAttribute("data-cms-html");
      const val = getDeep(dataObj, key);
      if (typeof val === "string") el.innerHTML = val;
    });

    qsa("[data-cms-img]", root).forEach(el => {
      const key = el.getAttribute("data-cms-img");
      const val = safe.url(getDeep(dataObj, key));
      if (val) el.src = val;
    });

    qsa("[data-cms-href]", root).forEach(el => {
      const key = el.getAttribute("data-cms-href");
      const val = safe.url(getDeep(dataObj, key));
      if (val) el.href = val;
    });
  }

  function getDeep(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, k) => acc && acc[k], obj);
  }

  // ============================================================
  // RENDER EDITOR UI
  // ============================================================
  function renderEditor(data, slug) {

    // BLOCK 2 — Track current page data
    window.__CURRENT_PAGE_DATA__ = data;

    // Fill JSON editor
    const editor = qs("#jsonEditor");
    editor.value = JSON.stringify(data, null, 2);

    // Live update preview iframe
    const iframe = qs("#previewFrame");
    iframe.src = `/${slug === "home" ? "" : slug}?vw_preview=1`;

    // Section list
    const list = qs("#sectionList");
    list.innerHTML = "";

    const site = data.site || {};
    const sections = site.dynamic_sections || {};

    Object.keys(sections).forEach(key => {
      const li = document.createElement("li");
      li.textContent = key;
      li.onclick = () => {
        iframe.contentWindow.postMessage({ type: "vw_select_section", key }, "*");
      };
      list.appendChild(li);
    });

    // JSON editor change → update data object
    editor.oninput = () => {
      try {
        const parsed = JSON.parse(editor.value);
        window.__CURRENT_PAGE_DATA__ = parsed;
      } catch { }
    };
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {

    // Page selector
    qs("#pageSelect").onchange = async () => {
      const slug = qs("#pageSelect").value;
      const data = await loadPage(slug);
      renderEditor(data, slug);
    };

    // Load initial page
    (async () => {
      const slug = qs("#pageSelect").value;
      const data = await loadPage(slug);
      renderEditor(data, slug);
    })();

    // Save JSON (draft)
    qs("#saveJsonBtn").onclick = async () => {
      const slug = qs("#pageSelect").value;
      const out = await savePage(slug, window.__CURRENT_PAGE_DATA__);
      alert(out.ok ? "Saved." : "Error saving.");
    };

    // BLOCK 3 — Publish Bar Buttons
    qs("#saveDraftBtn").onclick = async () => {
      qs("#publishMsg").textContent = "Saving draft…";
      const slug = qs("#pageSelect").value;
      const out = await saveDraft(slug, window.__CURRENT_PAGE_DATA__);
      qs("#publishMsg").textContent = out.ok ? "Draft saved." : "Error saving draft.";
    };

    qs("#previewBtn").onclick = () => {
      const slug = qs("#pageSelect").value;
      const url = `/${slug === "home" ? "" : slug}?vw_preview=1`;
      window.open(url, "_blank");
    };

    qs("#publishBtn").onclick = async () => {
      qs("#publishMsg").textContent = "Publishing…";
      const slug = qs("#pageSelect").value;
      const out = await publishPage(slug);
      qs("#publishMsg").textContent = out.ok ? "Published!" : "Error publishing.";
    };
  }

  document.addEventListener("DOMContentLoaded", init);

})();