// /cms/sections/theme.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const theme = ensure(CURRENT, "site.theme", {
    primary: "",
    secondary: "",
    background: "",
    text: "",
    accent: ""
  });

  const wrap = el("div");

  // Primary
  wrap.appendChild(el("label", {}, "Primary Color"));
  const primary = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(primary, theme, "primary");
  wrap.appendChild(primary);

  // Secondary
  wrap.appendChild(el("label", {}, "Secondary Color"));
  const secondary = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(secondary, theme, "secondary");
  wrap.appendChild(secondary);

  // Background
  wrap.appendChild(el("label", {}, "Background Color"));
  const bg = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(bg, theme, "background");
  wrap.appendChild(bg);

  // Text
  wrap.appendChild(el("label", {}, "Text Color"));
  const text = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(text, theme, "text");
  wrap.appendChild(text);

  // Accent
  wrap.appendChild(el("label", {}, "Accent Color"));
  const accent = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(accent, theme, "accent");
  wrap.appendChild(accent);

  return wrap;
}
