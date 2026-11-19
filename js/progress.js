const KEY = "order-desk-explorer";

function blank() {
  return { seen: {}, passed: {} };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return { seen: parsed.seen || {}, passed: parsed.passed || {} };
  } catch {
    return blank();
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function markSeen(id) {
  const state = load();
  state.seen[id] = true;
  save(state);
  return state;
}

export function markPassed(id) {
  const state = load();
  state.passed[id] = true;
  save(state);
  return state;
}

export function stats(totalChallenges) {
  const state = load();
  return {
    seen: Object.keys(state.seen).length,
    passed: Object.keys(state.passed).length,
    totalChallenges,
  };
}
