import { WORKERS } from "../data/workers.js";
import { SYSTEMS } from "../data/systems.js";
import { GLOSSARY } from "../data/glossary.js";
import { COMPARES } from "../data/tables.js";
import { esc } from "../util.js";

let layer;
let input;
let hitsEl;
let active = 0;
let current = [];

function index() {
  const rows = [];
  for (const worker of WORKERS) {
    rows.push({
      title: `Worker ${worker.num} · ${worker.name}`,
      hint: worker.short,
      href: `#/worker/${worker.key}`,
      hay: `${worker.name} ${worker.key} ${worker.short} ${worker.job}`,
    });
  }
  for (const system of SYSTEMS) {
    rows.push({
      title: system.title,
      hint: system.summary,
      href: `#/atlas/${system.slug}`,
      hay: `${system.title} ${system.summary} ${system.beats.map((b) => b.title).join(" ")}`,
    });
  }
  for (const term of GLOSSARY) {
    rows.push({ title: term.term, hint: term.blurb, href: term.href, hay: `${term.term} ${term.blurb}` });
  }
  for (const [slug, compare] of Object.entries(COMPARES)) {
    rows.push({ title: compare.title, hint: "Side by side", href: `#/compare/${slug}`, hay: compare.title });
  }
  rows.push(
    { title: "Factory floor", hint: "Walk the rooms", href: "#/floor", hay: "floor map rooms" },
    { title: "PO simulator", hint: "Run PO-4412", href: "#/sim", hay: "simulator purchase order" },
    { title: "Challenges", hint: "Test yourself", href: "#/challenge", hay: "quiz challenges" },
    { title: "Table index", hint: "Postgres logbook", href: "#/atlas/tables", hay: "tables postgres sales_orders" },
  );
  return rows;
}

const ALL = index();

function renderHits() {
  hitsEl.innerHTML = current
    .map(
      (row, i) => `<button type="button" class="${i === active ? "active" : ""}" data-i="${i}">
        ${esc(row.title)}<small>${esc(row.hint)}</small>
      </button>`,
    )
    .join("");
}

function go(row) {
  closeSearch();
  if (row) location.hash = row.href.replace(/^#/, "");
}

export function mountSearch() {
  layer = document.getElementById("search-layer");
  input = document.getElementById("search-input");
  hitsEl = document.getElementById("search-hits");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    current = (q ? ALL.filter((row) => row.hay.toLowerCase().includes(q)) : ALL.slice(0, 8)).slice(0, 12);
    active = 0;
    renderHits();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      active = Math.min(active + 1, current.length - 1);
      renderHits();
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      active = Math.max(active - 1, 0);
      renderHits();
      event.preventDefault();
    } else if (event.key === "Enter") {
      go(current[active]);
      event.preventDefault();
    } else if (event.key === "Escape") {
      closeSearch();
    }
  });
  hitsEl.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    go(current[Number(button.dataset.i)]);
  });
  layer.addEventListener("click", (event) => {
    if (event.target === layer) closeSearch();
  });
}

export function openSearch() {
  layer.classList.add("show");
  layer.setAttribute("aria-hidden", "false");
  input.value = "";
  current = ALL.slice(0, 8);
  active = 0;
  renderHits();
  input.focus();
}

export function closeSearch() {
  layer.classList.remove("show");
  layer.setAttribute("aria-hidden", "true");
}

export function searchOpen() {
  return layer.classList.contains("show");
}
