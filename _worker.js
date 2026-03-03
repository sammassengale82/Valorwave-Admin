// /_worker.js

import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const manifest = JSON.parse(manifestJSON);

function getMimeType(path) {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".xml")) return "application/xml";
  if (path.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

// GitHub repo config
const GITHUB_OWNER = "sammassengale82";
const GITHUB_REPO = "Valorwave-Admin";
const GITHUB_BRANCH = "main";

const DRAFT_PATH = "admin/drafts/draft.json";
const PUBLISH_PATH = "admin/published/publish.json";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// --- GitHub helpers --------------------------------------------------------

async function githubGetFile(env, path) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "valorwave-cms-worker"
    }
  });

  if (res.status === 404) return { exists: false, content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);

  const data = await res.json();
  const decoded = atob(data.content.replace(/\n/g, ""));
  return { exists: true, content: decoded, sha: data.sha };
}

async function githubPutFile(env, path, content, message, sha = null) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: btoa(content),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "valorwave-cms-worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`);
}

async function getJsonFromGitHub(env, path) {
  const { exists, content } = await githubGetFile(env, path);
  if (!exists || !content) return {};
  try { return JSON.parse(content); } catch { return {}; }
}

async function putJsonToGitHub(env, path, value, message) {
  const current = await githubGetFile(env, path);
  const json = JSON.stringify(value, null, 2);
  await githubPutFile(env, path, json, message, current.exists ? current.sha : null);
}

// --- Worker fetch ----------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Normalize directory paths
    if (path.endsWith("/")) path += "index.html";

    // API: draft
    if (path === "/api/draft") {
      if (request.method === "GET") {
        const data = await getJsonFromGitHub(env, DRAFT_PATH);
        return jsonResponse(data);
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await putJsonToGitHub(env, DRAFT_PATH, body, "Update CMS draft");
        return jsonResponse({ ok: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // API: publish
    if (path === "/api/publish") {
      if (request.method === "GET") {
        const data = await getJsonFromGitHub(env, PUBLISH_PATH);
        return jsonResponse(data);
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await putJsonToGitHub(env, PUBLISH_PATH, body, "Update CMS publish");
        return jsonResponse({ ok: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // Forms
    if (path === "/forms/quote" && request.method === "POST") {
      return new Response("OK", { status: 200 });
    }
    if (path === "/forms/testimonial" && request.method === "POST") {
      return new Response("OK", { status: 200 });
    }

    // Static asset serving via __STATIC_CONTENT
    const key = path.startsWith("/") ? path.slice(1) : path;
    const assetKey = manifest[key];

    if (assetKey) {
      const asset = await env.__STATIC_CONTENT.get(assetKey);
      const type = getMimeType(path);
      return new Response(asset, { headers: { "Content-Type": type } });
    }

    return new Response("Not found", { status: 404 });
  }
};