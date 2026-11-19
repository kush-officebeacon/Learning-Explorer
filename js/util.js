export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export function list(items) {
  if (!items?.length) return "";
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

export function links(items) {
  if (!items?.length) return "";
  return `<div class="link-row">${items
    .map((item) => `<a href="${esc(item.href)}">${esc(item.label)}</a>`)
    .join("")}</div>`;
}
