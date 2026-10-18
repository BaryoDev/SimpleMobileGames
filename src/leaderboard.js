export const LEADERBOARD_KEY = 'leaderboard';

const MAX_ENTRIES = 5;
const MAX_NAME = 16;

export function addScore(entries, name, score, now) {
  const clean = String(name ?? '').trim().slice(0, MAX_NAME) || 'Anonymous';
  const run = { name: clean, score, ts: now };
  const key = clean.toLowerCase();
  const rest = [];
  let best = run;
  for (const e of entries) {
    if (e.name.toLowerCase() !== key) rest.push(e);
    else if (e.score > best.score) best = e;
  }
  rest.push(best);
  rest.sort((a, b) => b.score - a.score);
  return { entries: rest.slice(0, MAX_ENTRIES), run };
}

export function sanitize(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e) =>
      e !== null &&
      typeof e === 'object' &&
      typeof e.name === 'string' &&
      Number.isFinite(e.score) &&
      e.score >= 0 &&
      typeof e.ts === 'number',
  ).map((e) => ({ name: e.name, score: e.score, ts: e.ts }));
}
