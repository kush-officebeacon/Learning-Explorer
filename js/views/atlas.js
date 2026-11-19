import { SYSTEMS, systemBySlug } from "../data/systems.js";
import { TABLES, VIEWS, COMPARES } from "../data/tables.js";
import { API_GROUPS } from "../data/api.js";
import { GLOSSARY } from "../data/glossary.js";
import { esc, links } from "../util.js";
import { markSeen } from "../progress.js";

export function renderAtlasHome(root) {
  markSeen("atlas");
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="kicker">Systems atlas</p>
        <h1>Open any room</h1>
        <p class="lede">Each room is one mechanism. The beats inside it are the details that do not fit on the factory floor.</p>
        <div class="atlas-grid">
          ${SYSTEMS.map((system) => `
            <a href="#/atlas/${esc(system.slug)}">
              <small>${esc(system.kicker)}</small>
              <strong>${esc(system.title)}</strong>
              <p>${esc(system.summary)}</p>
            </a>`).join("")}
          <a href="#/atlas/tables"><small>Logbook</small><strong>Every table</strong><p>What each Postgres table is for, plus the metric views.</p></a>
          <a href="#/atlas/endpoints"><small>HTTP</small><strong>Endpoint groups</strong><p>The whole /api/v1 surface on one page.</p></a>
          <a href="#/compare/forms"><small>Compare</small><strong>338 vs 340</strong><p>Draft form and real form, same record.</p></a>
        </div>
      </div>
    </section>
  `;
}

export function renderSystem(root, slug) {
  if (slug === "tables") return renderTables(root);
  if (slug === "endpoints") return renderEndpoints(root);
  const system = systemBySlug(slug);
  if (!system) {
    root.innerHTML = `<section class="section wrap"><h1>No such room</h1><p><a href="#/atlas">Atlas</a></p></section>`;
    return;
  }
  markSeen(`atlas:${system.slug}`);
  root.innerHTML = `
    <article class="topic">
      <div class="wrap">
        <header class="topic-head">
          <div>
            <p class="kicker">${esc(system.kicker)}</p>
            <h1>${esc(system.title)}</h1>
            <p class="lede">${esc(system.summary)}</p>
          </div>
          <div>
            <p class="kicker">In the repo</p>
            <ul class="file-list">${system.files.map((file) => `<li>${esc(file)}</li>`).join("")}</ul>
            ${links(system.related)}
          </div>
        </header>
        <div class="beats">
          ${system.beats.map((beat) => `<section class="beat"><h3>${esc(beat.title)}</h3><p>${esc(beat.body)}</p></section>`).join("")}
        </div>
        <div class="row-actions"><a class="btn ghost" href="#/atlas">All rooms</a></div>
      </div>
    </article>
  `;
}

function renderTables(root) {
  markSeen("atlas:tables");
  const groups = [...new Set(TABLES.map((row) => row.group))];
  root.innerHTML = `
    <section class="section">
      <div class="wrap prose">
        <p class="kicker">Postgres</p>
        <h1>The logbook</h1>
        <p class="lede">Metrics are views over these tables. A counter you forget to increment is a permanently wrong number.</p>
        ${groups.map((group) => `
          <h3>${esc(group)}</h3>
          <dl class="kv">${TABLES.filter((row) => row.group === group)
            .map((row) => `<dt class="mono">${esc(row.name)}</dt><dd>${esc(row.use)}</dd>`)
            .join("")}</dl>`).join("")}
        <h3>Views</h3>
        <dl class="kv">${VIEWS.map((row) => `<dt class="mono">${esc(row.name)}</dt><dd>${esc(row.use)}</dd>`).join("")}</dl>
        <div class="link-row">
          <a href="#/compare/logs">audit vs activity</a>
          <a href="#/atlas/data">Why views, not counters</a>
        </div>
      </div>
    </section>
  `;
}

function renderEndpoints(root) {
  markSeen("atlas:endpoints");
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="kicker">FastAPI</p>
        <h1>What the control panel exposes</h1>
        <p class="lede">Mounted only in interfaces/api/v1/__init__.py. The API starts and watches work. It does not extract a PO itself.</p>
        <div class="beats">
          ${API_GROUPS.map((group) => `
            <section class="beat">
              <h3>${esc(group.name)}</h3>
              <p class="mono">${esc(group.prefix)}</p>
              <ul>${group.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </section>`).join("")}
        </div>
        ${GLOSSARY.length ? "" : ""}
      </div>
    </section>
  `;
}

export function renderCompare(root, slug) {
  const compare = COMPARES[slug];
  if (!compare) {
    root.innerHTML = `<section class="section wrap"><h1>Nothing to compare</h1></section>`;
    return;
  }
  markSeen(`compare:${slug}`);
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="kicker">Side by side</p>
        <h1>${esc(compare.title)}</h1>
        <div class="compare" style="margin-top:22px">
          ${[compare.left, compare.right].map((side) => `
            <article>
              <h2>${esc(side.name)}</h2>
              <ul>${side.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul>
            </article>`).join("")}
        </div>
        <div class="row-actions">
          <a class="btn ghost" href="#/compare/forms">338 / 340</a>
          <a class="btn ghost" href="#/compare/logs">Two logs</a>
          <a class="btn ghost" href="#/compare/queues">Triage / extract</a>
        </div>
      </div>
    </section>
  `;
}
