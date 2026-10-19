import { RewardSystem, DataService } from 'dopaminejs';
import { ACHIEVEMENTS } from './achievements.js';

export const GAME = 'birdFlight';

export async function createRewards(store) {
  const rewards = new RewardSystem(new DataService({ storage: store }), { achievements: ACHIEVEMENTS });
  await rewards.init();
  return rewards;
}

export async function recordRun(rewards, score) {
  const safe = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  // recordGame sums extra numeric keys per game, so totalScore keeps a running total for bf_pipes_100.
  return rewards.recordGame(GAME, { score: safe, totalScore: safe });
}
