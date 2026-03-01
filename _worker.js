// ============================================================
// Cloudflare Pages + Worker CMS Backend
// GitHub-backed storage for pages, drafts, media, and publish
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve static assets (admin.html, admin.css, admin.js, images, etc.)
    if (await env.ASSETS.fetch(request).then(r => r.status !== 404)) {
      return env.ASSETS.fetch(request);
    }

    // Admin UI route
    if (path === "/admin") {
      return env.ASSETS.fetch(new Request(url.origin + "/admin.html"));
    }

    // API routes
    if (path.startsWith("/api/")) {
      return handleApi(request, env, ctx);
    }

    // Default: serve static site
    return env.ASSETS.fetch(request);
  }
};

// ============================================================
// API ROUTER
// ============================================================

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Require session for all CMS endpoints
  const authed = await requireSession(request, env);
  if (!authed) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // -------------------------------
  // GET PAGE (draft or published)
  // -------------------------------
  if (path === "/api/cms/page" && request.method === "GET") {
    const slug = url.searchParams.get("slug");
    const mode = url.searchParams.get("mode") || "draft";

    const filePath = mode === "draft"
      ? `content/${slug}.json`
      : `published/${slug}.json`;

    const data = await ghGetFile(filePath, env);
    if (!data) return json({ ok: false, error: "Not found" }, { status: 404 });

    return json(data, { headers: noCache() });
  }

  // -------------------------------
  // SAVE PAGE (draft)
  // -------------------------------
  if (path === "/api/cms/page" && request.method === "PUT") {
    const slug = url.searchParams.get("slug");
    const body = await request.json();

    const filePath = `content/${slug}.json`;
    const sha = await ghGetFileSha(filePath, env);

    const ok = await ghPutFile(filePath, JSON.stringify(body, null, 2), sha, `Save draft: ${slug}`, env);
    return json({ ok }, { headers: noCache() });
  }

  // -------------------------------
  // PUBLISH PAGE (draft → published)
  // -------------------------------
  if (path === "/api/cms/publish" && request.method === "POST") {
    const { slug } = await request.json();

    const draftPath = `content/${slug}.json`;
    const publishedPath = `published/${slug}.json`;

    const draft = await ghGetFile(draftPath, env);
    if (!draft) return json({ ok: false, error: "Draft not found" }, { status: 404 });

    const sha = await ghGetFileSha(publishedPath, env);

    const ok = await ghPutFile(
      publishedPath,
      JSON.stringify(draft, null, 2),
      sha,
      `Publish page: ${slug}`,
      env
    );

    return json({ ok }, { headers: noCache() });
  }

  // -------------------------------
  // MEDIA LIST
  // -------------------------------
  if (path === "/api/cms/media/list" && request.method === "GET") {
    const url = ghApiUrl("contents/images/uploads");
    const res = await fetch(url, {
      headers: ghHeaders(env)
    });

    if (!res.ok) return json({ ok: false, error: "GitHub error" }, { status: 500 });

    const files = await res.json();
    const mapped = files.map(f => ({
      name: f.name,
      url: f.download_url,
      size: f.size
    }));

    return json({ ok: true, files: mapped }, { headers: noCache() });
  }

  // -------------------------------
  // MEDIA UPLOAD
  // -------------------------------
  if (path === "/api/cms/media/upload" && request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    if (!file) return json({ ok: false, error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const b64 = btoa(String.fromCharCode(...bytes));

    const filePath = `images/uploads/${file.name}`;
    const sha = await ghGetFileSha(filePath, env);

    const ok = await ghPutFile(
      filePath,
      b64,
      sha,
      `Upload media: ${file.name}`,
      env,
      true // base64 mode
    );

    return json({ ok }, { headers: noCache() });
  }

  // -------------------------------
  // MEDIA DELETE
  // -------------------------------
  if (path === "/api/cms/media/delete" && request.method === "DELETE") {
    const name = url.searchParams.get("file");
    if (!name) return json({ ok: false, error: "Missing file" }, { status: 400 });

    const filePath = `images/uploads/${name}`;
    const sha = await ghGetFileSha(filePath, env);
    if (!sha) return json({ ok: false, error: "Not found" }, { status: 404 });

    const ok = await ghDeleteFile(filePath, sha, `Delete media: ${name}`, env);
    return json({ ok }, { headers: noCache() });
  }

  return json({ ok: false, error: "Unknown API route" }, { status: 404 });
}

// ============================================================
// SESSION CHECK
// ============================================================

async function requireSession(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split("; ").find(c => c.startsWith("vw_session="));
  if (!token) return false;

  const session = token.split("=")[1];
  return session === env.ADMIN_SESSION; // simple session check
}

// ============================================================
// GITHUB HELPERS
// ============================================================

const GH_OWNER = "sammassengale82";
const GH_REPO = "Valorwave-Admin";
const GH_BRANCH = "main";

function ghApiUrl(path) {
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/${path}`;
}

function ghHeaders(env) {
  return {
    "authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "accept": "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "valorwave-cms-worker"
  };
}

async function ghGetFile(path, env) {
  const url = ghApiUrl(`contents/${path}`);
  const res = await fetch(url, { headers: ghHeaders(env) });

  if (!res.ok) return null;

  const json = await res.json();
  const content = atob(json.content || "");
  return JSON.parse(content);
}

async function ghGetFileSha(path, env) {
  const url = ghApiUrl(`contents/${path}`);
  const res = await fetch(url, { headers: ghHeaders(env) });

  if (!res.ok) return null;

  const json = await res.json();
  return json.sha;
}

async function ghPutFile(path, content, sha, message, env, isBase64 = false) {
  const url = ghApiUrl(`contents/${path}`);

  const body = {
    message,
    content: isBase64 ? content : btoa(content),
    branch: GH_BRANCH
  };

  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: ghHeaders(env),
    body: JSON.stringify(body)
  });

  return res.ok;
}

async function ghDeleteFile(path, sha, message, env) {
  const url = ghApiUrl(`contents/${path}`);

  const body = {
    message,
    sha,
    branch: GH_BRANCH
  };

  const res = await fetch(url, {
    method: "DELETE",
    headers: ghHeaders(env),
    body: JSON.stringify(body)
  });

  return res.ok;
}

// ============================================================
// JSON RESPONSE HELPERS
// ============================================================

function json(obj, init = {}) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    status: init.status || 200
  });
}

function noCache() {
  return {
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
  };
}