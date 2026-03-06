export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    /* ============================================================
       CORS
       ============================================================ */
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://admin.valorwaveentertainment.com",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    /* ============================================================
       D1 HELPERS
       ============================================================ */
    async function getValue(key, fallback = "") {
      const row = await env.DB.prepare(
        "SELECT value FROM cms WHERE key = ?"
      ).bind(key).first();
      return row?.value ?? fallback;
    }

    async function setValue(key, value) {
      await env.DB.prepare(
        "INSERT INTO cms (key, value) VALUES (?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).bind(key, value).run();
    }

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    /* ============================================================
       DRAFT.JSON
       ============================================================ */
    if (path === "/draft.json") {
      if (request.method === "GET") {
        const value = await getValue("draft", "{}");
        return new Response(value, {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue("draft", body);
        return json({ saved: true });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    /* ============================================================
       PUBLISH.JSON
       ============================================================ */
    if (path === "/publish.json") {
      if (request.method === "GET") {
        const value = await getValue("publish", "{}");
        return new Response(value, {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue("publish", body);
        return json({ published: true });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    /* ============================================================
       CMS THEME
       ============================================================ */
    if (path === "/cms-theme.txt") {
      if (request.method === "GET") {
        const value = await getValue("cms_theme", "");
        return new Response(value, {
          headers: { "Content-Type": "text/plain", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue("cms_theme", body);
        return new Response("OK", { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    /* ============================================================
       SITE THEME
       ============================================================ */
    if (path === "/site-theme.txt") {
      if (request.method === "GET") {
        const value = await getValue("site_theme", "");
        return new Response(value, {
          headers: { "Content-Type": "text/plain", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue("site_theme", body);
        return new Response("OK", { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    /* ============================================================
       IMAGE UPLOAD → GITHUB
       ============================================================ */
    if (path.startsWith("/upload")) {
      if (request.method !== "PUT" && request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
      }

      const filename = path.replace("/upload/", "").trim();
      if (!filename) {
        return new Response("Missing filename", { status: 400, headers: corsHeaders });
      }

      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || "main";
      const token = env.GITHUB_TOKEN;

      if (!owner || !repo || !token) {
        return new Response("GitHub not configured", { status: 500, headers: corsHeaders });
      }

      const bytes = await request.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));

      const githubPath = `images/uploads/${filename}`;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;

      const ghRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: `Upload image ${filename}`,
          content: base64,
          branch
        })
      });

      if (!ghRes.ok) {
        const text = await ghRes.text();
        return new Response(`GitHub error: ${text}`, {
          status: 500,
          headers: corsHeaders
        });
      }

      const ghJson = await ghRes.json();
      const rawUrl =
        ghJson.content?.download_url ||
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${githubPath}`;

      return json({ url: rawUrl });
    }

    /* ============================================================
       FALLBACK
       ============================================================ */
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
