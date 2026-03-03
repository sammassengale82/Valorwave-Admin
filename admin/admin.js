// PROTECT ADMIN
if (localStorage.getItem("cms-auth") !== "true") {
  window.location.href = "/admin/login.html";
}

/* THEME SYSTEM */
const savedTheme = localStorage.getItem("cms-theme") || "original";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("themeSelect").value = savedTheme;

document.getElementById("themeSelect").onchange = e => {
  const t = e.target.value;
  localStorage.setItem("cms-theme", t);
  document.documentElement.setAttribute("data-theme", t);
};

/* GLOBAL STATE */
let cmsData = {};
let currentField = null;

/* LOAD DRAFT.JSON */
async function loadDraft() {
  const res = await fetch("/draft.json", { cache: "no-store" });
  cmsData = await res.json();
  buildFieldList();
}

loadDraft();

/* BUILD FIELD LIST */
function buildFieldList() {
  const list = document.getElementById("fieldList");
  list.innerHTML = "";

  Object.keys(cmsData).forEach(key => {
    const btn = document.createElement("button");
    btn.innerText = key;
    btn.onclick = () => loadField(key);
    list.appendChild(btn);
  });
}

/* LOAD FIELD INTO EDITOR */
function loadField(key) {
  currentField = key;
  document.getElementById("fieldTitle").innerText = key;

  const value = cmsData[key] || "";

  if (key.endsWith("__href")) {
    document.getElementById("linkEditor").value = value;
    document.getElementById("editor").value = "";
  } else {
    document.getElementById("editor").value = value;
    document.getElementById("linkEditor").value = cmsData[key + "__href"] || "";
  }
}

/* LIVE EDITING */
document.getElementById("editor").oninput = e => {
  if (!currentField) return;
  cmsData[currentField] = e.target.value;
  updatePreview(currentField, e.target.value);
};

document.getElementById("linkEditor").oninput = e => {
  if (!currentField) return;
  cmsData[currentField + "__href"] = e.target.value;
  updatePreview(currentField, cmsData[currentField]);
};

/* LIVE PREVIEW */
function updatePreview(key, value) {
  const iframe = document.getElementById("previewFrame");
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  const el = doc.querySelector(`[data-ve-edit="${key}"]`);
  if (!el) return;

  if (el.tagName === "IMG") {
    el.src = value;
  } else {
    el.innerHTML = value;
  }

  if (cmsData[key + "__href"] && el.tagName === "A") {
    el.href = cmsData[key + "__href"];
  }
}

/* SAVE DRAFT */
document.getElementById("saveDraft").onclick = async () => {
  await fetch("/draft.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cmsData, null, 2)
  });
  alert("Draft saved.");
};

/* PUBLISH */
document.getElementById("publish").onclick = async () => {
  await fetch("/publish", { method: "POST" });
  alert("Published!");
};

/* IMAGE UPLOAD */
document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("imageUpload").files[0];
  if (!file) return;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/upload", { method: "POST", body: form });
  const json = await res.json();

  document.getElementById("uploadStatus").innerText = "Uploaded: " + json.url;

  if (currentField && currentField.includes("image")) {
    cmsData[currentField] = json.url;
    document.getElementById("editor").value = json.url;
    updatePreview(currentField, json.url);
  }
};

/* LOGOUT */
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("cms-auth");
  localStorage.removeItem("cms-2fa");
  window.location.href = "/admin/login.html";
};