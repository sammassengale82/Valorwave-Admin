export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // -----------------------------
    // AUTH + API ROUTES
    // -----------------------------

    // GitHub OAuth login
    if (path === "/login") {
      return handleLogin(env);
    }

    // OAuth callback
    if (path === "/callback") {
      return handleCallback(request, env);
    }

    // Who am I? (uses OAuth token from cookie)
    if (path === "/api/me") {
      return requireAuth(request, env, handleMe);
    }

    // Logout
    if (path === "/api/logout") {
      return handleLogout();
    }

    // Load site content (index.html from repo)
    if (path === "/api/load") {
      return requireAuth(request, env, (req, env) => loadSite(env));
    }

    // Save site content (commit to repo)
    if (path === "/api/save") {
      return requireAuth(request, env, (req, env) => saveSite(req, env));
    }

    // Upload image (commit file to repo)
    if (path === "/api/upload-image") {
      return requireAuth(request, env, (req, env) => uploadImage(req, env));
    }

    // -----------------------------
    // CMS UI STATIC → PAGES PROJECT
    // -----------------------------
    return fetch("https://valorwave-cms-ui.pages.dev" + path, {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body
    });
  }
};

// -----------------------------
// LOGIN → Redirect to GitHub OAuth
// -----------------------------
function handleLogin(env) {
  const state = crypto.randomUUID();

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", env.CALLBACK_URL);
  redirect.searchParams.set("scope", "read:user user:email repo");
  redirect.searchParams.set("state", state);

  return Response.redirect(redirect.toString(), 302);
}

// -----------------------------
// CALLBACK → Exchange code → Set cookie → Redirect to CMS UI
// -----------------------------
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return json({ error: "Missing OAuth code" }, 400);
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.CALLBACK_URL
    })
  });

  if (!tokenResponse.ok) {
    return json({ error: "OAuth token exchange failed" }, 500);
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return json({ error: "No access_token in OAuth response" }, 500);
  }

  const sessionCookie =
    `session=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=None`;

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": sessionCookie,
      "Location": "https://cms.valorwaveentertainment.com/"
    }
  });
}

// -----------------------------
// /api/me → Use OAuth token to fetch GitHub user
// -----------------------------
async function handleMe(request, env) {
  const token = request.githubToken;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      // This form is known to work with OAuth tokens
      "Authorization": `token ${token}`,
      "User-Agent": "Valorwave-CMS",
      "Accept": "application/vnd.github+json"
    }
  });

  if (!userRes.ok) {
    return json({ error: "Invalid token" }, 401);
  }

  const user = await userRes.json();
  return json(user);
}

// -----------------------------
// /api/logout → Clear cookie
// -----------------------------
function handleLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": "session=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=None",
      "Location": "https://cms.valorwaveentertainment.com/login"
    }
  });
}

// -----------------------------
// AUTH MIDDLEWARE
// -----------------------------
async function requireAuth(request, env, handler) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return json({ error: "Unauthorized" }, 401);
  }

  request.githubToken = match[1];
  return handler(request, env);
}

// -----------------------------
// LOAD SITE CONTENT (index.html)
// -----------------------------
async function loadSite(env) {
  const response = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/index.html`,
    { method: "GET" }
  );

  if (!response.ok) {
    return json({ error: "Failed to load site" }, 500);
  }

  // Pass through GitHub's JSON response
  return response;
}

// -----------------------------
// SAVE SITE CONTENT → Commit to GitHub
// -----------------------------
async function saveSite(request, env) {
  const body = await request.json();
  const newHtml = body.content || body.html;

  if (!newHtml) {
    return json({ error: "Missing content" }, 400);
  }

  const current = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/index.html`,
    { method: "GET" }
  );

  if (!current.ok) {
    return json({ error: "Failed to load current file" }, 500);
  }

  const currentData = await current.json();

  const commitBody = {
    message: body.message || "CMS Update",
    content: btoa(newHtml),
    sha: currentData.sha
  };

  const commit = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/index.html`,
    {
      method: "PUT",
      body: JSON.stringify(commitBody)
    }
  );

  if (!commit.ok) {
    return json({ error: "Failed to save site" }, 500);
  }

  return json({ ok: true });
}

// -----------------------------
// IMAGE UPLOAD HANDLER
// -----------------------------
async function uploadImage(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) {
    return json({ error: "No file uploaded" }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const filename = `uploads/${Date.now()}-${file.name}`;

  const upload = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filename}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: "Upload image",
        content: base64
      })
    }
  );

  if (!upload.ok) {
    return json({ error: "Upload failed" }, 500);
  }

  const data = await upload.json();

  return json({
    original: data.content.download_url,
    thumb: data.content.download_url,
    optimized: data.content.download_url
  });
}

// -----------------------------
// JSON HELPER
// -----------------------------
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}