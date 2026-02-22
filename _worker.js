export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/login") return handleLogin(env);
    if (path === "/callback") return handleCallback(request, env);
    if (path === "/api/logout") return handleLogout();

    if (path === "/api/me") return requireAuth(request, env, handleMe);
    if (path === "/api/github") return requireAuth(request, env, proxyGithub);

    return new Response("Not found", { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

/* LOGIN → GitHub OAuth */
function handleLogin(env) {
  const state = crypto.randomUUID();

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", env.CALLBACK_URL);
  redirect.searchParams.set("scope", "repo read:user user:email");
  redirect.searchParams.set("state", state);

  return Response.redirect(redirect.toString(), 302);
}

/* CALLBACK → exchange code → set cookie → redirect back to CMS UI */
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) return json({ error: "Missing OAuth code" }, 400);

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

  if (!tokenResponse.ok) return json({ error: "OAuth token exchange failed" }, 500);

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) return json({ error: "No access_token in OAuth response" }, 500);

  const cookie = `session=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=None`;

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookie,
      "Location": "https://cms.valorwaveentertainment.com/"
    }
  });
}

/* AUTH GUARD */
async function requireAuth(request, env, handler) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) return json({ error: "Not authenticated" }, 401);

  request.githubToken = match[1];
  return handler(request, env);
}

/* /api/me → GitHub user */
async function handleMe(request, env) {
  const token = request.githubToken;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `token ${token}`,
      "User-Agent": "Valorwave-CMS",
      "Accept": "application/vnd.github+json"
    }
  });

  if (!userRes.ok) return json({ error: "Invalid token" }, 401);

  return json(await userRes.json());
}

/* /api/logout → clear cookie */
function handleLogout() {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": "session=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=None"
    }
  });
}

/* /api/github → proxy GitHub API */
async function proxyGithub(request, env) {
  const token = request.githubToken;
  const body = await request.json();

  const { path, method, body: ghBody, repo, owner } = body;

  const apiUrl = `https://api.github.com/repos/${owner || env.GITHUB_OWNER}/${repo}/contents/${path}`;

  const options = {
    method,
    headers: {
      "Authorization": `token ${token}`,
      "User-Agent": "Valorwave-CMS",
      "Accept": "application/vnd.github+json"
    }
  };

  if (ghBody) options.body = JSON.stringify(ghBody);

  const res = await fetch(apiUrl, options);
  const text = await res.text();

  let jsonOut;
  try {
    jsonOut = JSON.parse(text);
  } catch {
    jsonOut = { raw: text };
  }

  return json(jsonOut, res.status);
}