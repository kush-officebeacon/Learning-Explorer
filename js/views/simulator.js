import { DOSSIER, STEPS, stepById } from "../data/scenarios.js";
import { esc } from "../util.js";
import { markSeen } from "../progress.js";

const NEXT = { sync: "w1", w1: "w2", w3: "w4", w5: "w6" };

function stripClass(index, step) {
  if (step.strip === null || step.strip === undefined) return "";
  const halted = Boolean(step.end) && step.id !== "w7";
  if (index < step.strip) return "done";
  if (index === step.strip) return halted ? "pause" : "now";
  if (halted) return "skip";
  return "";
}
const STRIP = [
  { id: "w1", label: "1 Mail" },
  { id: "w2", label: "2 Triage" },
  { id: "w3", label: "3 Extract" },
  { id: "w4", label: "4 Rules" },
  { id: "w5", label: "5 Draft" },
  { id: "w6", label: "6 File" },
  { id: "w7", label: "7 Stamp" },
];

export function renderSim(root, stepId) {
  markSeen("sim");
  const step = stepById(stepId || "sync");
  root.innerHTML = `
    <div class="wrap sim-layout">
      <aside class="dossier">
        <p class="kicker">Live dossier</p>
        <h2>${esc(DOSSIER.id)}</h2>
        <p>${esc(DOSSIER.subject)}</p>
        <p>From ${esc(DOSSIER.from)}</p>
        <p>${esc(DOSSIER.received)}</p>
        <p>${esc(DOSSIER.files.join(" · "))}</p>
        <p>Brand resolves to ${esc(DOSSIER.brand)}.<br>Customer candidate ${esc(DOSSIER.customer)}.</p>
      </aside>
      <div>
        <div class="strip" role="list" aria-label="Pipeline">
          ${STRIP.map((item, index) => {
            const cls = stripClass(index, step);
            return `<button type="button" class="${cls}" data-go="${item.id}">${esc(item.label)}</button>`;
          }).join("")}
        </div>
        <article class="story">
          <p class="kicker">${step.worker ? esc(step.worker) : "before the line"}</p>
          <h1>${esc(step.title)}</h1>
          <p>${esc(step.body)}</p>
          <div class="badges">${(step.badges || []).map((b) => `<span class="chip">${esc(b)}</span>`).join("")}</div>
          <div class="callouts">
            <div><h3>Writes</h3><ul>${step.writes.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>
            <div><h3>Calls out</h3><ul>${step.calls.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
          </div>
          ${step.choice ? `<p style="margin-top:16px">${esc(step.choice.prompt)}</p><div class="choices">${step.choice.options
            .map((opt) => `<button type="button" class="btn ${opt.id === "po" || opt.id === "ok" || opt.id === "yes" ? "" : "ghost"}" data-go="${esc(opt.go)}">${esc(opt.label)}</button>`)
            .join("")}</div>` : ""}
          <div class="row-actions">
            ${NEXT[step.id] ? `<button type="button" class="btn" data-go="${NEXT[step.id]}">Advance <span aria-hidden="true">→</span></button>` : ""}
            ${step.end ? `<a class="btn ghost" href="#/sim">Run it again</a><a class="btn ghost" href="#/challenge">Try the challenges</a>` : ""}
            <a class="btn ghost" href="#/floor">Back to the floor</a>
          </div>
        </article>
      </div>
    </div>
  `;
  root.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = `/sim/${button.dataset.go}`;
    });
  });
}

export function simAdvance() {
  const id = location.hash.split("/")[2] || "sync";
  const step = stepById(id);
  if (NEXT[step.id]) location.hash = `/sim/${NEXT[step.id]}`;
}

export const STEP_IDS = STEPS.map((step) => step.id);
