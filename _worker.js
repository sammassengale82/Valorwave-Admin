export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ------------------------------------------------------------
    // AUTH + API ROUTES (unchanged)
    // ------------------------------------------------------------

    if (path === "/login") return handleLogin(env);
    if (path === "/callback") return handleCallback(request, env);
    if (path === "/api/me") return requireAuth(request, env, () => handleMe(request));
    if (path === "/api/logout") return handleLogout();
    if (path === "/api/load") return requireAuth(request, env, () => loadSite(env));
    if (path === "/api/save") return requireAuth(request, env, () => saveSite(request, env));
    if (path === "/api/upload-image") return requireAuth(request, env, () => uploadImage(request, env));

    // ------------------------------------------------------------
    // STATIC CMS FILES (served from Valorwave-CMS repo)
    // ------------------------------------------------------------

    if (path.startsWith("/cms-") || path === "/cms-admin-v2.css" || path === "/themes.css" ||
        path === "/logo.png" || path === "/favicon.ico" || path === "/config.yml") {

      const filename = path.replace("/", "");
      return serveCmsStatic(filename, env);
    }

    // ------------------------------------------------------------
    // FALLBACK → Proxy to CMS UI Pages site
    // ------------------------------------------------------------
    return fetch("https://valorwave-cms-ui.pages.dev" + path);
  }
};



// ------------------------------------------------------------
// SERVE STATIC CMS FILES FROM Valorwave-CMS REPO
// ------------------------------------------------------------
async function serveCmsStatic(filename, env) {
  const res = await env.GITHUB.fetch(
    `/repos/sammassengale82/Valorwave-CMS/contents/${filename}?ref=main`,
    { method: "GET" }
  );

  if (!res.ok) {
    return new Response("Not found", { status: 404 });
  }

  const data = await res.json();

  // Decode base64 safely for binary files
  const binary = Uint8Array.from(atob(data.content), c => c.charCodeAt(0));

  let type = "application/octet-stream";
  if (filename.endsWith(".css")) type = "text/css";
  if (filename.endsWith(".js")) type = "application/javascript";
  if (filename.endsWith(".png")) type = "image/png";
  if (filename.endsWith(".ico")) type = "image/x-icon";
  if (filename.endsWith(".yml") || filename.endsWith(".yaml")) type = "text/yaml";

  return new Response(binary, {
    headers: { "Content-Type": type }
  });
}



// ------------------------------------------------------------
// LOGIN → Redirect user to GitHub OAuth
// ------------------------------------------------------------
function handleLogin(env) {
  const state = crypto.randomUUID();

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", env.CALLBACK_URL);
  redirect.searchParams.set("scope", "repo read:user user:email");
  redirect.searchParams.set("state", state);

  return Response.redirect(redirect.toString(), 302);
}



// ------------------------------------------------------------
// CALLBACK → Exchange code → Set cookie → Redirect to CMS UI
// ------------------------------------------------------------
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) return new Response("Missing OAuth code", { status: 400 });

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.CALLBACK_URL
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) return new Response("OAuth token exchange failed", { status: 500 });

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



// ------------------------------------------------------------
// /api/me → Validate session + return GitHub user
// ------------------------------------------------------------
async function handleMe(request) {
  const token = request.githubToken;

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!userRes.ok) return json({ error: "Invalid token" }, 401);

  const user = await userRes.json();
  return json(user);
}



// ------------------------------------------------------------
// /api/logout → Clear cookie
// ------------------------------------------------------------
function handleLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": "session=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=None",
      "Location": "https://cms.valorwaveentertainment.com/login"
    }
  });
}



// ------------------------------------------------------------
// AUTH MIDDLEWARE
// ------------------------------------------------------------
async function requireAuth(request, env, handler) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) return json({ error: "Unauthorized" }, 401);

  request.githubToken = match[1];
  return handler(request, env);
}



// ------------------------------------------------------------
// LOAD SITE CONTENT (from valorwaveentertainment repo)
// ------------------------------------------------------------
async function loadSite(env) {
  const response = await env.GITHUB.fetch(
    `/repos/sammassengale82/valorwaveentertainment/contents/index.html?ref=main`,
    { method: "GET" }
  );

  if (!response.ok) return json({ error: "Failed to load site" }, 500);

  return response;
}



// ------------------------------------------------------------
// SAVE SITE CONTENT → Commit to valorwaveentertainment repo
// ------------------------------------------------------------
async function saveSite(request, env) {
  const body = await request.json();
  const newHtml = body.content || body.html;

  const current = await env.GITHUB.fetch(
    `/repos/sammassengale82/valorwaveentertainment/contents/index.html?ref=main`,
    { method: "GET" }
  );

  const currentData = await current.json();

  const commitBody = {
    message: body.message || "CMS Update",
    content: btoa(newHtml),
    sha: currentData.sha
  };

  const commit = await env.GITHUB.fetch(
    `/repos/sammassengale82/valorwaveentertainment/contents/index.html`,
    {
      method: "PUT",
      body: JSON.stringify(commitBody)
    }
  );

  if (!commit.ok) return json({ error: "Failed to save site" }, 500);

  return json({ ok: true });
}



// ------------------------------------------------------------
// IMAGE UPLOAD HANDLER (uploads to website repo)
// ------------------------------------------------------------
async function uploadImage(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) return json({ error: "No file uploaded" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const filename = `uploads/${Date.now()}-${file.name}`;

  const upload = await env.GITHUB.fetch(
    `/repos/sammassengale82/valorwaveentertainment/contents/${filename}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: "Upload image",
        content: base64
      })
    }
  );

  if (!upload.ok) return json({ error: "Upload failed" }, 500);

  const data = await upload.json();

  return json({
    original: data.content.download_url,
    thumb: data.content.download_url,
    optimized: data.content.download_url
  });
}



// ------------------------------------------------------------
// JSON HELPER
// ------------------------------------------------------------
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
