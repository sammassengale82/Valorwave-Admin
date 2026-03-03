export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Normalize path (Cloudflare sometimes rewrites paths)
    const path = url.pathname.toLowerCase();

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // -------- JSON ROUTES --------
    if (path.endsWith("/draft.json") && request.method === "GET") {
      return handleGet(env, "draft.json");
    }
    if (path.endsWith("/draft.json") && request.method === "PUT") {
      return handlePut(request, env, "draft.json");
    }

    if (path.endsWith("/publish.json") && request.method === "GET") {
      return handleGet(env, "publish.json");
    }
    if (path.endsWith("/publish.json") && request.method === "PUT") {
      return handlePut(request, env, "publish.json");
    }

    // -------- THEME ROUTES --------
    if (path.endsWith("/site-theme.txt") && request.method === "GET") {
      return handleGet(env, "site-theme.txt");
    }
    if (path.endsWith("/site-theme.txt") && request.method === "PUT") {
      return handlePut(request, env, "site-theme.txt");
    }

    if (path.endsWith("/cms-theme.txt") && request.method === "GET") {
      return handleGet(env, "cms-theme.txt");
    }
    if (path.endsWith("/cms-theme.txt") && request.method === "PUT") {
      return handlePut(request, env, "cms-theme.txt");
    }

    // -------- IMAGE UPLOAD --------
    if (path.endsWith("/upload") && request.method === "POST") {
      return handleUpload(request, env);
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders()
    });
  }
};

// -----------------------------
// GitHub API Helpers
// -----------------------------
async function handleGet(env, filename) {
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  const res = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker"
    }
  });

  if (!res.ok) {
    return new Response("GitHub GET failed", {
      status: res.status,
      headers: corsHeaders()
    });
  }

  const json = await res.json();
  const content = atob(json.content);

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

async function handlePut(request, env, filename) {
  const body = await request.text();
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  // Get SHA for existing file
  const existing = await fetch(apiUrl, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker"
    }
  });

  let sha = null;
  if (existing.ok) {
    const json = await existing.json();
    sha = json.sha;
  }

  const payload = {
    message: `Update ${filename}`,
    content: btoa(body),
    sha
  };

  const update = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!update.ok) {
    return new Response("GitHub PUT failed", {
      status: update.status,
      headers: corsHeaders()
    });
  }

  return new Response("OK", {
    status: 200,
    headers: corsHeaders()
  });
}

// -----------------------------
// Image Upload Handler
// -----------------------------
async function handleUpload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) {
    return new Response("No file uploaded", {
      status: 400,
      headers: corsHeaders()
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const filename = `uploads/${Date.now()}-${file.name}`;
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  const payload = {
    message: `Upload ${filename}`,
    content: base64
  };

  const upload = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!upload.ok) {
    return new Response("Upload failed", {
      status: upload.status,
      headers: corsHeaders()
    });
  }

  return new Response(JSON.stringify({ url: filename }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

// -----------------------------
// CORS Headers
// -----------------------------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://sammassengale82.github.io",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}