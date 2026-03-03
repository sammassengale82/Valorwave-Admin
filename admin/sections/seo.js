// seo.js — Optional flat-key SEO helper (uses window.CMS_SEO if present)

export function seo(seoData) {
  const data = seoData || window.CMS_SEO;
  if (!data) return;

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

  if (data["seo-title"]) document.title = data["seo-title"];

  setMeta("description", data["seo-description"]);
  setOG("og:title", data["seo-og-title"] || data["seo-title"]);
  setOG("og:description", data["seo-og-description"] || data["seo-description"]);
  setOG("og:image", data["seo-og-image"]);
  setMeta("twitter:title", data["seo-twitter-title"] || data["seo-title"]);
  setMeta("twitter:description", data["seo-twitter-description"] || data["seo-description"]);
  setMeta("twitter:image", data["seo-twitter-image"]);
}