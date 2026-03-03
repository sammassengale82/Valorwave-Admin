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

/* LOGIN WITH 2FA */
document.getElementById("loginBtn").onclick = () => {
  const pass = document.getElementById("passwordInput").value;
  const error = document.getElementById("errorMsg");

  const storedPass = localStorage.getItem("cms-password") || "ValorWaveCMS2026";

  if (pass !== storedPass) {
    error.innerText = "Incorrect password.";
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem("cms-2fa-code", code);

  console.log("2FA CODE:", code);

  document.getElementById("twoFactorScreen").style.display = "flex";
};

document.getElementById("verify2FA").onclick = () => {
  const input = document.getElementById("twoFactorInput").value;
  const real = localStorage.getItem("cms-2fa-code");

  if (input === real) {
    localStorage.setItem("cms-auth", "true");
    localStorage.removeItem("cms-2fa-code");
    window.location.href = "/admin/admin.html";
  } else {
    document.getElementById("twoFactorError").innerText = "Invalid code.";
  }
};

/* FORGOT PASSWORD FLOW */
document.getElementById("forgotLink").onclick = () => {
  document.getElementById("resetModal").style.display = "flex";
};

document.getElementById("closeReset").onclick = () => {
  document.getElementById("resetModal").style.display = "none";
};

document.getElementById("resetPassBtn").onclick = () => {
  const masterKey = "ValorWaveMasterReset2026";
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

  localStorage.setItem("cms-password", newPass);
  alert("Password reset successfully.");
  document.getElementById("resetModal").style.display = "none";
};

/* AUTO-REDIRECT IF ALREADY LOGGED IN */
if (localStorage.getItem("cms-auth") === "true") {
  window.location.href = "/admin/admin.html";
}