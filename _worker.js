const DEFAULT_DRAFT = {
  "site_theme": "original",

  "hero-h1": "",
  "hero-logo": "",
  "hero-kicker": "",
  "hero-tagline": "",
  "hero-subline": "",
  "hero-cta": "",
  "hero-cta__href": "",

  "nav-services": "",
  "nav-availability": "",
  "nav-hero-discount": "",
  "nav-request-quote": "",
  "nav-request-quote__href": "",
  "nav-client-portal": "",
  "nav-client-portal__href": "",
  "header-logo": "",
  "header-brand-text": "",
  "header-social-links": "",

  "services-heading": "",
  "service-card-1-image": "",
  "service-card-1-title": "",
  "service-card-1-text": "",
  "service-card-2-image": "",
  "service-card-2-title": "",
  "service-card-2-text": "",
  "service-card-3-image": "",
  "service-card-3-title": "",
  "service-card-3-text": "",
  "service-card-4-image": "",
  "service-card-4-title": "",
  "service-card-4-text": "",

  "service-area-heading": "",
  "service-area-text": "",

  "bio-heading": "",
  "bio-image": "",
  "bio-name": "",
  "bio-text-1": "",
  "bio-text-2": "",
  "bio-text-3": "",

  "wedding-dj-heading": "",
  "wedding-dj-intro": "",
  "wedding-dj-card-1-title": "",
  "wedding-dj-card-1-text": "",
  "wedding-dj-card-2-title": "",
  "wedding-dj-card-2-text": "",
  "wedding-dj-card-3-title": "",
  "wedding-dj-card-3-text": "",

  "faq-heading": "",
  "faq-1": "",
  "faq-2": "",
  "faq-3": "",

  "brand-meaning-heading": "",
  "brand-meaning-1": "",
  "brand-meaning-2": "",
  "brand-meaning-3": "",

  "hero-discount-heading": "",
  "hero-discount-subheading": "",
  "hero-discount-text-1": "",
  "hero-discount-text-2": "",

  "calendar-heading": "",
  "calendar-intro": "",
  "calendar-note": "",
  "calendar-button": "",
  "calendar-button__href": "",

  "testimonial-form-heading": "",
  "testimonial-form-name": "",
  "testimonial-form-email": "",
  "testimonial-form-event-type": "",
  "testimonial-form-date": "",
  "testimonial-form-message": "",
  "testimonial-form-permission": "",
  "testimonial-form-submit": "",
  "testimonial-form-footer": "",

  "testimonial-heading": "",
  "testimonial-1-text": "",
  "testimonial-1-author": "",
  "testimonial-2-text": "",
  "testimonial-2-author": "",
  "testimonial-3-text": "",
  "testimonial-3-author": "",

  "footer-logo": "",
  "footer-line-1": "",
  "footer-line-2": "",
  "footer-line-3": "",
  "footer-line-4": "",
  "footer-social-links": "",

  "meta_title": "",
  "meta_description": "",
  "meta_keywords": "",
  "og_title": "",
  "og_description": "",
  "og_image": "",

  "google_analytics_id": "",
  "google_tag_manager_id": "",
  "google_site_verification": ""
};

async function ensureSeed(env) {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS cms (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const row = await env.DB.prepare(
    "SELECT key FROM cms WHERE key = 'draft'"
  ).first();

  if (!row) {
    await env.DB.prepare(`
      INSERT INTO cms (key, value) VALUES
        ('draft', ?),
        ('publish', '{}'),
        ('cms_theme', 'original'),
        ('site_theme', 'original')
    `).bind(JSON.stringify(DEFAULT_DRAFT)).run();
  }
}

async function getValue(env, key, fallback = "") {
  const row = await env.DB.prepare(
    "SELECT value FROM cms WHERE key = ?"
  ).bind(key).first();
  return row?.value ?? fallback;
}

async function setValue(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO cms (key, value) VALUES (?, ?) " +
    "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, value).run();
}

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://admin.valorwaveentertainment.com",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    await ensureSeed(env);

    // DRAFT.JSON
    if (path === "/draft.json") {
      if (request.method === "GET") {
        const value = await getValue(env, "draft", JSON.stringify(DEFAULT_DRAFT));
        return new Response(value, {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue(env, "draft", body);
        return jsonResponse({ saved: true }, corsHeaders);
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // PUBLISH.JSON (raw)
    if (path === "/publish.json") {
      if (request.method === "GET") {
        const value = await getValue(env, "publish", "{}");
        return new Response(value, {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue(env, "publish", body);
        return jsonResponse({ published: true }, corsHeaders);
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // PUBLISH PIPELINE: copy draft → publish
    if (path === "/publish" && request.method === "POST") {
      const draft = await getValue(env, "draft", JSON.stringify(DEFAULT_DRAFT));
      await setValue(env, "publish", draft);
      return jsonResponse({ published: true }, corsHeaders);
    }

    // CMS THEME
    if (path === "/cms-theme.txt") {
      if (request.method === "GET") {
        const value = await getValue(env, "cms_theme", "original");
        return new Response(value, {
          headers: { "Content-Type": "text/plain", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue(env, "cms_theme", body);
        return new Response("OK", { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // SITE THEME
    if (path === "/site-theme.txt") {
      if (request.method === "GET") {
        const value = await getValue(env, "site_theme", "original");
        return new Response(value, {
          headers: { "Content-Type": "text/plain", ...corsHeaders }
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        await setValue(env, "site_theme", body);
        return new Response("OK", { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // PREVIEW LOADER: draft + site_theme
    if (path === "/preview.json" && request.method === "GET") {
      const draft = await getValue(env, "draft", JSON.stringify(DEFAULT_DRAFT));
      const theme = await getValue(env, "site_theme", "original");
      return jsonResponse(
        {
          theme,
          data: JSON.parse(draft)
        },
        corsHeaders
      );
    }

    // RESET ENDPOINT: reset CMS to defaults
    if (path === "/reset-cms" && request.method === "POST") {
      await env.DB.exec("DELETE FROM cms;");
      await env.DB.prepare(`
        INSERT INTO cms (key, value) VALUES
          ('draft', ?),
          ('publish', '{}'),
          ('cms_theme', 'original'),
          ('site_theme', 'original')
      `).bind(JSON.stringify(DEFAULT_DRAFT)).run();

      return jsonResponse({ reset: true }, corsHeaders);
    }

    // IMAGE UPLOAD → GITHUB
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

      return jsonResponse({ url: rawUrl }, corsHeaders);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};