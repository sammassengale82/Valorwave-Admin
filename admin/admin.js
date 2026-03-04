/* SESSION CHECK */
async function checkSession() {
  const res = await fetch("https://valorwave-admin-worker.sammassengale82.workers.dev/draft.json", {
    method: "GET",
    credentials: "include"
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = "/admin/login.html";
  }
}

checkSession();

/* THEME SYSTEM */
const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeSelect").value = savedTheme;

document.getElementById("themeSelect").onchange = e => {
  const t = e.target.value;
  localStorage.setItem("cms-theme", t);
  document.documentElement.setAttribute("data-theme", t);
};

/* GROUP DEFINITIONS */
const groups = {
  Hero: ["hero_title", "hero_subtitle", "hero_button", "hero_image"],
  About: ["about_title", "about_text", "about_image"],
  Services: [
    "service1_title", "service1_text", "service1_image",
    "service2_title", "service2_text", "service2_image",
    "service3_title", "service3_text", "service3_image"
  ],
  Testimonials: ["test1_name", "test1_quote", "test2_name", "test2_quote"],
  Footer: ["footer_text", "footer_logo"],
  SEO: ["meta_title", "meta_description"]
};

let cmsData = {};

/* LOAD DRAFT.JSON */
async function loadDraft() {
  const res = await fetch("/draft.json", { credentials: "include" });
  cmsData = await res.json();
  buildSidebar();
}

loadDraft();

/* SIDEBAR ACCORDION */
function buildSidebar() {
  const list = document.getElementById("fieldList");
  list.innerHTML = "";

  Object.keys(groups).forEach(groupName => {
    const header = document.createElement("div");
    header.className = "group-header";
    header.innerText = groupName;

    const fields = document.createElement("div");
    fields.className = "group-fields";

    groups[groupName].forEach(key => {
      const btn = document.createElement("button");
      btn.innerText = key;
      btn.onclick = () => loadGroup(groupName);
      fields.appendChild(btn);
    });

    header.onclick = () => {
      fields.style.display = fields.style.display === "block" ? "none" : "block";
      loadGroup(groupName);
    };

    list.appendChild(header);
    list.appendChild(fields);
  });
}

/* LOAD FULL GROUP INTO CENTER PANEL */
function loadGroup(groupName) {
  const panel = document.getElementById("editorPanel");
  panel.innerHTML = `<h2>${groupName}</h2>`;

  groups[groupName].forEach(key => {
    const value = cmsData[key] || "";
    const hrefValue = cmsData[key + "__href"] || "";

    const wrapper = document.createElement("div");
    wrapper.className = "field-block";

    wrapper.innerHTML = `
      <label class="field-label">${key}</label>
      <textarea class="field-textarea" data-key="${key}">${value}</textarea>
      <input class="field-link" data-key="${key}__href" placeholder="Link (optional)" value="${hrefValue}">
    `;

    if (key.includes("image")) {
      wrapper.innerHTML += `
        <div class="image-upload-block">
          <input type="file" class="image-input" data-img="${key}" accept="image/*">
          <button class="upload-image-btn" data-img="${key}">Upload Image</button>
        </div>
      `;
    }

    panel.appendChild(wrapper);
  });

  attachListeners();
}

/* FIELD LISTENERS */
function attachListeners() {
  document.querySelectorAll(".field-textarea").forEach(el => {
    el.oninput = e => {
      const key = e.target.dataset.key;
      cmsData[key] = e.target.value;
      updatePreview(key, e.target.value);
    };
  });

  document.querySelectorAll(".field-link").forEach(el => {
    el.oninput = e => {
      const key = e.target.dataset.key;
      cmsData[key] = e.target.value;
    };
  });

  document.querySelectorAll(".upload-image-btn").forEach(btn => {
    btn.onclick = async e => {
      const key = e.target.dataset.img;
      const file = document.querySelector(`input[data-img="${key}"]`).files[0];
      if (!file) return;

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/upload", { method: "POST", credentials: "include", body: form });
      const json = await res.json();

      cmsData[key] = json.url;
      updatePreview(key, json.url);

      alert("Image uploaded: " + json.url);
    };
  });
}

/* LIVE PREVIEW */
function updatePreview(key, value) {
  const iframe = document.getElementById("previewFrame");
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  const el = doc.querySelector(`[data-ve-edit="${key}"]`);
  if (!el) return;

  if (el.tagName === "IMG") {
    el.src = value;
  } else {
    el.innerHTML = value;
  }

  if (cmsData[key + "__href"] && el.tagName === "A") {
    el.href = cmsData[key + "__href"];
  }
}

/* SAVE DRAFT */
document.getElementById("saveDraft").onclick = async () => {
  await fetch("/draft.json", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmsData, null, 2)
  });
  alert("Draft saved.");
};

/* PUBLISH */
document.getElementById("publish").onclick = async () => {
  await fetch("/publish", { method: "POST", credentials: "include" });
  alert("Published!");
};

/* LOGOUT */
document.getElementById("logoutBtn").onclick = async () => {
  await fetch("https://valorwave-admin-worker.sammassengale82.workers.dev/auth/logout", {
    method: "GET",
    credentials: "include"
  });

  window.location.href = "/admin/login.html";
};