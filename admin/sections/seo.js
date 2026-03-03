import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const seo = ensure(data, "site.seo", {
    title: "",
    description: "",
    og_title: "",
    og_description: "",
    og_image: "",
    twitter_title: "",
    twitter_description: "",
    twitter_image: "",
    canonical: "",
    robots: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Page Title"));
  const title = el("input", { type: "text" });
  bindInput(title, seo, "title");
  wrap.appendChild(title);

  wrap.appendChild(el("label", {}, "Meta Description"));
  const desc = el("textarea");
  bindInput(desc, seo, "description");
  wrap.appendChild(desc);

  wrap.appendChild(el("label", {}, "OG Title"));
  const ogt = el("input", { type: "text" });
  bindInput(ogt, seo, "og_title");
  wrap.appendChild(ogt);

  wrap.appendChild(el("label", {}, "OG Description"));
  const ogd = el("textarea");
  bindInput(ogd, seo, "og_description");
  wrap.appendChild(ogd);

  wrap.appendChild(el("label", {}, "OG Image URL"));
  const ogi = el("input", { type: "text" });
  bindInput(ogi, seo, "og_image");
  wrap.appendChild(ogi);

  wrap.appendChild(el("label", {}, "Twitter Title"));
  const twt = el("input", { type: "text" });
  bindInput(twt, seo, "twitter_title");
  wrap.appendChild(twt);

  wrap.appendChild(el("label", {}, "Twitter Description"));
  const twd = el("textarea");
  bindInput(twd, seo, "twitter_description");
  wrap.appendChild(twd);

  wrap.appendChild(el("label", {}, "Twitter Image URL"));
  const twi = el("input", { type: "text" });
  bindInput(twi, seo, "twitter_image");
  wrap.appendChild(twi);

  wrap.appendChild(el("label", {}, "Canonical URL"));
  const can = el("input", { type: "text" });
  bindInput(can, seo, "canonical");
  wrap.appendChild(can);

  wrap.appendChild(el("label", {}, "Robots Meta Tag"));
  const rob = el("input", { type: "text" });
  bindInput(rob, seo, "robots");
  wrap.appendChild(rob);

  container.appendChild(wrap);
}

export function save(data) {}