import { RewardSystem, DataService } from 'dopaminejs';
import { ACHIEVEMENTS } from './achievements.js';

export const GAME = 'birdFlight';

export async function createRewards(store) {
  const rewards = new RewardSystem(new DataService({ storage: store }), { achievements: ACHIEVEMENTS });
  await rewards.init();
  return rewards;
}

export async function recordRun(rewards, score) {
  // recordGame sums extra numeric keys per game, so totalScore keeps a running total for bf_pipes_100.
  return rewards.recordGame(GAME, { score, totalScore: score });
}
