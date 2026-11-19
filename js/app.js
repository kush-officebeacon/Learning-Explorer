import { renderMission } from "./views/mission.js";
import { renderFloor, renderWorker } from "./views/floor.js";
import { renderSim, simAdvance } from "./views/simulator.js";
import { renderAtlasHome, renderSystem, renderCompare } from "./views/atlas.js";
import { renderChallenge } from "./views/challenge.js";
import { mountInspector, closeInspector, inspectorOpen } from "./components/inspector.js";
import { mountSearch, openSearch, closeSearch, searchOpen } from "./components/search.js";
import { WORKERS } from "./data/workers.js";

const view = document.getElementById("view");
const navLinks = [...document.querySelectorAll("[data-nav]")];

function parse() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { parts, query: query || "" };
}

function setNav(name) {
  navLinks.forEach((link) => {
    const on = link.dataset.nav === name;
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

export function render() {
  closeInspector();
  const { parts } = parse();
  const [head, second] = parts;
  if (!head) {
    setNav("mission");
    renderMission(view);
    return;
  }
  if (head === "floor") {
    setNav("floor");
    renderFloor(view);
    return;
  }
  if (head === "sim") {
    setNav("sim");
    renderSim(view, second);
    return;
  }
  if (head === "worker" && second) {
    setNav("floor");
    renderWorker(view, second);
    return;
  }
  if (head === "atlas") {
    setNav("atlas");
    if (!second) renderAtlasHome(view);
    else renderSystem(view, second);
    return;
  }
  if (head === "compare" && second) {
    setNav("atlas");
    renderCompare(view, second);
    return;
  }
  if (head === "challenge") {
    setNav("challenge");
    renderChallenge(view);
    return;
  }
  setNav("mission");
  renderMission(view);
}

function onKey(event) {
  const typing = ["INPUT", "TEXTAREA"].includes(event.target.tagName);
  if (event.key === "Escape") {
    if (searchOpen()) closeSearch();
    else if (inspectorOpen()) closeInspector();
    return;
  }
  if (typing) return;
  if (event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
    event.preventDefault();
    openSearch();
    return;
  }
  if (event.key === "ArrowRight" && (location.hash.startsWith("#/sim") || location.hash === "#/sim")) {
    simAdvance();
    return;
  }
  if (/^[1-7]$/.test(event.key)) {
    const worker = WORKERS[Number(event.key) - 1];
    location.hash = `/worker/${worker.key}`;
  }
}

mountInspector();
mountSearch();
document.getElementById("search-open").addEventListener("click", openSearch);
window.addEventListener("hashchange", render);
window.addEventListener("keydown", onKey);
render();
