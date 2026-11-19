import { stats } from "../progress.js";
import { CHALLENGES } from "../data/challenges.js";

const STATIONS = ["Mail", "Triage", "Extract", "Rules", "Draft", "File", "Stamp"];

export function renderMission(root) {
  const s = stats(CHALLENGES.length);
  root.innerHTML = `
    <section class="mission">
      <div class="wrap split">
        <div>
          <p class="kicker">OB Automation</p>
          <h1>Order Desk Explorer</h1>
          <p class="lede">Email comes in. A sales order goes out. Walk the factory instead of reading the manual.</p>
          <div class="row-actions">
            <a class="btn" href="#/floor">Walk the floor</a>
            <a class="btn ghost" href="#/floor?tour=1">Guided tour</a>
            <a class="btn ghost" href="#/sim">Run a PO</a>
            <a class="btn ghost" href="#/challenge">Test yourself</a>
          </div>
          <p class="stat-line">
            <span><strong>${s.seen}</strong> places opened</span>
            <span><strong>${s.passed}</strong> / ${s.totalChallenges} challenges</span>
          </p>
        </div>
        <div>
          <p class="kicker">One order, seven stations</p>
          <div class="pipeline-mini" aria-hidden="true">
            ${STATIONS.map((name, i) => `<span class="${i === 2 ? "pulse" : ""}"><b>0${i + 1}</b>${name}</span>`).join("")}
          </div>
          <p class="lede" style="margin-top:14px">The pulsing station is the expensive one. Extraction. Everything else is arranged so that work cannot starve it, and so it never books money before a person looks.</p>
        </div>
      </div>
    </section>
  `;
}

export function missionNav() {
  return "mission";
}
