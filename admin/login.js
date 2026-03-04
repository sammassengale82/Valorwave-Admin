/* ============================================================
   CMS THEME (LOCAL ONLY)
   ------------------------------------------------------------
   This theme affects ONLY the admin UI. It does NOT affect the
   website theme. Stored in localStorage and applied instantly.
   ============================================================ */

const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);

const themeSelect = document.getElementById("themeSelect");
if (themeSelect) {
  themeSelect.value = savedTheme;

  themeSelect.onchange = (e) => {
    const newTheme = e.target.value;
    localStorage.setItem("cms-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };
}

/* ============================================================
   GITHUB OAUTH LOGIN
   ------------------------------------------------------------
   Redirects the user to your Cloudflare Worker OAuth endpoint.
   ============================================================ */

const loginBtn = document.getElementById("githubLoginBtn");
if (loginBtn) {
  loginBtn.onclick = () => {
    window.location.href =
      "https://valorwave-admin-worker.sammassengale82.workers.dev/oauth/login";
  };
}