/* THEME SYSTEM */
const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeSelect").value = savedTheme;

document.getElementById("themeSelect").onchange = e => {
  const t = e.target.value;
  localStorage.setItem("cms-theme", t);
  document.documentElement.setAttribute("data-theme", t);
};

/* PASSWORD TOGGLE */
document.getElementById("togglePass").onchange = e => {
  const input = document.getElementById("passwordInput");
  input.type = e.target.checked ? "text" : "password";
};

/* LOGIN */
document.getElementById("loginBtn").onclick = () => {
  const pass = document.getElementById("passwordInput").value;
  const error = document.getElementById("errorMsg");

  // Set your CMS password here
  const correctPassword = "ValorWaveCMS2026";

  if (pass === correctPassword) {
    localStorage.setItem("cms-auth", "true");
    window.location.href = "/admin/admin.html";
  } else {
    error.innerText = "Incorrect password.";
  }
};

/* AUTO-REDIRECT IF ALREADY LOGGED IN */
if (localStorage.getItem("cms-auth") === "true") {
  window.location.href = "/admin/admin.html";
}