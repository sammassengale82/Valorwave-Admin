export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // draft.json
    if (path === "/draft.json" && request.method === "GET") return handleGet(env, "draft.json");
    if (path === "/draft.json" && request.method === "PUT") return handlePut(request, env, "draft.json");

    // publish.json
    if (path === "/publish.json" && request.method === "GET") return handleGet(env, "publish.json");
    if (path === "/publish.json" && request.method === "PUT") return handlePut(request, env, "publish.json");

    // site-theme.txt
    if (path === "/site-theme.txt" && request.method === "GET") return handleGet(env, "site-theme.txt");
    if (path === "/site-theme.txt" && request.method === "PUT") return handlePut(request, env, "site-theme.txt");

    // cms-theme.txt
    if (path === "/cms-theme.txt" && request.method === "GET") return handleGet(env, "cms-theme.txt");
    if (path === "/cms-theme.txt" && request.method === "PUT") return handlePut(request, env, "cms-theme.txt");

    // upload
    if (path === "/upload" && request.method === "POST") return handleUpload(request, env);

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};