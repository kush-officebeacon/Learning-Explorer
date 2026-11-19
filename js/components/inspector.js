import { esc } from "../util.js";

let root;
let backdrop;
let lastFocus;

export function mountInspector() {
  backdrop = document.getElementById("backdrop");
  root = document.getElementById("inspector");
  backdrop.addEventListener("click", closeInspector);
  root.querySelector("[data-close]").addEventListener("click", closeInspector);
}

export function openInspector({ kicker, title, html }) {
  lastFocus = document.activeElement;
  root.querySelector("[data-kicker]").textContent = kicker || "";
  root.querySelector("[data-title]").textContent = title || "";
  root.querySelector("[data-body]").innerHTML = html || "";
  root.classList.add("open");
  root.setAttribute("aria-hidden", "false");
  backdrop.classList.add("show");
  backdrop.hidden = false;
  const close = root.querySelector("[data-close]");
  close.focus();
}

export function closeInspector() {
  const wasOpen = root.classList.contains("open");
  root.classList.remove("open");
  root.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("show");
  backdrop.hidden = true;
  root.querySelector("[data-body]").innerHTML = "";
  root.querySelector("[data-title]").textContent = "";
  root.querySelector("[data-kicker]").textContent = "";
  if (wasOpen && lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

export function inspectorOpen() {
  return root.classList.contains("open");
}

export function workerHtml(worker) {
  return `
    <p>${esc(worker.job)}</p>
    <p>${esc(worker.why)}</p>
    <dl class="kv">
      <dt>Queue</dt><dd>${esc(worker.queue)}</dd>
      <dt>Stage</dt><dd class="mono">${esc(worker.stage)}</dd>
      <dt>Key</dt><dd class="mono">${esc(worker.key)}</dd>
    </dl>
    <div class="link-row"><a href="#/worker/${esc(worker.key)}">Open the full bay</a></div>
  `;
}
