// cms-extract.js — Extracts live website content → draft.json

export async function extractCMS() {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = "https;//valorwaveentertainment.com/";
  document.body.appendChild(iframe);

  await new Promise(res => iframe.onload = res);

  const doc = iframe.contentDocument;
  const data = { site: {}, home: {} };

  function setPath(obj, path, value) {
    const keys = path.split(".");
    let cur = obj;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        cur[k] = value;
      } else {
        cur[k] = cur[k] || {};
        cur = cur[k];
      }
    });
  }

  doc.querySelectorAll("[data-cms-text]").forEach(el => {
    const path = el.getAttribute("data-cms-text");
    setPath(data, path, el.textContent.trim());
  });

  doc.querySelectorAll("[data-cms-html]").forEach(el => {
    const path = el.getAttribute("data-cms-html");
    setPath(data, path, el.innerHTML.trim());
  });

  doc.querySelectorAll("[data-cms-src]").forEach(el => {
    const path = el.getAttribute("data-cms-src");
    setPath(data, path, el.getAttribute("src"));
  });

  doc.querySelectorAll("[data-cms-alt]").forEach(el => {
    const path = el.getAttribute("data-cms-alt");
    setPath(data, path, el.getAttribute("alt") || "");
  });

  doc.querySelectorAll("[data-cms-repeat]").forEach(container => {
    const path = container.getAttribute("data-cms-repeat");
    const items = [];

    container.querySelectorAll(":scope > *:not([data-cms-template])").forEach(itemEl => {
      const clone = {};
      itemEl.querySelectorAll("[data-cms-text]").forEach(el => {
        const key = el.getAttribute("data-cms-text");
        clone[key.split(".").pop()] = el.textContent.trim();
      });
      itemEl.querySelectorAll("[data-cms-src]").forEach(el => {
        const key = el.getAttribute("data-cms-src");
        clone[key.split(".").pop()] = el.getAttribute("src");
      });
      items.push(clone);
    });

    setPath(data, path, items);
  });

  await fetch("/draft.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data, null, 2)
  });

  alert("Website content extracted into draft.json");
}
