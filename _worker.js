export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // GET draft.json
    if (path.includes("draft.json") && request.method === "GET") {
      return getFile(env, "draft.json");
    }

    // PUT draft.json
    if (path.includes("draft.json") && request.method === "PUT") {
      return putFile(request, env, "draft.json");
    }

    // GET publish.json
    if (path.includes("publish.json") && request.method === "GET") {
      return getFile(env, "publish.json");
    }

    // PUT publish.json
    if (path.includes("publish.json") && request.method === "PUT") {
      return putFile(request, env, "publish.json");
    }

    // PUBLISH ACTION: copy draft → publish
    if (path.includes("publish") && request.method === "POST") {
      return publish(env);
    }

    // IMAGE UPLOAD
    if (path.includes("upload") && request.method === "POST") {
      return upload(request, env);
    }

    return new Response("Not Found", { status: 404, headers: cors() });
  }
};

async function getFile(env, filename) {
  const api = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  const res = await fetch(api, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker"
    }
  });

  if (!res.ok) {
    return new Response("GitHub GET failed", { status: res.status, headers: cors() });
  }

  const json = await res.json();
  const content = atob(json.content);

  return new Response(content, {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

async function putFile(request, env, filename) {
  const body = await request.text();
  const api = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  const existing = await fetch(api, {
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

  const update = await fetch(api, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!update.ok) {
    return new Response("GitHub PUT failed", { status: update.status, headers: cors() });
  }

  return new Response("OK", { status: 200, headers: cors() });
}

async function publish(env) {
  const draft = await getFile(env, "draft.json");
  const body = await draft.text();

  return putFile(new Request("", { body, method: "PUT" }), env, "publish.json");
}

async function upload(request, env) {
  const form = await request.formData();
  const file = form.get("file");

  if (!file) {
    return new Response("No file uploaded", { status: 400, headers: cors() });
  }

  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const filename = `uploads/${Date.now()}-${file.name}`;
  const api = `https://api.github.com/repos/${env.GITHUB_USER}/${env.GITHUB_REPO}/contents/${filename}`;

  const payload = {
    message: `Upload ${filename}`,
    content: base64
  };

  const upload = await fetch(api, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-Worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!upload.ok) {
    return new Response("Upload failed", { status: upload.status, headers: cors() });
  }

  return new Response(JSON.stringify({ url: filename }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "https://admin.valorwaveentertainment.com",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}