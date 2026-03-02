// /cms/sections/adminAppearance.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const admin = ensure(CURRENT, "adminAppearance", {
    header: "",
    accent: "",
    onAccent: "",
    bg: "",
    card: "",
    text: "",
    muted: "",
    border: ""
  });

  const wrap = el("div");

  // Header
  wrap.appendChild(el("label", {}, "Admin Header Color"));
  const header = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(header, admin, "header");
  wrap.appendChild(header);

  // Accent
  wrap.appendChild(el("label", {}, "Admin Accent Color"));
  const accent = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(accent, admin, "accent");
  wrap.appendChild(accent);

  // On Accent
  wrap.appendChild(el("label", {}, "Admin On-Accent Text Color"));
  const onAccent = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(onAccent, admin, "onAccent");
  wrap.appendChild(onAccent);

  // Background
  wrap.appendChild(el("label", {}, "Admin Background Color"));
  const bg = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(bg, admin, "bg");
  wrap.appendChild(bg);

  // Card
  wrap.appendChild(el("label", {}, "Admin Card Background"));
  const card = el("input", { type: "text", placeholder: "rgba() or #HEX" });
  bindInput(card, admin, "card");
  wrap.appendChild(card);

  // Text
  wrap.appendChild(el("label", {}, "Admin Text Color"));
  const text = el("input", { type: "text", placeholder: "#HEX or rgb()" });
  bindInput(text, admin, "text");
  wrap.appendChild(text);

  // Muted
  wrap.appendChild(el("label", {}, "Admin Muted Text Color"));
  const muted = el("input", { type: "text", placeholder: "rgba() or #HEX" });
  bindInput(muted, admin, "muted");
  wrap.appendChild(muted);

  // Border
  wrap.appendChild(el("label", {}, "Admin Border Color"));
  const border = el("input", { type: "text", placeholder: "rgba() or #HEX" });
  bindInput(border, admin, "border");
  wrap.appendChild(border);

  return wrap;
}
