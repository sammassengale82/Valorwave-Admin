// Valor Wave – Worker: GitHub OAuth + GitHub-backed CMS + Admin UI
// ---------------------------------------------------------------

const COOKIE_NAME = "vw_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

// GitHub OAuth
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

// GitHub Repo Config
const GH_OWNER = "sammassengale82";
const GH_REPO = "Valorwave-Admin";
const GH_BRANCH = "main";

// ---------------------------------------------------------------
// Helpers: cookies, HMAC session
// ---------------------------------------------------------------
function randomState() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function setStateCookie(state) {
  return `gh_state=${state}; Path=/; Max-Age=600; Secure; SameSite=Lax`;
}

function getStateCookie(request) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map(p => p.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === "gh_state") return v;
  }
  return null;
}

function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map(p => p.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    const v = p.slice(eq + 1).trim();
    if (k === name) return v;
  }
  return null;
}

function setCookieHeader(token) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function base64url(bytes) {
  const bin = String.fromCharCode(...bytes);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

function base64urlToBytes(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

async function makeSessionToken(sessionSecret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = JSON.stringify({ exp });
  const payloadB64 = base64url(new TextEncoder().encode(payload));
  const sig = await hmacSha256(sessionSecret, payloadB64);
  const sigB64 = base64url(sig);
  return `${payloadB64}.${sigB64}`;
}

async function verifySessionToken(sessionSecret, token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;

  try {
    const expectedSig = await hmacSha256(sessionSecret, payloadB64);
    const givenSig = base64urlToBytes(sigB64);
    if (givenSig.length !== expectedSig.length) return false;

    let diff = 0;
    for (let i = 0; i < givenSig.length; i++) diff |= givenSig[i] ^ expectedSig[i];
    if (diff !== 0) return false;

    const payloadJson = new TextDecoder().decode(base64urlToBytes(payloadB64));
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload.exp !== "number") return false;

    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

function html(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

function noCache(headers = {}) {
  return {
    "cache-control": "no-store, max-age=0",
    ...headers
  };
}

// ---------------------------------------------------------------
// Admin HTML
// ---------------------------------------------------------------
function adminHtml() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Valor Wave Admin</title>
<link rel="stylesheet" href="/admin.css">
</head>
<body>
<div id="app"></div>
<script src="/admin.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------
function ghFileUrl(path) {
  return `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/${path}`;
}

function ghApiUrl(path) {
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/${path}`;
}

async function ghGetFile(path, env) {
  const url = ghFileUrl(path);
  const res = await fetch(url, {
    headers: {
      "accept": "application/vnd.github.raw+json",
      "user-agent": "valorwave-cms-worker"
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
  return await res.json();
}

async function ghGetFileSha(path, env) {
  const url = ghApiUrl(`contents/${encodeURIComponent(path)}`);
  const res = await fetch(url, {
    headers: {
      "accept": "application/vnd.github+json",
      "user-agent": "valorwave-cms-worker"
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub SHA fetch failed: ${res.status}`);
  const j = await res.json();
  return j.sha || null;
}

async function ghPutFile(path, contentObj, message, env) {
  const token = env.GITHUB_TOKEN || "";
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const existingSha = await ghGetFileSha(path, env);
  const url = ghApiUrl(`contents/${encodeURIComponent(path)}`);

  const contentStr = JSON.stringify(contentObj, null, 2);
  const contentB64 = btoa(unescape(encodeURIComponent(contentStr)));

  const body = {
    message,
    content: contentB64,
    branch: GH_BRANCH
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "authorization": `Bearer ${token}`,
      "accept": "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "valorwave-cms-worker"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${txt}`);
  }

  return await res.json();
}

// ---------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------
async function requireSession(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return false;
  const secret = env.SESSION_SECRET || "";
  if (!secret) return false;
  return await verifySessionToken(secret, token);
}

// ---------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // -----------------------------
    // GitHub OAuth: Start
    // -----------------------------
    if (path === "/auth/github/login") {
      const clientId = env.GITHUB_CLIENT_ID || "";
      if (!clientId) {
        return json({ ok: false, error: "GITHUB_CLIENT_ID not configured" }, { status: 500 });
      }

      const state = randomState();
      const redirectUri = new URL("/auth/github/callback", url.origin).toString();

      const authUrl = new URL(GITHUB_AUTH_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "repo read:user user:email");
      authUrl.searchParams.set("state", state);

      return Response.redirect(authUrl.toString(), 302, {
        headers: { "set-cookie": setStateCookie(state) }
      });
    }

    // -----------------------------
    // GitHub OAuth: Callback
    // -----------------------------
    if (path === "/auth/github/callback") {
      const code = url.searchParams.get("code") || "";
      const state = url.searchParams.get("state") || "";
      const cookieState = getStateCookie(request);

      if (!code || !state || !cookieState || state !== cookieState) {
        return json({ ok: false, error: "Invalid OAuth state" }, { status: 400 });
      }

      const clientId = env.GITHUB_CLIENT_ID || "";
      const clientSecret = env.GITHUB_CLIENT_SECRET || "";
      const sessionSecret = env.SESSION_SECRET || "";

      if (!clientId || !clientSecret || !sessionSecret) {
        return json({ ok: false, error: "Missing GitHub or session secrets" }, { status: 500 });
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: new URL("/auth/github/callback", url.origin).toString()
        })
      });

      const tokenJson = await tokenRes.json();
      const accessToken = tokenJson.access_token;
      if (!accessToken) {
        return json({ ok: false, error: "GitHub token exchange failed" }, { status: 500 });
      }

      const userRes = await fetch(GITHUB_USER_URL, {
        headers: {
          "authorization": `Bearer ${accessToken}`,
          "accept": "application/json",
          "user-agent": "valorwave-cms-worker"
        }
      });

      const ghUser = await userRes.json();
      const login = ghUser?.login || "";

      const allowed = (env.GITHUB_ALLOWED_USERS || "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      if (allowed.length && !allowed.includes(login.toLowerCase())) {
        return json({ ok: false, error: "GitHub user not allowed" }, { status: 403 });
      }

      const token = await makeSessionToken(sessionSecret);

      const headers = noCache({
        "set-cookie": setCookieHeader(token),
        "set-cookie-2": "gh_state=; Path=/; Max-Age=0; Secure; SameSite=Lax"
      });

      return Response.redirect("/admin", 302, { headers });
    }

    // -----------------------------
    // CMS: session check
    // -----------------------------
    if (path === "/api/cms/session" && request.method === "GET") {
      const ok = await requireSession(request, env);
      return json({ ok }, { headers: noCache() });
    }

    // -----------------------------
    // CMS: logout
    // -----------------------------
    if (path === "/api/cms/logout" && request.method === "POST") {
      return json(
        { ok: true },
        { headers: noCache({ "set-cookie": clearCookieHeader() }) }
      );
    }

    // -----------------------------
    // CMS: page GET/PUT
    // -----------------------------
    if (path === "/api/cms/page") {
      const slug = url.searchParams.get("slug") || "home";
      const mode = url.searchParams.get("mode") || "published";

      if (request.method === "GET") {
        const draft = mode === "draft";
        const filePath = draft
          ? `cms/draft/${slug}.json`
          : `cms/page/${slug}.json`;

        try {
          const data = await ghGetFile(filePath, env);
          if (!data) return json({ ok: false, error: "Not found" }, { status: 404 });
          return json(data, { headers: noCache() });
        } catch (err) {
          return json({ ok: false, error: "GitHub fetch error" }, { status: 500 });
        }
      }

      if (request.method === "PUT") {
        const authed = await requireSession(request, env);
        if (!authed) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        const filePath = `cms/draft/${slug}.json`;
        try {
          await ghPutFile(filePath, body, `Update draft page: ${slug}`, env);
          return json({ ok: true }, { headers: noCache() });
        } catch (err) {
          return json({ ok: false, error: "GitHub write error" }, { status: 500 });
        }
      }

      return json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    // -----------------------------
    // CMS: publish (draft -> published)
    // -----------------------------
    if (path === "/api/cms/publish" && request.method === "POST") {
      const authed = await requireSession(request, env);
      if (!authed) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

      const body = await request.json().catch(() => ({}));
      const slug = body.slug || "home";

      const draftPath = `cms/draft/${slug}.json`;
      const publishedPath = `cms/page/${slug}.json`;

      try {
        const draftData = await ghGetFile(draftPath, env);
        if (!draftData) {
          return json({ ok: false, error: "Draft not found" }, { status: 404 });
        }

        await ghPutFile(publishedPath, draftData, `Publish page: ${slug}`, env);
        return json({ ok: true }, { headers: noCache() });
      } catch (err) {
        return json({ ok: false, error: "GitHub publish error" }, { status: 500 });
      }
    }

    // -----------------------------
    // Admin UI
    // -----------------------------
    if (path === "/admin" || path === "/admin/") {
      return html(adminHtml(), { headers: noCache() });
    }

    // -----------------------------
    // Static assets
    // -----------------------------
    return env.ASSETS.fetch(request);
  }
};