// /cms/api.js
// Worker API client for Valor Wave CMS (GitHub-backed, OAuth via Cloudflare Worker)

const API_BASE = "/api/cms";

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (res.status === 401) {
    return { unauthorized: true };
  }

  const text = await res.text();
  if (!text) return { ok: res.ok };

  try {
    const json = JSON.parse(text);
    return { ok: res.ok, status: res.status, data: json };
  } catch {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

// -----------------------------
// Session / Auth
// -----------------------------

export async function getSession() {
  return request("/api/session", { method: "GET" });
}

export function loginWithGitHub() {
  window.location.href = "/auth/login";
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}

// -----------------------------
// Pages / Content
// -----------------------------

export async function fetchPage(slug, mode = "draft") {
  const url = `${API_BASE}/page?slug=${encodeURIComponent(slug)}&mode=${encodeURIComponent(mode)}`;
  return request(url, { method: "GET" });
}

export async function saveDraft(slug, data) {
  const url = `${API_BASE}/page?slug=${encodeURIComponent(slug)}&mode=draft`;
  return request(url, {
    method: "PUT",
    body: JSON.stringify(data || {})
  });
}

export async function publishPage(slug) {
  const url = `${API_BASE}/publish?slug=${encodeURIComponent(slug)}`;
  return request(url, { method: "POST" });
}

export async function fetchPages() {
  const url = `${API_BASE}/pages`;
  return request(url, { method: "GET" });
}

export async function duplicatePage(fromSlug, toSlug) {
  const url = `${API_BASE}/duplicate`;
  return request(url, {
    method: "POST",
    body: JSON.stringify({ from_slug: fromSlug, to_slug: toSlug })
  });
}

// -----------------------------
// History / Rollback
// -----------------------------

export async function fetchHistory(slug) {
  const url = `${API_BASE}/history?slug=${encodeURIComponent(slug)}`;
  return request(url, { method: "GET" });
}

export async function rollbackPage(slug, commitSha) {
  const url = `${API_BASE}/rollback`;
  return request(url, {
    method: "POST",
    body: JSON.stringify({ slug, commit: commitSha })
  });
}
