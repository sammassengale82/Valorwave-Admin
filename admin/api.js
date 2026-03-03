// api.js — Valorwave CMS API Client (GitHub-backed Worker)

const API = {
  draft: "/drafts",
  publish: "/publish",
  siteTheme: "/site-theme",
  cmsTheme: "/cms-theme",
  upload: "/upload"
};

// Generic request helper
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...options
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// -----------------------------
// Draft
// -----------------------------
export async function loadDraft() {
  return request(API.draft, { method: "GET" });
}

export async function saveDraft(data) {
  return request(API.draft, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

// -----------------------------
// Publish
// -----------------------------
export async function publish(data) {
  return request(API.publish, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

// -----------------------------
// Themes
// -----------------------------
export async function loadSiteTheme() {
  return request(API.siteTheme, { method: "GET" });
}

export async function saveSiteTheme(text) {
  return request(API.siteTheme, {
    method: "PUT",
    body: text
  });
}

export async function loadCmsTheme() {
  return request(API.cmsTheme, { method: "GET" });
}

export async function saveCmsTheme(text) {
  return request(API.cmsTheme, {
    method: "PUT",
    body: text
  });
}

// -----------------------------
// Upload
// -----------------------------
export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(API.upload, {
    method: "POST",
    body: form
  });

  return res.json();
}