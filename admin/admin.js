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

/* THEME SYSTEM (admin UI only) */
const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeSelect").value = savedTheme;

document.getElementById("themeSelect").onchange = e => {
  const t = e.target.value;
  localStorage.setItem("cms-theme", t);
  document.documentElement.setAttribute("data-theme", t);
};

/* GROUP DEFINITIONS — MATCH YOUR JSON KEYS */
const groups = {
  Hero: [
    "hero-h1",
    "hero-logo",
    "hero-kicker",
    "hero-tagline",
    "hero-subline",
    "hero-cta",
    "hero-cta__href"
  ],
  Navigation: [
    "nav-services",
    "nav-availability",
    "nav-hero-discount",
    "nav-request-quote",
    "nav-request-quote__href",
    "nav-client-portal",
    "nav-client-portal__href",
    "header-logo",
    "header-brand-text",
    "header-social-links"
  ],
  Services: [
    "services-heading",
    "service-card-1-image",
    "service-card-1-title",
    "service-card-1-text",
    "service-card-2-image",
    "service-card-2-title",
    "service-card-2-text",
    "service-card-3-image",
    "service-card-3-title",
    "service-card-3-text",
    "service-card-4-image",
    "service-card-4-title",
    "service-card-4-text"
  ],
  "Service Area": [
    "service-area-heading",
    "service-area-text"
  ],
  Bio: [
    "bio-heading",
    "bio-image",
    "bio-name",
    "bio-text-1",
    "bio-text-2",
    "bio-text-3"
  ],
  "Wedding DJ": [
    "wedding-dj-heading",
    "wedding-dj-intro",
    "wedding-dj-card-1-title",
    "wedding-dj-card-1-text",
    "wedding-dj-card-2-title",
    "wedding-dj-card-2-text",
    "wedding-dj-card-3-title",
    "wedding-dj-card-3-text"
  ],
  FAQ: [
    "faq-heading",
    "faq-1",
    "faq-2",
    "faq-3"
  ],
  "Brand Meaning": [
    "brand-meaning-heading",
    "brand-meaning-1",
    "brand-meaning-2",
    "brand-meaning-3"
  ],
  "Hero Discount": [
    "hero-discount-heading",
    "hero-discount-subheading",
    "hero-discount-text-1",
    "hero-discount-text-2"
  ],
  Calendar: [
    "calendar-heading",
    "calendar-intro",
    "calendar-note",
    "calendar-button",
    "calendar-button__href"
  ],
  "Testimonial Form": [
    "testimonial-form-heading",
    "testimonial-form-name",
    "testimonial-form-email",
    "testimonial-form-event-type",
    "testimonial-form-date",
    "testimonial-form-message",
    "testimonial-form-permission",
    "testimonial-form-submit",
    "testimonial-form-footer"
  ],
  Testimonials: [
    "testimonial-heading",
    "testimonial-1-text",
    "testimonial-1-author",
    "testimonial-2-text",
    "testimonial-2-author",
    "testimonial-3-text",
    "testimonial-3-author"
  ],
  Footer: [
    "footer-logo",
    "footer-line-1",
    "footer-line-2",
    "footer-line-3",
    "footer-line-4",
    "footer-social-links"
  ],
  SEO: [
    "meta_title",
    "meta_description",
    "meta_keywords",
    "og_title",
    "og_description",
    "og_image"
  ],
  Google: [
    "google_analytics_id",
    "google_tag_manager_id",
    "google_site_verification"
  ]
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
      // Live preview editing only works if iframe is same-origin
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

/* LIVE PREVIEW (only works if iframe is same-origin) */
function updatePreview(key, value) {
  const iframe = document.getElementById("previewFrame");
  try {
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
  } catch (e) {
    // Cross-origin: cannot touch preview DOM
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