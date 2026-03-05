export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // --- AUTH PROTECTION ---
    const protectedRoutes = [
      "draft.json",
      "publish.json",
      "publish",
      "upload"
    ];

    const needsAuth = protectedRoutes.some(r => path.includes(r));

    if (needsAuth) {
      const session = getSession(request, env);
      if (!session) {
        return new Response("Unauthorized", {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // --- OAUTH LOGIN ---
    if (path === "/oauth/login") {
      const state = crypto.randomUUID();
      const redirect = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.CALLBACK_URL)}&scope=repo&state=${state}`;

      return Response.redirect(redirect, 302);
    }

    // --- OAUTH CALLBACK ---
    if (path === "/oauth/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      // Exchange code for token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.CALLBACK_URL
        })
      });

      const tokenJson = await tokenRes.json();
      const accessToken = tokenJson.access_token;

      if (!accessToken) {
        return new Response("OAuth failed", { status: 401 });
      }

      // Fetch GitHub user
      const userRes = await fetch("https://api.github.com/user", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      const user = await userRes.json();

      // Validate GitHub username
      if (user.login !== env.GITHUB_OWNER) {
        return new Response("Forbidden", { status: 403 });
      }

      // Create session cookie
      const sessionToken = await createSession(env, user.login);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "https://admin.valorwaveentertainment.com/admin/index.html",
          "Set-Cookie": `cms_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/`
        }
      });
    }

    // --- LOGOUT ---
    if (path === "/auth/logout") {
      return new Response("Logged out", {
        status: 200,
        headers: {
          "Set-Cookie": "cms_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
        }
      });
    }

    // --- CORS ---
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // --- GET draft.json ---
    if (path.includes("draft.json") && request.method === "GET") {
      return getFile(env, "draft.json");
    }

    // --- PUT draft.json (SYNC TO BOTH REPOS) ---
    if (path.includes("draft.json") && request.method === "PUT") {
      return putFile(request, env, "draft.json");
    }

    // --- GET publish.json ---
    if (path.includes("publish.json") && request.method === "GET") {
      return getFile(env, "publish.json");
    }

    // --- PUT publish.json (SYNC TO BOTH REPOS) ---
    if (path.includes("publish.json") && request.method === "PUT") {
      return putFile(request, env, "publish.json");
    }

    // --- PUBLISH (COPY draft → publish IN BOTH REPOS) ---
    if (path.includes("publish") && request.method === "POST") {
      return publish(env);
    }

    // --- IMAGE UPLOAD ---
    if (path.includes("upload") && request.method === "POST") {
      return upload(request, env);
    }

    return new Response("Not Found", { status: 404, headers: cors() });
  }
};

// ============================================================
// SESSION HELPERS
// ============================================================

async function createSession(env, username) {
  const data = JSON.stringify({ username, ts: Date.now() });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_SESSION),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return btoa(data) + "." + signature;
}

function getSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/cms_session=([^;]+)/);
  if (!match) return null;

  const [dataB64, sig] = match[1].split(".");
  if (!dataB64 || !sig) return null;

  const data = atob(dataB64);

  return JSON.parse(data);
}

// ============================================================
// GITHUB FILE HELPERS (NEW)
// ============================================================

async function readFromRepo(env, repo, filename) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${repo}/contents/${filename}`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });

  if (!res.ok) throw new Error("Failed to read " + filename);

  const json = await res.json();
  return atob(json.content);
}

async function writeToRepo(env, repo, filename, content) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${repo}/contents/${filename}`;

  // Check if file exists to get SHA
  const existing = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json"
    }
  });

  let sha = null;
  if (existing.ok) {
    const json = await existing.json();
    sha = json.sha;
  }

  const payload = {
    message: `Update ${filename}`,
    content: btoa(content),
    sha
  };

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error("GitHub write failed: " + err);
  }
}

// ============================================================
// CMS FILE ROUTES (UPDATED FOR DUAL-REPO SYNC)
// ============================================================

async function getFile(env, filename) {
  const content = await readFromRepo(env, env.GITHUB_ADMIN_REPO, filename);
  return new Response(content, { status: 200, headers: cors() });
}

async function putFile(request, env, filename) {
  const body = await request.text();

  // Write to both repos
  await writeToRepo(env, env.GITHUB_ADMIN_REPO, filename, body);
  await writeToRepo(env, env.GITHUB_WEBSITE_REPO, filename, body);

  return new Response("OK", { status: 200, headers: cors() });
}

async function publish(env) {
  // Load draft.json from admin repo
  const draft = await readFromRepo(env, env.GITHUB_ADMIN_REPO, "draft.json");

  // Write publish.json to both repos
  await writeToRepo(env, env.GITHUB_ADMIN_REPO, "publish.json", draft);
  await writeToRepo(env, env.GITHUB_WEBSITE_REPO, "publish.json", draft);

  return new Response("Published", { status: 200, headers: cors() });
}

// ============================================================
// IMAGE UPLOAD (UNCHANGED)
// ============================================================

async function upload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) {
    return new Response("No file", { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();

  const uploadRes = await fetch(env.IMAGE_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.IMAGE_UPLOAD_TOKEN}`
    },
    body: arrayBuffer
  });

  const json = await uploadRes.json();

  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

// ============================================================
// CORS
// ============================================================

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
