// /_worker.js
import indexHtml from "./index.html";
import adminHtml from "./admin.html";
import adminCss from "./admin.css";
import adminJs from "./admin.js";
import cmsRenderJs from "./cms-render.js";

// Assume KV namespace: CONTENT_KV (bind in Cloudflare dashboard)

const DRAFT_KEY = "content:draft";
const PUBLISH_KEY = "content:publish";

async function getJson(key) {
  const raw = await CONTENT_KV.get(key);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function putJson(key, value) {
  await CONTENT_KV.put(key, JSON.stringify(value, null, 2));
}

function jsonResponse(obj, init = {}) {
  return new Response(JSON.stringify(obj), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) }
  });
}

async function handleApi(request, url) {
  const { pathname } = url;

  if (pathname === "/api/draft") {
    if (request.method === "GET") {
      const data = await getJson(DRAFT_KEY);
      return jsonResponse(data);
    }
    if (request.method === "PUT") {
      const body = await request.json();
      await putJson(DRAFT_KEY, body);
      return jsonResponse({ ok: true });
    }
  }

  if (pathname === "/api/publish") {
    if (request.method === "GET") {
      const data = await getJson(PUBLISH_KEY);
      return jsonResponse(data);
    }
    if (request.method === "PUT") {
      const body = await request.json();
      await putJson(PUBLISH_KEY, body);
      return jsonResponse({ ok: true });
    }
  }

  if (pathname === "/forms/quote" && request.method === "POST") {
    // TODO: wire to email provider; for now just 200
    return new Response("OK", { status: 200 });
  }

  if (pathname === "/forms/testimonial" && request.method === "POST") {
    // TODO: wire to email provider; for now just 200
    return new Response("OK", { status: 200 });
  }

  return new Response("Not found", { status: 404 });
}

function textResponse(body, type = "text/html") {
  return new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8` }
  });
}

export default {
  async fetch(request, env, ctx) {
    // @ts-ignore
    globalThis.CONTENT_KV = env.CONTENT_KV;

    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      return handleApi(request, url);
    }

    if (pathname === "/admin" || pathname === "/admin/") {
      return textResponse(adminHtml);
    }

    if (pathname === "/admin.css") {
      return textResponse