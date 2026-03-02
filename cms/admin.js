(function () {

  // ============================================================
  // CONFIG: POINT ADMIN UI TO YOUR WORKER BACKEND
  // ============================================================
  const API_BASE = "https://valorwave-admin-worker.sammassengale82.workers.dev";

  // ============================================================
  // BASIC HELPERS
  // ============================================================
  const qs = (s, p = document) => p.querySelector(s);
  const qsa = (s, p = document) => [...p.querySelectorAll(s)];

  // ============================================================
  // PAGE LOAD/SAVE HELPERS
  // ============================================================
  async function loadPage(slug) {
    const res = await fetch(`${API_BASE}/api/cms/page?slug=${encodeURIComponent(slug)}&mode=draft`, {
      credentials: "include",
      cache: "no-cache"
    });
    return await res.json();
  }

  async function saveDraft(slug, data) {
    const res = await fetch(`${API_BASE}/api/cms/page?slug=${encodeURIComponent(slug)}`, {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  async function publishPage(slug) {
    const res = await fetch(`${API_BASE}/api/cms/publish`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug })
    });
    return await res.json();
  }

  // ============================================================
  // MEDIA HELPERS
  // ============================================================
  async function loadMediaList() {
    const res = await fetch(`${API_BASE}/api/cms/media/list`, { credentials: "include" });
    const out = await res.json();
    return out.files || [];
  }

  async function uploadMediaFile(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/cms/media/upload`, {
      method: "POST",
      credentials: "include",
      body: form
    });

    return await res.json();
  }

  async function deleteMediaFile(name) {
    const res = await fetch(`${API_BASE}/api/cms/media/delete?file=${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: "include"
    });
    return await res.json();
  }

  // ============================================================
  // RENDER EDITOR
  // ============================================================
  function renderEditor(data, slug) {
    window.__CURRENT_PAGE_DATA__ = data;

    const mode = data?.site?.theme?.mode || "original";
    document.body.className = `vw-admin theme-${mode}`;
    qsa('input[name="themeMode"]').forEach(r => {
      r.checked = (r.value === mode);
    });

    const editor = qs("#jsonEditor");
    editor.value = JSON.stringify(data, null, 2);

    editor.oninput = () => {
      try {
        const parsed = JSON.parse(editor.value);
        window.__CURRENT_PAGE_DATA__ = parsed;
      } catch { }
    };

    const iframe = qs("#previewFrame");
    iframe.src = `/${slug === "home" ? "" : slug}?vw_preview=1`;

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
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {

    // LOGIN / LOGOUT BUTTONS
    qs("#loginBtn").onclick = () => {
      window.location.href = `${API_BASE}/oauth/login`;
    };

    qs("#logoutBtn").onclick = async () => {
      await fetch(`${API_BASE}/oauth/logout`, {
        method: "POST",
        credentials: "include"
      });
      window.location.reload();
    };

    // Check auth state
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cms/me`, { credentials: "include" });
        const me = await res.json();
        if (me.authenticated) {
          qs("#loginBtn").style.display = "none";
          qs("#logoutBtn").style.display = "inline-block";
        } else {
          qs("#loginBtn").style.display = "inline-block";
          qs("#logoutBtn").style.display = "none";
        }
      } catch {
        qs("#loginBtn").style.display = "inline-block";
        qs("#logoutBtn").style.display = "none";
      }
    })();

    // Load initial page
    (async () => {
      const slug = qs("#pageSelect").value;
      const data = await loadPage(slug);
      renderEditor(data, slug);
    })();

    // Page selector
    qs("#pageSelect").onchange = async () => {
      const slug = qs("#pageSelect").value;
      const data = await loadPage(slug);
      renderEditor(data, slug);
    };

    // Save Draft
    qs("#saveDraftBtn").onclick = async () => {
      qs("#publishMsg").textContent = "Saving draft…";
      const slug = qs("#pageSelect").value;
      const out = await saveDraft(slug, window.__CURRENT_PAGE_DATA__);
      qs("#publishMsg").textContent = out.ok ? "Draft saved." : "Error saving draft.";
    };

    // Preview
    qs("#previewBtn").onclick = () => {
      const slug = qs("#pageSelect").value;
      const url = `/${slug === "home" ? "" : slug}?vw_preview=1`;
      window.open(url, "_blank");
    };

    // Publish
    qs("#publishBtn").onclick = async () => {
      qs("#publishMsg").textContent = "Publishing…";
      const slug = qs("#pageSelect").value;
      const out = await publishPage(slug);
      qs("#publishMsg").textContent = out.ok ? "Published!" : "Error publishing.";
    };

    // TABS
    qsa(".vw-tab").forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute("data-tab");
        qsa(".vw-tab").forEach(b => b.classList.remove("vw-tab-active"));
        qsa(".vw-tab-panel").forEach(p => p.classList.remove("vw-tab-panel-active"));
        btn.classList.add("vw-tab-active");
        qs(`#tab-${tab}`).classList.add("vw-tab-panel-active");
      };
    });

    // MEDIA PANEL
    const dropZone = qs("#mediaDropZone");
    const fileInput = qs("#mediaFileInput");
    const mediaGrid = qs("#mediaGrid");

    async function refreshMediaGrid() {
      mediaGrid.innerHTML = "";
      const files = await loadMediaList();

      files.forEach(f => {
        const item = document.createElement("div");
        item.className = "vw-media-item";

        const img = document.createElement("img");
        img.className = "vw-media-thumb";
        img.src = f.url;
        img.alt = f.name;

        const name = document.createElement("div");
        name.className = "vw-media-name";
        name.textContent = f.name;

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "0.25rem";

        const insertBtn = document.createElement("button");
        insertBtn.className = "vw-btn vw-btn-secondary";
        insertBtn.textContent = "Insert";
        insertBtn.onclick = () => navigator.clipboard.writeText(f.url);

        const copyBtn = document.createElement("button");
        copyBtn.className = "vw-btn vw-btn-ghost";
        copyBtn.textContent = "Copy URL";
        copyBtn.onclick = () => navigator.clipboard.writeText(f.url);

        const delBtn = document.createElement("button");
        delBtn.className = "vw-btn vw-btn-ghost";
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          if (!confirm("Delete this file?")) return;
          const out = await deleteMediaFile(f.name);
          if (out.ok) refreshMediaGrid();
        };

        row.append(insertBtn, copyBtn, delBtn);
        item.append(img, name, row);
        mediaGrid.appendChild(item);
      });
    }

    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add("vw-media-dropzone-hover");
    };

    dropZone.ondragleave = () => {
      dropZone.classList.remove("vw-media-dropzone-hover");
    };

    dropZone.ondrop = async (e) => {
      e.preventDefault();
      dropZone.classList.remove("vw-media-dropzone-hover");
      const files = [...e.dataTransfer.files];
      for (const file of files) await uploadMediaFile(file);
      refreshMediaGrid();
    };

    fileInput.onchange = async () => {
      const files = [...fileInput.files];
      for (const file of files) await uploadMediaFile(file);
      fileInput.value = "";
      refreshMediaGrid();
    };

    qs('[data-tab="media"]').addEventListener("click", () => {
      refreshMediaGrid();
    }, { once: true });

    // THEME PANEL
    qs("#saveThemeBtn").onclick = () => {
      const selected = qs('input[name="themeMode"]:checked')?.value || "original";

      const data = window.__CURRENT_PAGE_DATA__ || {};
      data.site = data.site || {};
      data.site.theme = data.site.theme || {};
      data.site.theme.mode = selected;
      window.__CURRENT_PAGE_DATA__ = data;

      document.body.className = `vw-admin theme-${selected}`;
      qs("#themeMsg").textContent = "Theme updated. Save Draft or Publish to apply.";
    };
  }

  document.addEventListener("DOMContentLoaded", init);

})();
