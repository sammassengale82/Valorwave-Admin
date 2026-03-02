// /cms/sections/contact.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const ct = ensure(CURRENT, "site.contact", {
    title: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    mapEmbed: ""
  });

  const wrap = el("div");

  // Title
  wrap.appendChild(el("label", {}, "Contact Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, ct, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "Description"));
  const desc = el("textarea");
  bindInput(desc, ct, "description");
  wrap.appendChild(desc);

  // Phone
  wrap.appendChild(el("label", {}, "Phone Number"));
  const phone = el("input", { type: "text" });
  bindInput(phone, ct, "phone");
  wrap.appendChild(phone);

  // Email
  wrap.appendChild(el("label", {}, "Email Address"));
  const email = el("input", { type: "text" });
  bindInput(email, ct, "email");
  wrap.appendChild(email);

  // Address
  wrap.appendChild(el("label", {}, "Physical Address"));
  const address = el("textarea");
  bindInput(address, ct, "address");
  wrap.appendChild(address);

  // Map Embed
  wrap.appendChild(el("label", {}, "Google Maps Embed URL"));
  const map = el("input", { type: "text" });
  bindInput(map, ct, "mapEmbed");
  wrap.appendChild(map);

  return wrap;
}
