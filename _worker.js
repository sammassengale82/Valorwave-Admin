export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cleanPath = path.split("?")[0]; // strip query params

    // ------------------------------------------------------------
    // AUTH + API ROUTES
    // ------------------------------------------------------------
    if (cleanPath === "/login") return handleLogin(env);
    if (cleanPath === "/callback") return handleCallback(request, env);
    if (cleanPath === "/api/me") return requireAuth(request, env, () => handleMe(request));
    if (cleanPath === "/api/logout") return handleLogout();
    if (cleanPath === "/api/load") return requireAuth(request, env, () => loadSite(env));
    if (cleanPath === "/api/save") return requireAuth(request, env, () => saveSite(request, env));
    if (cleanPath === "/api/upload-image") return requireAuth(request, env, () => uploadImage(request, env));

    // ------------------------------------------------------------
    // STATIC CMS FILES (CSS, JS, PNG, ICO, YAML)
    // ------------------------------------------------------------
    if (
      cleanPath.endsWith(".css") ||
      cleanPath.endsWith(".js") ||
      cleanPath.endsWith(".png") ||
      cleanPath.endsWith(".ico") ||
      cleanPath.endsWith(".yml") ||
      cleanPath.endsWith(".yaml")
    ) {
      const filename = cleanPath.replace("/", "");
      return serveCmsStatic(filename, env);
    }

    // ------------------------------------------------------------
    // FALLBACK → Proxy to CMS UI Pages site
    // ------------------------------------------------------------
    return fetch("https://valorwave-cms-ui.pages.dev" + path);
  }
};



// ------------------------------------------------------------
// SERVE STATIC CMS FILES (from Valorwave-CMS repo)
// ------------------------------------------------------------
async function serveCmsStatic(filename, env) {
  const repo = env.CMS_REPO; // MUST be "Valorwave-CMS"
  const owner = env.GITHUB_OWNER;
  const branch = env.GITHUB_BRANCH;

  const githubRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json"
      }
    }
  );

  if (!githubRes.ok) {
    return new Response("Not found", { status: 404 });
  }

  const data = await githubRes.json();

  if (!data.content) {
    return new Response("Invalid file", { status: 500 });
  }

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
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO; // MUST be "valorwaveentertainment"
  const branch = env.GITHUB_BRANCH;

  const githubRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/index.html?ref=${branch}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json"
      }
    }
  );

  if (!githubRes.ok) return json({ error: "Failed to load site" }, 500);

  return githubRes;
}



// ------------------------------------------------------------
// SAVE SITE CONTENT → Commit to valorwaveentertainment repo
// ------------------------------------------------------------
async function saveSite(request, env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH;

  const body = await request.json();
  const newHtml = body.content || body.html;

  const current = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/index.html?ref=${branch}`,
    {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json"
      }
    }
  );

  const currentData = await current.json();

  const commitBody = {
    message: body.message || "CMS Update",
    content: btoa(newHtml),
    sha: currentData.sha
  };

  const commit = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/index.html`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(commitBody)
    }
  );

  if (!commit.ok) return json({ error: "Failed to save site" }, 500);

  return json({ ok: true });
}



// ------------------------------------------------------------
// IMAGE UPLOAD HANDLER (uploads to valorwaveentertainment repo)
// ------------------------------------------------------------
async function uploadImage(request, env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH;

  const form = await request.formData();
  const file = form.get("file");

  if (!file) return json({ error: "No file uploaded" }, 400);

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const filename = `uploads/${Date.now()}-${file.name}`;

  const upload = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json"
      },
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
