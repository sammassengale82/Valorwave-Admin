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
/* FORGOT PASSWORD FLOW */
document.getElementById("forgotLink").onclick = () => {
  document.getElementById("resetModal").style.display = "flex";
};

document.getElementById("closeReset").onclick = () => {
  document.getElementById("resetModal").style.display = "none";
};

document.getElementById("resetPassBtn").onclick = () => {
  const masterKey = "ValorWaveMasterReset2026"; // set your master key
  const inputKey = document.getElementById("resetKeyInput").value;
  const newPass = document.getElementById("newPassInput").value;

  if (inputKey !== masterKey) {
    document.getElementById("resetError").innerText = "Invalid reset key.";
    return;
  }

  if (newPass.length < 6) {
    document.getElementById("resetError").innerText = "Password too short.";
    return;
  }
};
  localStorage.setItem("cms-password", newPass);
  alert("Password reset successfully.");
  document.getElementById("resetModal").style.display = "none";
};

/* AUTO-REDIRECT IF ALREADY LOGGED IN */
if (localStorage.getItem("cms-auth") === "true") {
  window.location.href = "/admin/admin.html";
}
