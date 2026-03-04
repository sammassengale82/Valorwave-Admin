/* THEME SYSTEM */
const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeSelect").value = savedTheme;

document.getElementById("themeSelect").onchange = e => {
  const t = e.target.value;
  localStorage.setItem("cms-theme", t);
  document.documentElement.setAttribute("data-theme", t);
};

/* LOGIN WITH GITHUB */
document.getElementById("githubLoginBtn").onclick = () => {
  window.location.href = "https://valorwave-admin-worker.sammassengale82.workers.dev/oauth/login";
};