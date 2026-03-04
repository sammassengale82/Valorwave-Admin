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
      const redirect = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.CALLBACK_URL)}&scope=read:user&state=${state}`;

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
          "Location": "https://admin.valorwaveentertainment.com/admin/admin.html",
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

    // --- EXISTING CMS ROUTES ---
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (path.includes("draft.json") && request.method === "GET") {
      return getFile(env, "draft.json");
    }

    if (path.includes("draft.json") && request.method === "PUT") {
      return putFile(request, env, "draft.json");
    }

    if (path.includes("publish.json") && request.method === "GET") {
      return getFile(env, "publish.json");
    }

    if (path.includes("publish.json") && request.method === "PUT") {
      return putFile(request, env, "publish.json");
    }

    if (path.includes("publish") && request.method === "POST") {
      return publish(env);
    }

    if (path.includes("upload") && request.method === "POST") {
      return upload(request, env);
    }

    return new Response("Not Found", { status: 404, headers: cors() });
  }
};

// --- SESSION HELPERS ---
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

// --- EXISTING FUNCTIONS (unchanged) ---
/* getFile, putFile, publish, upload, cors() remain unchanged */