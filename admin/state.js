// /admin/state.js

// Create an element with attributes and children
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }

  for (const child of children) {
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else if (child) node.appendChild(child);
  }

  return node;
}

// Ensure nested object path exists
export function ensure(obj, path, fallback) {
  const parts = path.split(".");
  let cur = obj;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (!(key in cur)) {
      cur[key] = (i === parts.length - 1) ? fallback : {};
    }
    cur = cur[key];
  }

  return cur;
}

// Bind input to object property
export function bindInput(input, obj, key) {
  input.value = obj[key] ?? "";

  input.addEventListener("input", () => {
    obj[key] = input.value;
    setDirty(true);
  });
}

// Track unsaved changes
let DIRTY = false;

export function setDirty(v = true) {
  DIRTY = v;
  const status = document.getElementById("saveStatus");
  if (status) status.textContent = v ? "Unsaved changes" : "Saved";
}

export function isDirty() {
  return DIRTY;
}