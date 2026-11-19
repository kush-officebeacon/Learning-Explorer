import { CHALLENGES } from "../data/challenges.js";
import { esc } from "../util.js";
import { load, markPassed, markSeen, stats } from "../progress.js";

export function renderChallenge(root) {
  markSeen("challenge");
  const state = load();
  const pending = CHALLENGES.findIndex((q) => !state.passed[q.id]);
  const index = pending === -1 ? 0 : pending;
  draw(root, index);
}

function draw(root, index) {
  const question = CHALLENGES[index];
  const s = stats(CHALLENGES.length);
  const done = load().passed[question.id];
  root.innerHTML = `
    <section class="section">
      <div class="wrap challenge-card">
        <p class="kicker">Challenge ${index + 1} / ${CHALLENGES.length}</p>
        <h1>What happens next?</h1>
        <p>${esc(question.prompt)}</p>
        <div data-options>
          ${question.options.map((opt, i) => `<button type="button" class="quiz-opt" data-i="${i}">${esc(opt)}</button>`).join("")}
        </div>
        <p class="feedback" data-feedback hidden></p>
        <p class="score-quiet">${s.passed} answered cleanly · ${s.seen} places opened</p>
        <div class="row-actions">
          <button type="button" class="btn ghost" data-prev ${index === 0 ? "disabled" : ""}>Previous</button>
          <button type="button" class="btn ghost" data-next ${index === CHALLENGES.length - 1 ? "disabled" : ""}>Next</button>
        </div>
      </div>
    </section>
  `;
  if (done) reveal(root, question, question.answer, true);
  root.querySelector("[data-options]").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || root.dataset.locked === "1") return;
    const picked = Number(button.dataset.i);
    const correct = picked === question.answer;
    if (correct) markPassed(question.id);
    reveal(root, question, picked, correct);
  });
  root.querySelector("[data-prev]").addEventListener("click", () => draw(root, index - 1));
  root.querySelector("[data-next]").addEventListener("click", () => draw(root, index + 1));
}

function reveal(root, question, picked, correct) {
  root.dataset.locked = "1";
  root.querySelectorAll(".quiz-opt").forEach((button) => {
    const i = Number(button.dataset.i);
    if (i === question.answer) button.classList.add("right");
    else if (i === picked && !correct) button.classList.add("wrong");
    button.disabled = true;
  });
  const feedback = root.querySelector("[data-feedback]");
  feedback.hidden = false;
  feedback.textContent = correct ? question.why : `Not that one. ${question.why}`;
}
