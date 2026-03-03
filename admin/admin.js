// /admin/admin.js
import { loadDraft, saveDraft, publish } from "./api.js";
import { setDirty, isDirty, CURRENT } from "./state.js";

// Import all sections
import * as header from "./sections/header.js";
import * as footer from "./sections/footer.js";
import * as hero from "./sections/hero.js";
import * as services from "./sections/services.js";
import * as bio from "./sections/bio.js";
import * as chattanooga from "./sections/chattanooga.js";
import * as brand from "./sections/brand.js";
import * as heroDiscount from "./sections/heroDiscount.js";
import * as quoteBanner from "./sections/quoteBanner.js";
import * as calendar from "./sections/calendar.js";
import * as faq from "./sections/faq.js";
import * as gallery from "./sections/gallery.js";
import * as clientsSay from "./sections/clientsSay.js";
import * as submitTestimonial from "./sections/submitTestimonial.js";
import * as booking from "./sections/booking.js";
import * as quoteForm from "./sections/quoteForm.js";
import * as serviceArea from "./sections/serviceArea.js";
import * as seo from "./sections/seo.js";
import * as analytics from "./sections/analytics.js";

// Register sections
const SECTIONS = {
  "Header": header,
  "Footer": footer,
  "Hero": hero,
  "Services": services,
  "Bio": bio,
  "Chattanooga": chattanooga,
  "Brand": brand,
  "Hero Discount": heroDiscount,
  "Quote Banner": quoteBanner,
  "Calendar": calendar,
  "FAQs": faq,
  "Gallery": gallery,
  "Clients Say": clientsSay,
  "Submit Testimonial": submitTestimonial,
  "Booking Page": booking,
  "Quote Form": quoteForm,
  "Legal Pages": legal,
  "Service Area": serviceArea,
  "SEO": seo,
  "Analytics": analytics
};

const sidebar = document.getElementById("sidebar");
const container = document.getElementById("section-container");

// Build sidebar
Object.keys(SECTIONS).forEach(name => {
  const btn = document.createElement("button");
  btn.textContent = name;
  btn.addEventListener("click", () => loadSection(name));
  sidebar.appendChild(btn);
});

// Load section
function loadSection(name) {
  container.innerHTML = "";
  const mod = SECTIONS[name];
  container.appendChild(mod.build(CURRENT));
}

// Load draft on startup
(async () => {
  const data = await loadDraft();
  Object.assign(CURRENT, data);
  loadSection("Header");
})();

// Save Draft
document.getElementById("saveDraft").addEventListener("click", async () => {
  await saveDraft(CURRENT);
  setDirty(false);
});

// Publish
document.getElementById("publish").addEventListener("click", async () => {
  await publish(CURRENT);
  setDirty(false);
});