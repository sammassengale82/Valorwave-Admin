// /cms-render.js

async function loadCMS() {
  const res = await fetch("/admin/published/publish.json");
  if (!res.ok) return;
  const data = await res.json();

  renderSEO(data.site.seo);
  renderAnalytics(data.site.analytics);

  renderHeader(data.site.header);
  renderFooter(data.site.footer);

  renderHero(data.home.hero);
  renderServices(data.home.services);
  renderBio(data.home.bio);
  renderChattanooga(data.home.chattanooga);
  renderBrand(data.home.brand);
  renderHeroDiscount(data.home.hero_discount);
  renderQuoteBanner(data.home.quote_banner);
  renderCalendar(data.home.calendar);
  renderFaq(data.home.faqs);
  renderGallery(data.home.gallery);
  renderClientsSay(data.home.clients_say);
  renderServiceArea(data.home.service_area);
}

function renderServiceArea(data) {
  if (!data) return;
  document.querySelector('#service-area h2').textContent = data.title || "";
  document.querySelector('#service-area .service-area').innerHTML = data.html || "";
}

function renderSEO(seo) {
  if (!seo) return;

  document.title = seo.title || "";

  const set = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.content = value;
  };

  set('meta[name="description"]', seo.description);
  set('meta[property="og:title"]', seo.og_title);
  set('meta[property="og:description"]', seo.og_description);
  set('meta[property="og:image"]', seo.og_image);
  set('meta[name="twitter:title"]', seo.twitter_title);
  set('meta[name="twitter:description"]', seo.twitter_description);
  set('meta[name="twitter:image"]', seo.twitter_image);

  if (seo.canonical) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = seo.canonical;
  }

  if (seo.robots) {
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = seo.robots;
  }
}

function renderAnalytics(analytics) {
  if (!analytics || !analytics.ga4_id) return;

  const id = analytics.ga4_id;

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(s2);
}

loadCMS();