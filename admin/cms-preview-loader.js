// ------------------------------------------------------------
// CMS PREVIEW LOADER (ADMIN PREVIEW ONLY)
// Always loads draft.json
// ------------------------------------------------------------

// Always load draft.json from the CMS repo
const jsonFile = ".../draft.json";

// Load JSON
fetch(jsonFile)
  .then(res => res.json())
  .then(data => {
    applyTheme(data);
    applyContent(data);
    applySEO(data);
    applyGoogle(data);
  })
  .catch(err => console.error("CMS Preview Load Error:", err));


// ------------------------------------------------------------
// THEME (Preview uses body classes, not data-theme)
// ------------------------------------------------------------
function applyTheme(data) {
  if (data.site_theme) {
    document.body.className = data.site_theme;
  }
}


// ------------------------------------------------------------
// CONTENT (text, images, links)
// ------------------------------------------------------------
function applyContent(data) {
  document.querySelectorAll("[data-ve-edit]").forEach(el => {
    const key = el.getAttribute("data-ve-edit");
    const value = data[key];

    if (!value) return;

    // Images
    if (el.tagName === "IMG") {
      el.src = value;
      return;
    }

    // Links
    if (el.tagName === "A") {
      if (key.endsWith("__href")) {
        el.href = value;
      } else {
        el.textContent = value;
      }
      return;
    }

    // Text content
    el.textContent = value;
  });
}


// ------------------------------------------------------------
// SEO + OG TAGS
// ------------------------------------------------------------
function applySEO(data) {
  setMeta("title", data.meta_title);
  setMeta("description", data.meta_description);
  setMeta("keywords", data.meta_keywords);

  setOG("og:title", data.og_title);
  setOG("og:description", data.og_description);
  setOG("og:image", data.og_image);
}

function setMeta(name, value) {
  if (!value) return;
  let tag = document.querySelector(`meta[name='${name}']`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
}

function setOG(property, value) {
  if (!value) return;
  let tag = document.querySelector(`meta[property='${property}']`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
}


// ------------------------------------------------------------
// GOOGLE ANALYTICS + TAG MANAGER (Preview-safe)
// ------------------------------------------------------------
function applyGoogle(data) {
  if (data.google_analytics_id) {
    loadGoogleAnalytics(data.google_analytics_id);
  }

  if (data.google_tag_manager_id) {
    loadGoogleTagManager(data.google_tag_manager_id);
  }

  if (data.google_site_verification) {
    setMeta("google-site-verification", data.google_site_verification);
  }
}

function loadGoogleAnalytics(id) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("config", id);
}

function loadGoogleTagManager(id) {
  const script = document.createElement("script");
  script.innerHTML = `
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${id}');
  `;
  document.head.appendChild(script);
}
