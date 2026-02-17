// ============================================================
// Valor Wave CMS 2.0 — Cloudflare Worker (FULL)
// - Routing
// - GitHub content backend
// - Image upload to /images
// - GitHub OAuth login
// - Session cookies
// - CMS API
// ============================================================

// Expected bindings in env:
// GITHUB_OWNER
// GITHUB_REPO
// GITHUB_TOKEN
// GITHUB_BRANCH (optional, defaults to main)
// GITHUB_CLIENT_ID
// GITHUB_CLIENT_SECRET
// SESSION_SECRET
// ASSETS (Cloudflare Pages / static assets)

// OAuth config
const OAUTH_REDIRECT = "https://valorwave-cms.sammassengale82.workers.dev/callback";
const OAUTH_SCOPES = "read:user";

// ------------------------------------------------------------
// MAIN FETCH
// ------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // OAuth endpoints
      if (pathname === "/cms/login") {
        return handleLogin(request, env);
      }
      if (pathname === "/callback") {
        return handleCallback(request, env);
      }

      // API routes
      if (pathname.startsWith("/api/")) {
        return handleApi(request, env, ctx);
      }

      // CMS UI
      if (pathname === "/cms" || pathname === "/cms/") {
        return serveCmsHtml(env);
      }

      // Static assets (Pages)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return jsonError("Unhandled error", 500, err);
    }
  }
};

// ------------------------------------------------------------
// JSON HELPERS
// ------------------------------------------------------------

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

function jsonError(message, status = 500, err = null) {
  const body = { error: message };
  if (err) body.details = String(err);
  return json(body, status);
}

// ------------------------------------------------------------
// GITHUB HELPERS
// ------------------------------------------------------------

function githubApiUrl(env, path) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  return `https://api.github.com/repos/${owner}/${repo}/${path}`;
}

async function githubRequest(env, path, init = {}) {
  const token = env.GITHUB_TOKEN;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "valorwave-cms-worker",
    ...init.headers
  };

  const res = await fetch(githubApiUrl(env, path), {
    ...init,
    headers
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { message: `GitHub HTTP ${res.status}` };
    }
    throw new Error(`GitHub error: ${err.message || res.statusText}`);
  }

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getBranch(env) {
  return env.GITHUB_BRANCH || "main";
}

// ------------------------------------------------------------
// GITHUB: LIST FILES UNDER content/
// ------------------------------------------------------------

async function listContentFiles(env) {
  const branch = getBranch(env);
  const tree = await githubRequest(
    env,
    `git/trees/${branch}?recursive=1`
  );

  if (!tree || !tree.tree) return [];

  return tree.tree
    .filter((item) => item.type === "blob" && item.path.startsWith("content/"))
    .map((item) => ({ path: item.path }));
}

// ------------------------------------------------------------
// GITHUB: READ FILE
// ------------------------------------------------------------

async function readContentFile(env, filePath) {
  const branch = getBranch(env);
  const data = await githubRequest(
    env,
    `contents/${encodeURIComponent(filePath)}?ref=${branch}`
  );

  if (!data || !data.content) {
    throw new Error("File not found or invalid content");
  }

  const buff = Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(buff);
}

// ------------------------------------------------------------
// GITHUB: WRITE FILE (create or update)
// ------------------------------------------------------------

