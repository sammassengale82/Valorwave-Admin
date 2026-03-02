// /cms/render.js
// Section registration + render engine

import { el, setDirty, CURRENT } from "./state.js";
import * as Header from "./sections/header.js";
import * as Navigation from "./sections/navigation.js";
import * as Theme from "./sections/theme.js";
import * as Typography from "./sections/typography.js";
import * as AdminAppearance from "./sections/adminAppearance.js";
import * as SEO from "./sections/seo.js";
import * as Hero from "./sections/hero.js";
import * as QuoteBanner from "./sections/quoteBanner.js";
import * as ClientsSay from "./sections/clientsSay.js";
import * as Testimonials from "./sections/testimonials.js";
import * as Services from "./sections/services.js";
import * as FAQ from "./sections/faq.js";
import * as Chattanooga from "./sections/chattanooga.js";
import * as Brand from "./sections/brand.js";
import * as HeroDiscount from "./sections/heroDiscount.js";
import * as ServiceArea from "./sections/serviceArea.js";
import * as QuoteForm from "./sections/quoteForm.js";
import * as Calendar from "./sections/calendar.js";
import * as Footer from "./sections/footer.js";
import * as Social from "./sections/social.js";
import * as Layout from "./sections/layout.js";
import * as Duplication from "./sections/duplication.js";
import * as History from "./sections/history.js";
import * as Preview from "./sections/preview.js";

const registry = [];

// -----------------------------
// Register Section
// -----------------------------
export function registerSection(title, builder) {
  registry.push({ title, builder });
}

// -----------------------------
// Build <details> wrapper
// -----------------------------
function wrapSection(title, content) {
  const details = el("details", {}, [
    el("summary", {}, title),
    content
  ]);
  return details;
}

// -----------------------------
// Render Admin UI
// -----------------------------
export function renderAdminUI(root) {
  root.innerHTML = "";
  registry.forEach(sec => {
    const block = wrapSection(sec.title, sec.builder(CURRENT));
    root.appendChild(block);
  });
  setDirty(false);
}

// -----------------------------
// Section Registration Order
// -----------------------------
registerSection("Header", Header.build);
registerSection("Navigation", Navigation.build);
registerSection("Theme", Theme.build);
registerSection("Typography", Typography.build);
registerSection("Admin Appearance", AdminAppearance.build);
registerSection("SEO", SEO.build);
registerSection("Hero", Hero.build);
registerSection("Quote Banner", QuoteBanner.build);
registerSection("Clients Say", ClientsSay.build);
registerSection("Testimonials", Testimonials.build);
registerSection("Services", Services.build);
registerSection("FAQ", FAQ.build);
registerSection("Chattanooga", Chattanooga.build);
registerSection("Brand Meaning", Brand.build);
registerSection("Hero Discount", HeroDiscount.build);
registerSection("Serving Your Area", ServiceArea.build);
registerSection("Quote Form", QuoteForm.build);
registerSection("Calendar", Calendar.build);
registerSection("Footer", Footer.build);
registerSection("Social Links", Social.build);
registerSection("Layout (Visibility + Order)", Layout.build);
registerSection("Page Duplication", Duplication.build);
registerSection("History + Rollback", History.build);
registerSection("Preview Mode", Preview.build);
