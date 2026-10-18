export const RULES = {
  gravity: 900,
  flapVelocity: -276,
  maxFall: 600,
  birdRadius: 12,
  hitInset: 4,
  groundHeight: 100,
  pipeWidth: 52,
  pipeSpacing: 300,
  pipeMargin: 50,
  nearMissDistance: 30,
};

export function speedFor(score) {
  return Math.min(230, 150 + 4 * score);
}

export function gapFor(score) {
  const t = Math.min(1, Math.max(0, score / 40));
  return 150 - 30 * t;
}

export function pipeRange(height, gap) {
  const min = RULES.pipeMargin;
  const max = height - RULES.groundHeight - gap - RULES.pipeMargin;
  return { min, max: max < min ? min : max };
}
