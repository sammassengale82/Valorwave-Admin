// /admin/sections/submitTestimonial.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const home = ensure(CURRENT, "home", {});
  const section = ensure(home, "testimonial_section", {
    title: "",
    permission_label: "",
    note_text: ""
  });

  const site = ensure(CURRENT, "site", {});
  const forms = ensure(site, "forms", {});
  const testimonial = ensure(forms, "testimonial", {
    email: "",
    next: "",
    submit_text: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, section, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Permission Label"));
  const perm = el("input", { type: "text" });
  bindInput(perm, section, "permission_label");
  wrap.appendChild(perm);

  wrap.appendChild(el("label", {}, "Note Text"));
  const note = el("textarea");
  bindInput(note, section, "note_text");
  wrap.appendChild(note);

  wrap.appendChild(el("label", {}, "Form Email Recipient"));
  const email = el("input", { type: "text" });
  bindInput(email, testimonial, "email");
  wrap.appendChild(email);

  wrap.appendChild(el("label", {}, "Next Page URL"));
  const next = el("input", { type: "text" });
  bindInput(next, testimonial, "next");
  wrap.appendChild(next);

  wrap.appendChild(el("label", {}, "Submit Button Text"));
  const submit = el("input", { type: "text" });
  bindInput(submit, testimonial, "submit_text");
  wrap.appendChild(submit);

  return wrap;
}
