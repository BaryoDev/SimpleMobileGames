export const LEADERBOARD_KEY = 'leaderboard';

const MAX_ENTRIES = 5;
const MAX_NAME = 16;

function cleanName(name) {
  return String(name ?? '').trim().slice(0, MAX_NAME) || 'Player';
}

function ranked(entries) {
  const best = new Map();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    const prev = best.get(key);
    if (!prev || e.score >= prev.score) best.set(key, e);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}

export function addScore(entries, name, score, now) {
  const run = { name: cleanName(name), score, ts: now };
  return { entries: ranked([...entries, run]), run };
}

export function sanitize(value) {
  if (!Array.isArray(value)) return [];
  const valid = value
    .filter(
      (e) =>
        e !== null &&
        typeof e === 'object' &&
        typeof e.name === 'string' &&
        Number.isFinite(e.score) &&
        e.score >= 0 &&
        Number.isFinite(e.ts),
    )
    .map((e) => ({ name: cleanName(e.name), score: e.score, ts: e.ts }));
  return ranked(valid);
}