async function writeContentFile(env, filePath, content, message) {
  const branch = getBranch(env);

  let sha = undefined;
  try {
    const existing = await githubRequest(
      env,
      `contents/${encodeURIComponent(filePath)}?ref=${branch}`
    );
    sha = existing.sha;
  } catch {
    // new file
  }

  const body = {
    message: message || `Update ${filePath} via CMS`,
    content: btoa(unescape(encodeURIComponent(content))),
    branch
  };

  if (sha) body.sha = sha;

  const res = await githubRequest(
    env,
    `contents/${encodeURIComponent(filePath)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  return res;
}

// ------------------------------------------------------------
// GITHUB: CREATE FOLDER (via .gitkeep)
// ------------------------------------------------------------

async function createFolder(env, folderPath) {
  const normalized = folderPath.replace(/\/+$/, "");
  const gitkeepPath = `${normalized}/.gitkeep`;
  return writeContentFile(env, gitkeepPath, "", `Create folder ${normalized} via CMS`);
}

// ------------------------------------------------------------
// CMS HTML SHELL (fallback)
// ------------------------------------------------------------

async function serveCmsHtml(env) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Valor Wave CMS</title>
  <link rel="stylesheet" href="/cms/admin.css" />
  <link rel="stylesheet" href="/cms/themes.css" />
</head>
<body class="logged-out theme-original">
  <div id="login-screen">
    <img id="login-logo" src="/logo.png" alt="Valor Wave Logo" />
    <h1>Valor Wave CMS</h1>
    <a id="login-btn" href="/cms/login">Login with GitHub</a>
  </div>
  <div id="cms" style="display:none;">
    <!-- Full CMS HTML is served by /cms/index.html via ASSETS -->
  </div>
  <div id="toast-container"></div>
  <script src="/cms/cms-admin-v2.js" defer></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

// ============================================================
// AUTH / SESSION HELPERS (GitHub OAuth)
// ============================================================

function sign(value, secret) {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(value);

  return crypto.subtle
    .importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((cryptoKey) => crypto.subtle.sign("HMAC", cryptoKey, data))
    .then((sig) => {
      const b = new Uint8Array(sig);
      return btoa(String.fromCharCode(...b));
    });
}

async function createSessionCookie(env, username) {
  const value = `user=${username}`;
  const signature = await sign(value, env.SESSION_SECRET);
  const cookie = `${value};sig=${signature}`;

  return `cms_session=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

async function readSessionCookie(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/cms_session=([^;]+)/);
  if (!match) return null;

  const raw = match[1];
  const parts = raw.split(";sig=");
  if (parts.length !== 2) return null;

  const value = parts[0];
  const signature = parts[1];

  const expected = await sign(value, env.SESSION_SECRET);
  if (signature !== expected) return null;

  const username = value.replace("user=", "");
  return { login: username };
}

// ============================================================
// GITHUB OAUTH FLOW
// ============================================================

async function handleLogin(request, env) {
  const state = crypto.randomUUID();

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT)}` +
    `&scope=${encodeURIComponent(OAUTH_SCOPES)}` +
    `&state=${state}`;

  return Response.redirect(url, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) return jsonError("Missing OAuth code", 400);

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: OAUTH_REDIRECT
    })
  });

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    return jsonError("OAuth token exchange failed", 500);
  }

  const accessToken = tokenJson.access_token;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "User-Agent": "valorwave-cms"
    }
  });

  const userJson = await userRes.json();
  if (!userJson.login) {
    return jsonError("Failed to fetch GitHub user", 500);
  }

  const cookie = await createSessionCookie(env, userJson.login);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/cms",
      "Set-Cookie": cookie
    }
  });
}

// ============================================================
// API ROUTER
// ============================================================

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();

  try {
    if (pathname === "/api/files" && method === "GET") {
      return handleListFiles(env);
    }

    if (pathname === "/api/read-file" && method === "POST") {
      return handleReadFile(request, env);
    }

    if (pathname === "/api/write-file" && method === "POST") {
      return handleWriteFile(request, env);
    }

    if (pathname === "/api/new-file" && method === "POST") {
      return handleNewFile(request, env);
    }

    if (pathname === "/api/new-folder" && method === "POST") {
      return handleNewFolder(request, env);
    }

    if (pathname === "/api/upload-image" && method === "POST") {
      return handleUploadImage(request, env);
    }

    if (pathname === "/api/me" && method === "GET") {
      return handleMe(request, env);
    }

    if (pathname === "/api/logout" && method === "POST") {
      return handleLogout(request, env);
    }

    return jsonError("Not found", 404);
  } catch (err) {
    return jsonError("API error", 500, err);
  }
}

// ============================================================
// /api/files
// ============================================================

async function handleListFiles(env) {
  const files = await listContentFiles(env);
  return json(files);
}

// ============================================================
// /api/read-file
// ============================================================

async function handleReadFile(request, env) {
  const body = await request.json();
  const filePath = body.filePath;

  if (!filePath) {
    return jsonError("filePath required", 400);
  }

  try {
    const content = await readContentFile(env, filePath);
    return json({ content });
  } catch (err) {
    return jsonError("Failed to read file", 500, err);
  }
}

// ============================================================
// /api/write-file
// ============================================================

async function handleWriteFile(request, env) {
  const body = await request.json();
  const { filePath, content, message } = body;

  if (!filePath) return jsonError("filePath required", 400);

  try {
    const res = await writeContentFile(env, filePath, content || "", message);
    return json({ ok: true, commit: res.commit && res.commit.sha });
  } catch (err) {
    return jsonError("Failed to write file", 500, err);
  }
}

// ============================================================
// /api/new-file
// ============================================================

async function handleNewFile(request, env) {
  const body = await request.json();
  const { path, content, message } = body;

  if (!path) return jsonError("path required", 400);

  try {
    const res = await writeContentFile(env, path, content || "", message);
    return json({ ok: true, path, commit: res.commit && res.commit.sha });
  } catch (err) {
    return jsonError("Failed to create file", 500, err);
  }
}

// ============================================================
// /api/new-folder
// ============================================================

async function handleNewFolder(request, env) {
  const body = await request.json();
  const { folderPath } = body;

  if (!folderPath) return jsonError("folderPath required", 400);

  try {
    const res = await createFolder(env, folderPath);
    return json({ ok: true, folderPath, commit: res.commit && res.commit.sha });
  } catch (err) {
    return jsonError("Failed to create folder", 500, err);
  }
}

// ============================================================
// /api/me  (real session-based)
// ============================================================

async function handleMe(request, env) {
  const session = await readSessionCookie(request, env);
  if (!session) return json({ login: null });
  return json({ login: session.login });
}

// ============================================================
// /api/logout
// ============================================================

async function handleLogout(request, env) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "cms_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    }
  });
}

// ============================================================
// /api/upload-image  (repo root /images)
// ============================================================

async function handleUploadImage(request, env) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return jsonError("multipart/form-data required", 400);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return jsonError("file field required", 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const ts = Date.now();
  const repoPath = `images/${ts}-${safeName}`;

  const base64Content = btoa(String.fromCharCode(...bytes));

  const branch = getBranch(env);
  let sha = undefined;

  try {
    const existing = await githubRequest(
      env,
      `contents/${encodeURIComponent(repoPath)}?ref=${branch}`
    );
    sha = existing.sha;
  } catch {
    // new file
  }

  const body = {
    message: `Upload image ${repoPath} via CMS`,
    content: base64Content,
    branch
  };
  if (sha) body.sha = sha;

  const res = await githubRequest(
    env,
    `contents/${encodeURIComponent(repoPath)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const publicUrl = `/images/${ts}-${safeName}`;

  return json({
    ok: true,
    original: publicUrl,
    thumb: publicUrl,
    webp: publicUrl,
    optimized: publicUrl,
    commit: res.commit && res.commit.sha
  });
}