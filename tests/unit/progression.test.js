import { describe, it, expect } from 'vitest';
import { createRewards, recordRun, GAME } from '../../src/progression/rewards.js';
import { ACHIEVEMENTS } from '../../src/progression/achievements.js';

function memoryStore() {
  const data = new Map();
  return {
    async getItem(key) { return data.has(key) ? data.get(key) : null; },
    async setItem(key, value) { data.set(key, String(value)); },
    async removeItem(key) { data.delete(key); },
  };
}

const unlockedIds = (rewards) => rewards.getUnlockedAchievements().map((a) => a.id);

describe('progression', () => {
  it('a score of 26 unlocks first flight, 10 and 25 but not 50', async () => {
    const rewards = await createRewards(memoryStore());
    await recordRun(rewards, 26);
    const ids = unlockedIds(rewards);
    expect(ids).toContain('first_game');
    expect(ids).toContain('bf_score_10');
    expect(ids).toContain('bf_score_25');
    expect(ids).not.toContain('bf_score_50');
  });

  it('high score is tracked', async () => {
    const rewards = await createRewards(memoryStore());
    let fired = 0;
    rewards.on('new_high_score', () => { fired += 1; });
    await recordRun(rewards, 8);
    await recordRun(rewards, 15);
    expect(rewards.player.stats[GAME].highScore).toBe(15);
    expect(fired).toBe(2);
  });

  it('hundred pipes accumulates across runs', async () => {
    const rewards = await createRewards(memoryStore());
    for (let i = 0; i < 3; i += 1) await recordRun(rewards, 25);
    expect(unlockedIds(rewards)).not.toContain('bf_pipes_100');
    await recordRun(rewards, 25);
    expect(unlockedIds(rewards)).toContain('bf_pipes_100');
  });

  it('every achievement has a name, an svg icon and numeric xp', async () => {
    const rewards = await createRewards(memoryStore());
    const entries = Object.entries(rewards.achievements);
    expect(entries.length).toBeGreaterThanOrEqual(Object.keys(ACHIEVEMENTS).length);
    for (const [id, a] of entries) {
      expect(a.name, id).toBeTruthy();
      expect(a.icon.startsWith('<svg'), id).toBe(true);
      expect(/\p{Extended_Pictographic}/u.test(a.icon), id).toBe(false);
      expect(typeof a.xp, id).toBe('number');
    }
  });
});
