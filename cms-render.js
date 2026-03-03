// cms-render.js — Apply flat JSON → data-ve-edit elements

async function loadCMSData() {
  const tryUrls = ["/publish.json", "/draft.json"];
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

function applyCMSData(data) {
  if (!data || typeof data !== "object") return;

  Object.keys(data).forEach(key => {
    // skip href helper keys here; handled when we see the base key
    if (key.endsWith("__href")) return;

    const el = document.querySelector(`[data-ve-edit="${key}"]`);
    if (!el) return;

    const value = data[key];

    if (el.tagName === "IMG") {
      if (typeof value === "string") el.setAttribute("src", value);
    } else if (el.tagName === "A" && data[`${key}__href`]) {
      el.innerHTML = value;
      el.setAttribute("href", data[`${key}__href`]);
    } else {
      el.innerHTML = value;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = await loadCMSData();
  applyCMSData(data);
});