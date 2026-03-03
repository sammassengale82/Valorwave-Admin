// _worker.js — Valorwave Admin Worker (Final Theme-Integrated Version)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // -------------------------------
    // ROUTING
    // -------------------------------
    if (path === "/api/draft" && request.method === "GET") {
      return readFile(env, "draft.json");
    }

    if (path === "/api/draft" && request.method === "PUT") {
      return writeFile(env, "draft.json", await request.text());
    }

    if (path === "/api/publish" && request.method === "PUT") {
      return writeFile(env, "publish.json", await request.text());
    }

    // -------------------------------
    // THEMES
    // -------------------------------
    if (path === "/api/site-theme" && request.method === "GET") {
      return readFile(env, "site-theme.txt");
    }

    if (path === "/api/site-theme" && request.method === "PUT") {
      return writeFile(env, "site-theme.txt", await request.text());
    }

    if (path === "/api/cms-theme" && request.method === "GET") {
      return readFile(env, "cms-theme.txt");
    }

    if (path === "/api/cms-theme" && request.method === "PUT") {
      return writeFile(env, "cms-theme.txt", await request.text());
    }

    // -------------------------------
    // IMAGE UPLOADS
    // -------------------------------
    if (path === "/api/upload" && request.method === "POST") {
      return handleImageUpload(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

// ------------------------------------------------------------
// READ FILE FROM GITHUB REPO
// ------------------------------------------------------------
async function readFile(env, filename) {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`,
    {
      headers: {
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "Valorwave-CMS"
      }
    }
  );

  if (!res.ok) {
    return new Response(`Failed to read ${filename}`, { status: 500 });
  }

  const json = await res.json();
  const content = atob(json.content);

  return new Response(content, {
    headers: { "Content-Type": detectType(filename) }
  });
}

// ------------------------------------------------------------
// WRITE FILE TO GITHUB REPO
// ------------------------------------------------------------
async function writeFile(env, filename, content) {
  const getRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`,
    {
      headers: {
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "Valorwave-CMS"
      }
    }
  );

  let sha = null;
  if (getRes.ok) {
    const json = await getRes.json();
    sha = json.sha;
  }

  const body = {
    message: `Update ${filename}`,
    content: btoa(content),
    sha
  };

  const putRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "Valorwave-CMS",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!putRes.ok) {
    return new Response(`Failed to write ${filename}`, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

// ------------------------------------------------------------
// IMAGE UPLOAD HANDLER
// ------------------------------------------------------------
async function handleImageUpload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) {
    return new Response("No file uploaded", { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const filename = `uploads/${Date.now()}-${file.name}`;

  const body = {
    message: `Upload ${filename}`,
    content: base64
  };

  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `token ${env.GITHUB_TOKEN}`,
        "User-Agent": "Valorwave-CMS",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    return new Response("Upload failed", { status: 500 });
  }

  const json = await res.json();
  return new Response(JSON.stringify({ url: json.content.download_url }), {
    headers: { "Content-Type": "application/json" }
  });
}

// ------------------------------------------------------------
// MIME TYPE DETECTION
// ------------------------------------------------------------
function detectType(filename) {
  if (filename.endsWith(".json")) return "application/json";
  if (filename.endsWith(".txt")) return "text/plain";
  return "text/plain";
}