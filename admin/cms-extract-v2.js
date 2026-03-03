// cms-extract.js — Extract live site → draft.json (flat, data-ve-edit keys)

export async function extractCMS() {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = "https://valorwaveentertainment.com/";
  document.body.appendChild(iframe);

  await new Promise(res => {
    iframe.onload = () => res();
  });

  const doc = iframe.contentDocument;
  const data = {};

  doc.querySelectorAll("[data-ve-edit]").forEach(el => {
    const key = el.getAttribute("data-ve-edit");
    if (!key) return;

    if (el.tagName === "IMG") {
      data[key] = el.getAttribute("src") || "";
    } else if (el.tagName === "A" && el.hasAttribute("href")) {
      // store both label and href if useful later
      data[key] = el.innerHTML.trim();
      data[`${key}__href`] = el.getAttribute("href");
    } else {
      data[key] = el.innerHTML.trim();
    }
  });

  await fetch("/draft.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2)
  });

  alert("Website content extracted into draft.json");
}