import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const site = ensure(data, "site", {});
  const forms = ensure(site, "forms", {});
  const quote = ensure(forms, "quote", {
    subject: "",
    template: "",
    replyto: "",
    autoresponse: "",
    next: "",
    submit_text: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Email Subject"));
  const subject = el("input", { type: "text" });
  bindInput(subject, quote, "subject");
  wrap.appendChild(subject);

  wrap.appendChild(el("label", {}, "Email Template (HTML Allowed)"));
  const template = el("textarea");
  bindInput(template, quote, "template");
  wrap.appendChild(template);

  wrap.appendChild(el("label", {}, "Reply-To Email"));
  const replyto = el("input", { type: "text" });
  bindInput(replyto, quote, "replyto");
  wrap.appendChild(replyto);

  wrap.appendChild(el("label", {}, "Auto-Response Message"));
  const auto = el("textarea");
  bindInput(auto, quote, "autoresponse");
  wrap.appendChild(auto);

  wrap.appendChild(el("label", {}, "Next Page URL"));
  const next = el("input", { type: "text" });
  bindInput(next, quote, "next");
  wrap.appendChild(next);

  wrap.appendChild(el("label", {}, "Submit Button Text"));
  const submit = el("input", { type: "text" });
  bindInput(submit, quote, "submit_text");
  wrap.appendChild(submit);

  container.appendChild(wrap);
}

export function save(data) {}