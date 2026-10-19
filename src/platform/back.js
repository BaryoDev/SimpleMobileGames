export function backAction({ phase, paused }) {
  if (paused) return 'resume';
  if (phase === 'playing') return 'pause';
  if (phase === 'over') return 'ready';
  return 'exit';
}
