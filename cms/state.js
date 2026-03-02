// /cms/state.js
// Global state, helpers, dirty tracking, utilities

export let CURRENT = null;
export let CURRENT_SLUG = "home";
export let DIRTY = false;

// -----------------------------
// Dirty Tracking
// -----------------------------
export function setDirty(flag = true) {
  DIRTY = flag;
  const el = document.getElementById("admin-status");
  if (!el) return;
  el.textContent = flag ? "Unsaved changes" : "Saved";
}

// -----------------------------
// Utility: Create Element
// -----------------------------
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") node.className = attrs[k];
    else if (k === "html") node.innerHTML = attrs[k];
    else node.setAttribute(k, attrs[k]);
  }
  if (!Array.isArray(children)) children = [children];
  children.forEach(c => {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  });
  return node;
}

// -----------------------------
// Utility: Bind Input to JSON
// -----------------------------
export function bindInput(input, obj, key) {
  input.value = obj[key] ?? "";
  input.addEventListener("input", () => {
    obj[key] = input.value;
    setDirty(true);
  });
}

// -----------------------------
// Utility: Bind Checkbox
// -----------------------------
export function bindCheck(input, obj, key) {
  input.checked = !!obj[key];
  input.addEventListener("change", () => {
    obj[key] = input.checked;
    setDirty(true);
  });
}

// -----------------------------
// Utility: Bind Number
// -----------------------------
export function bindNumber(input, obj, key) {
  input.value = obj[key] ?? 0;
  input.addEventListener("input", () => {
    obj[key] = Number(input.value || 0);
    setDirty(true);
  });
}

// -----------------------------
// Utility: Ensure Object Path
// -----------------------------
export function ensure(obj, path, fallback = {}) {
  const parts = path.split(".");
  let ref = obj;
  for (const p of parts) {
    if (!ref[p]) ref[p] = {};
    ref = ref[p];
  }
  return ref;
}

// -----------------------------
// Toast
// -----------------------------
export function toast(msg) {
  const t = el("div", { class: "toast" }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
