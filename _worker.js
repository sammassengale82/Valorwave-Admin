// Valor Wave Entertainment – Minimal Worker for GitHub OAuth + Admin UI
// ---------------------------------------------------------------
// Responsibilities:
//   - GitHub OAuth login
//   - Issue CMS session cookie (vw_admin)
//   - Serve /admin (static admin UI)
//   - Serve static assets via ASSETS binding
//
// Everything else (CMS storage, media, history, publish, etc.)
// will be added back in later, using GitHub as the backend.
//
// ---------------------------------------------------------------

const COOKIE_NAME = "vw_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

// -----------------------------
// GitHub OAuth Config
// -----------------------------
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

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

// -----------------------------
// Session Token (HMAC)
// -----------------------------
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

// -----------------------------
// Helpers
// -----------------------------
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

// -----------------------------
// Admin HTML (static)
// -----------------------------
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

// -----------------------------
// Worker Entry
// -----------------------------
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
      authUrl.searchParams.set("scope", "read:user user:email");
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

      // Exchange code for token
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

      // Fetch GitHub user
      const userRes = await fetch(GITHUB_USER_URL, {
        headers: {
          "authorization": `Bearer ${accessToken}`,
          "accept": "application/json",
          "user-agent": "valorwave-cms-worker"
        }
      });

      const ghUser = await userRes.json();
      const login = ghUser?.login || "";

      // Restrict to allowed users
      const allowed = (env.GITHUB_ALLOWED_USERS || "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      if (allowed.length && !allowed.includes(login.toLowerCase())) {
        return json({ ok: false, error: "GitHub user not allowed" }, { status: 403 });
      }

      // Issue CMS session cookie
      const token = await makeSessionToken(sessionSecret);

      const headers = noCache({
        "set-cookie": setCookieHeader(token),
        "set-cookie-2": "gh_state=; Path=/; Max-Age=0; Secure; SameSite=Lax"
      });

      return Response.redirect("/admin", 302, { headers });
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