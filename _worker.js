// /_worker.js

// Static assets bundled by Wrangler
import indexHtml from "./index.html";
import adminHtml from "./admin.html";
import adminCss from "./admin.css";
import cmsRenderJs from "./cms-render.js";

// Admin root files
import adminJs from "./admin/admin.js";
import stateJs from "./admin/state.js";
import apiJs from "./admin/api.js";

// Section modules (import so Wrangler bundles them)
import headerJs from "./admin/sections/header.js";
import footerJs from "./admin/sections/footer.js";
import heroJs from "./admin/sections/hero.js";
import servicesJs from "./admin/sections/services.js";
import bioJs from "./admin/sections/bio.js";
import chattanoogaJs from "./admin/sections/chattanooga.js";
import brandJs from "./admin/sections/brand.js";
import heroDiscountJs from "./admin/sections/heroDiscount.js";
import quoteBannerJs from "./admin/sections/quoteBanner.js";
import calendarJs from "./admin/sections/calendar.js";
import faqJs from "./admin/sections/faq.js";
import galleryJs from "./admin/sections/gallery.js";
import clientsSayJs from "./admin/sections/clientsSay.js";
import submitTestimonialJs from "./admin/sections/submitTestimonial.js";
import bookingJs from "./admin/sections/booking.js";
import quoteFormJs from "./admin/sections/quoteForm.js";
import serviceAreaJs from "./admin/sections/serviceArea.js";
import seoJs from "./admin/sections/seo.js";
import analyticsJs from "./admin/sections/analytics.js";

// GitHub repo config
const GITHUB_OWNER = "sammassengale82";
const GITHUB_REPO = "Valorwave-Admin";
const GITHUB_BRANCH = "main";

const DRAFT_PATH = "admin/drafts/draft.json";
const PUBLISH_PATH = "admin/published/publish.json";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function serveText(body, type) {
  return new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8` }
  });
}

// --- GitHub helpers --------------------------------------------------------

async function githubGetFile(env, path) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "valorwave-cms-worker"
    }
  });

  if (res.status === 404) return { exists: false, content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);

  const data = await res.json();
  const decoded = atob(data.content.replace(/\n/g, ""));
  return { exists: true, content: decoded, sha: data.sha };
}

async function githubPutFile(env, path, content, message, sha = null) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: btoa(content),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "valorwave-cms-worker",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`);
}

// Load JSON from GitHub (draft/publish)
async function getJsonFromGitHub(env, path) {
  const { exists, content } = await githubGetFile(env, path);
  if (!exists || !content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Save JSON to GitHub (draft/publish)
async function putJsonToGitHub(env, path, value, message) {
  const current = await githubGetFile(env, path);
  const json = JSON.stringify(value, null, 2);
  await githubPutFile(env, path, json, message, current.exists ? current.sha : null);
}

// --- Worker fetch ----------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API: draft
    if (path === "/api/draft") {
      if (request.method === "GET") {
        const data = await getJsonFromGitHub(env, DRAFT_PATH);
        return jsonResponse(data);
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await putJsonToGitHub(env, DRAFT_PATH, body, "Update CMS draft");
        return jsonResponse({ ok: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // API: publish
    if (path === "/api/publish") {
      if (request.method === "GET") {
        const data = await getJsonFromGitHub(env, PUBLISH_PATH);
        return jsonResponse(data);
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await putJsonToGitHub(env, PUBLISH_PATH, body, "Update CMS publish");
        return jsonResponse({ ok: true });
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // Forms (stubbed)
    if (path === "/forms/quote" && request.method === "POST") {
      return new Response("OK", { status: 200 });
    }
    if (path === "/forms/testimonial" && request.method === "POST") {
      return new Response("OK", { status: 200 });
    }

    // Admin UI
    if (path === "/admin" || path === "/admin/") {
      return serveText(adminHtml, "text/html");
    }

    if (path === "/admin.css") {
      return serveText(adminCss, "text/css");
    }

    if (path === "/cms-render.js") {
      return serveText(cmsRenderJs, "application/javascript");
    }

    // Admin root JS
    if (path === "/admin/admin.js") return serveText(adminJs, "application/javascript");
    if (path === "/admin/state.js") return serveText(stateJs, "application/javascript");
    if (path === "/admin/api.js") return serveText(apiJs, "application/javascript");

    // Section modules
    if (path.startsWith("/admin/sections/")) {
      const map = {
        "/admin/sections/header.js": headerJs,
        "/admin/sections/footer.js": footerJs,
        "/admin/sections/hero.js": heroJs,
        "/admin/sections/services.js": servicesJs,
        "/admin/sections/bio.js": bioJs,
        "/admin/sections/chattanooga.js": chattanoogaJs,
        "/admin/sections/brand.js": brandJs,
        "/admin/sections/heroDiscount.js": heroDiscountJs,
        "/admin/sections/quoteBanner.js": quoteBannerJs,
        "/admin/sections/calendar.js": calendarJs,
        "/admin/sections/faq.js": faqJs,
        "/admin/sections/gallery.js": galleryJs,
        "/admin/sections/clientsSay.js": clientsSayJs,
        "/admin/sections/submitTestimonial.js": submitTestimonialJs,
        "/admin/sections/booking.js": bookingJs,
        "/admin/sections/quoteForm.js": quoteFormJs,
        "/admin/sections/legal.js": legalJs,
        "/admin/sections/serviceArea.js": serviceAreaJs,
        "/admin/sections/seo.js": seoJs,
        "/admin/sections/analytics.js": analyticsJs
      };

      const mod = map[path];
      if (mod) return serveText(mod, "application/javascript");
      return new Response("Not found", { status: 404 });
    }

    // Root page
    if (path === "/" || path === "/index.html") {
      return serveText(indexHtml, "text/html");
    }

    // Fallback
    return new Response("Not found", { status: 404 });
  }
};