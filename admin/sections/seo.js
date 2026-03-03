// seo.js — Valorwave Public Site SEO Renderer

export function seo(seoData) {
  if (!seoData) return;

  // -----------------------------
  // Helpers
  // -----------------------------
  function setMeta(name, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", name);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

  function setOG(property, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

  function setCanonical(url) {
    if (!url) return;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }

  // -----------------------------
  // Title
  // -----------------------------
  if (seoData.title) {
    document.title = seoData.title;
  }

  // -----------------------------
  // Basic SEO
  // -----------------------------
  setMeta("description", seoData.description);
  setMeta("keywords", seoData.keywords);
  setMeta("robots", seoData.robots);

  // -----------------------------
  // Canonical
  // -----------------------------
  setCanonical(seoData.canonical);

  // -----------------------------
  // Open Graph
  // -----------------------------
  setOG("og:title", seoData.og_title || seoData.title);
  setOG("og:description", seoData.og_description || seoData.description);
  setOG("og:image", seoData.og_image || seoData.image);

  // -----------------------------
  // Twitter
  // -----------------------------
  setMeta("twitter:title", seoData.twitter_title || seoData.title);
  setMeta("twitter:description", seoData.twitter_description || seoData.description);
  setMeta("twitter:image", seoData.twitter_image || seoData.image);
}