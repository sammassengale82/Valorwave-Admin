// /admin/sections/booking.js
import { el, bindInput, ensure } from "../state.js";

export function build(CURRENT) {
  const site = ensure(CURRENT, "site", {});
  const booking = ensure(site, "booking", {
    url: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Booking URL"));
  const url = el("input", { type: "text" });
  bindInput(url, booking, "url");
  wrap.appendChild(url);

  return wrap;
}
