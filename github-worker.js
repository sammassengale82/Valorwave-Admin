export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Ensure required secrets exist
    if (!env.GITHUB_TOKEN || !env.REPO_OWNER || !env.REPO_NAME) {
      return new Response(
        JSON.stringify({ error: "Missing GitHub Worker environment variables" }),
        { status: 500 }
      );
    }

    // GitHub API base
    const apiBase = `https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}`;

    // Proxy any request from the CMS Worker to GitHub
    const githubUrl = apiBase + url.pathname.replace("/github", "") + url.search;

    const headers = {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Valorwave-CMS",
      "Accept": "application/vnd.github+json"
    };

    // Forward method, body, headers
    const init = {
      method: request.method,
      headers,
      body: request.method !== "GET" ? await request.text() : undefined
    };

    const response = await fetch(githubUrl, init);

    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  }
};