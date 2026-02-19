export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- ROUTES -------------------------------------------------------------

    // GitHub OAuth login
    if (path === "/cms/login") {
      return handleLogin(env);
    }

    // OAuth callback
    if (path === "/cms/callback") {
      return handleCallback(request, env);
    }

    // API: Load site content
    if (path === "/cms/api/load") {
      return requireAuth(request, env, () => loadSite(env));
    }

    // API: Save site content
    if (path === "/cms/api/save") {
      return requireAuth(request, env, () => saveSite(request, env));
    }

    // Redirect /cms → CMS UI on the SAME domain
    if (path === "/cms" || path === "/cms/") {
      return fetch("https://valorwave-cms.pages.dev/");
}

    return new Response("CMS Worker Active", { status: 200 });
  }
};


// ---------------------------------------------------------------------------
// LOGIN → Redirect user to GitHub OAuth
// ---------------------------------------------------------------------------

function handleLogin(env) {
  const state = crypto.randomUUID();

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", env.CALLBACK_URL);
  redirect.searchParams.set("scope", "repo");
  redirect.searchParams.set("state", state);

  return Response.redirect(redirect.toString(), 302);
}


// ---------------------------------------------------------------------------
// CALLBACK → Exchange code for token → Set session cookie → Redirect to CMS UI
// ---------------------------------------------------------------------------

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing OAuth code", { status: 400 });
  }

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

  if (!tokenData.access_token) {
    return new Response("OAuth token exchange failed", { status: 500 });
  }

  const sessionCookie = `session=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": sessionCookie,
      "Location": "https://valorwaveentertainment.com/cms/"
    }
  });
}


// ---------------------------------------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------------------------------------

async function requireAuth(request, env, handler) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return new Response("Unauthorized", { status: 401 });
  }

  request.githubToken = match[1];
  return handler(request, env);
}


// ---------------------------------------------------------------------------
// LOAD SITE CONTENT
// ---------------------------------------------------------------------------

async function loadSite(env) {
  const response = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/index.html`,
    { method: "GET" }
  );

  if (!response.ok) {
    return new Response("Failed to load site", { status: 500 });
  }

  return response;
}


// ---------------------------------------------------------------------------
// SAVE SITE CONTENT → Commit to GitHub
// ---------------------------------------------------------------------------

async function saveSite(request, env) {
  const body = await request.json();
  const newHtml = body.html;

  const current = await env.GITHUB.fetch(
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/index.html`,
    { method: "GET" }
  );

  const currentData = await current.json();

  const commitBody = {
    message: "CMS Update",
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
    return new Response("Failed to save site", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
