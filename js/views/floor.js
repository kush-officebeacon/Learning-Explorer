import { WORKERS, ENGINE, workerByKey } from "../data/workers.js";
import { esc, list, links } from "../util.js";
import { markSeen } from "../progress.js";
import { openInspector, workerHtml } from "../components/inspector.js";

const ROOMS = [
  { cls: "mail", area: "Mail room", title: "Worker 1", text: "Custody check. Duplicates. Forward-only senders.", key: "w1_fetch_email" },
  { cls: "ai", area: "AI bay", title: "Workers 2–3", text: "Triage, then the deep read. Brand is named here.", keys: ["w2_vlm_classify", "w3_extract"] },
  { cls: "rules", area: "Rules desk", title: "Worker 4", text: "Customer, SKU, both NetSuite bodies. No POST.", key: "w4_validate" },
  { cls: "erp", area: "ERP bay", title: "Workers 5 and 7", text: "Draft the order. Later, stamp it real.", keys: ["w5_erp_preflight", "w7_erp_convert"] },
  { cls: "file", area: "File cabinet", title: "Worker 6", text: "SkyDoc. Same NetSuite token.", key: "w6_skydoc" },
  { cls: "ops", area: "Ops tower", title: "Dispatcher", text: "Settings decide the next step. Queues, sessions, reviews.", href: "#/atlas/workflow" },
];

const TOUR = [
  { selector: ".room.mail", text: "Mail lands here only after sync has stored it. Worker 1 refuses to continue if a file never reached S3." },
  { selector: ".room.ai", text: "Worker 2 spends a little to decide if this is even an order. Worker 3 spends a lot to read it. They do not share a queue." },
  { selector: ".room.rules", text: "All business judgment happens before anyone talks to the sales-order API. A miss becomes a review, not a retry." },
  { selector: ".room.erp", text: "Worker 5 creates a dummy order. Worker 7 patches that same record. There is never a second sales order." },
  { selector: ".room.file", text: "Documents are filed onto the draft so the reviewer sees the PDF on the transaction." },
  { selector: ".room.ops", text: "Nothing in the line calls the next machine by name. The snapshot on the workflow does." },
];

export function renderFloor(root) {
  markSeen("floor");
  const tour = new URLSearchParams(location.hash.split("?")[1] || "").get("tour") === "1";
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <div class="floor-head">
          <p class="kicker">Spatial map</p>
          <h1>Factory floor</h1>
          <p class="lede">Click a room. The first click is the short version. Open the bay when you want the full mechanism.</p>
        </div>
        ${tour ? `<div class="tour-bar" data-tour><p data-tour-text></p><div class="row-actions"><button type="button" class="btn ghost" data-tour-prev>Back</button><button type="button" class="btn" data-tour-next>Next</button></div></div>` : ""}
        <div class="floor-map">
          ${ROOMS.map((room) => `
            <button type="button" class="room ${room.cls}" data-room="${esc(room.cls)}">
              <span><small>${esc(room.area)}</small><strong>${esc(room.title)}</strong></span>
              <p>${esc(room.text)}</p>
            </button>`).join("")}
          <a class="room atlas" href="#/atlas"><span><small>Atlas</small><strong>Systems</strong></span><p>AI, keys, auth, queues, tables, the API.</p></a>
          <a class="room sim" href="#/sim"><span><small>Simulator</small><strong>Run PO-4412</strong></span><p>Step a real-shaped order. Fork it when the model or the rules disagree.</p></a>
        </div>
      </div>
    </section>
  `;

  root.querySelectorAll("[data-room]").forEach((button) => {
    button.addEventListener("click", () => openRoom(button.dataset.room));
  });

  if (tour) startTour(root);
}

function openRoom(cls) {
  const room = ROOMS.find((item) => item.cls === cls);
  if (!room) return;
  if (room.href) {
    location.hash = room.href.replace(/^#/, "");
    return;
  }
  const keys = room.keys || [room.key];
  const html = keys
    .map((key) => {
      const worker = workerByKey(key);
      return `<h3 style="margin:14px 0 6px">Worker ${worker.num}</h3>${workerHtml(worker)}`;
    })
    .join("");
  openInspector({ kicker: room.area, title: room.title, html });
  keys.forEach((key) => markSeen(key));
}

function startTour(root) {
  let index = 0;
  const text = root.querySelector("[data-tour-text]");
  const paint = () => {
    root.querySelectorAll(".room").forEach((el) => el.classList.remove("tour-on"));
    const step = TOUR[index];
    root.querySelector(step.selector)?.classList.add("tour-on");
    text.textContent = `${index + 1} / ${TOUR.length} — ${step.text}`;
    root.querySelector("[data-tour-next]").textContent = index === TOUR.length - 1 ? "Run a PO" : "Next";
  };
  paint();
  root.querySelector("[data-tour-next]").addEventListener("click", () => {
    if (index === TOUR.length - 1) {
      location.hash = "/sim";
      return;
    }
    index += 1;
    paint();
  });
  root.querySelector("[data-tour-prev]").addEventListener("click", () => {
    index = Math.max(0, index - 1);
    paint();
  });
}

export function renderWorker(root, key) {
  const worker = workerByKey(key);
  if (!worker) {
    root.innerHTML = `<section class="section wrap"><h1>Unknown station</h1><p><a href="#/floor">Back to the floor</a></p></section>`;
    return;
  }
  markSeen(worker.key);
  root.innerHTML = `
    <section class="section">
      <div class="wrap worker-hero">
        <p class="kicker">Worker ${worker.num} · ${esc(worker.queue)} queue</p>
        <h1>${esc(worker.name)}</h1>
        <p class="lede">${esc(worker.short)}</p>
        <div class="worker-grid">
          <div class="prose">
            <h3>What it does</h3>
            <p>${esc(worker.job)}</p>
            <h3>Why it is separate</h3>
            <p>${esc(worker.why)}</p>
            ${worker.beats.map((beat) => `<h3>${esc(beat.title)}</h3><p>${esc(beat.body)}</p>`).join("")}
            <h3>When it stops or refuses</h3>
            ${list(worker.skips)}
            ${list(worker.fails)}
          </div>
          <aside class="side-note">
            <p class="kicker">On the row</p>
            <dl class="kv">
              <dt>Key</dt><dd class="mono">${esc(worker.key)}</dd>
              <dt>Stage</dt><dd class="mono">${esc(worker.stage)}</dd>
              <dt>Writes</dt><dd>${esc(worker.writes.join("; "))}</dd>
              <dt>Reads</dt><dd>${esc(worker.reads.join("; "))}</dd>
              <dt>Connectors</dt><dd>${esc(worker.connectors.join("; "))}</dd>
            </dl>
            <p class="kicker">Open in the repo</p>
            <ul class="file-list">${worker.files.map((file) => `<li>${esc(file)}</li>`).join("")}</ul>
            ${links(worker.related)}
            <div class="row-actions">
              <a class="btn ghost" href="#/floor">Floor</a>
              <a class="btn" href="#/sim">Simulate</a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}

export function workerKeys() {
  return WORKERS.map((worker) => worker.key);
}

void ENGINE;
