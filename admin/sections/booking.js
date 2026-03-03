import { el, bindInput, ensure } from "../state.js";

export function render(container, data) {
  const site = ensure(data, "site", {});
  const booking = ensure(site, "booking", {
    url: ""
  });

  const wrap = el("div");

  wrap.appendChild(el("label", {}, "Booking URL"));
  const url = el("input", { type: "text" });
  bindInput(url, booking, "url");
  wrap.appendChild(url);

  container.appendChild(wrap);
}

export function save(data) {}