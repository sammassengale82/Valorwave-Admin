// /admin/sections/seo.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const seo = ensure(CURRENT, "site.seo", {
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

  // Title
  wrap.appendChild(el("label", {}, "Page Title"));
  const title = el("input", { type: "text" });
  bindInput(title, seo, "title");
  wrap.appendChild(title);

  // Description
  wrap.appendChild(el("label", {}, "Meta Description"));
  const desc = el("textarea");
  bindInput(desc, seo, "description");
  wrap.appendChild(desc);

  // OG Title
  wrap.appendChild(el("label", {}, "OG Title"));
  const ogt = el("input", { type: "text" });
  bindInput(ogt, seo, "og_title");
  wrap.appendChild(ogt);

  // OG Description
  wrap.appendChild(el("label", {}, "OG Description"));
  const ogd = el("textarea");
  bindInput(ogd, seo, "og_description");
  wrap.appendChild(ogd);

  // OG Image
  wrap.appendChild(el("label", {}, "OG Image URL"));
  const ogi = el("input", { type: "text" });
  bindInput(ogi, seo, "og_image");
  wrap.appendChild(ogi);

  // Twitter Title
  wrap.appendChild(el("label", {}, "Twitter Title"));
  const twt = el("input", { type: "text" });
  bindInput(twt, seo, "twitter_title");
  wrap.appendChild(twt);

  // Twitter Description
  wrap.appendChild(el("label", {}, "Twitter Description"));
  const twd = el("textarea");
  bindInput(twd, seo, "twitter_description");
  wrap.appendChild(twd);

  // Twitter Image
  wrap.appendChild(el("label", {}, "Twitter Image URL"));
  const twi = el("input", { type: "text" });
  bindInput(twi, seo, "twitter_image");
  wrap.appendChild(twi);

  // Canonical
  wrap.appendChild(el("label", {}, "Canonical URL"));
  const can = el("input", { type: "text" });
  bindInput(can, seo, "canonical");
  wrap.appendChild(can);

  // Robots
  wrap.appendChild(el("label", {}, "Robots Meta"));
  const rob = el("input", { type: "text" });
  bindInput(rob, seo, "robots");
  wrap.appendChild(rob);

  return wrap;
}