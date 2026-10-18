import { describe, it, expect } from 'vitest';
import { createMemoryStorage, DataService, RewardSystem } from 'dopaminejs';
import { migrateV1 } from '../../src/migrate.js';

function asyncStore() {
  const map = new Map();
  return {
    map,
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, String(v)); },
    removeItem: async (k) => { map.delete(k); },
  };
}

function legacyWith(values) {
  const legacy = createMemoryStorage();
  for (const [k, v] of Object.entries(values)) legacy.setItem(k, v);
  return legacy;
}

const PLAYER = { xp: 340, level: 3, stats: { birdFlight: { highScore: 27 } } };

describe('migrateV1', () => {
  it('moves the v1 player', async () => {
    const legacy = legacyWith({ simplemobilegames_player: JSON.stringify(PLAYER) });
    const store = asyncStore();
    const result = await migrateV1({ legacy, store });
    expect(result).toEqual({ migrated: true });
    expect(JSON.parse(store.map.get('dopamine_player'))).toEqual(PLAYER);
    const rewards = new RewardSystem(new DataService({ storage: store }));
    const player = await rewards.init();
    expect(player.level).toBe(3);
    expect(player.stats.birdFlight.highScore).toBe(27);
  });

  it('moves the leaderboard and drops bad rows', async () => {
    const rows = [{ name: 'Ana', score: 12, ts: 1 }, { name: 5 }, { name: 'Ben', score: 'x' }];
    const legacy = legacyWith({ birdFlightLeaderboard_v1: JSON.stringify(rows) });
    const store = asyncStore();
    await migrateV1({ legacy, store });
    expect(JSON.parse(store.map.get('leaderboard'))).toEqual([{ name: 'Ana', score: 12, ts: 1 }]);
  });

  it('runs once', async () => {
    const store = asyncStore();
    const first = await migrateV1({ legacy: legacyWith({}), store });
    expect(first).toEqual({ migrated: true });
    expect(store.map.get('migrated_v1')).toBe('1');
    const legacy = legacyWith({ simplemobilegames_player: JSON.stringify(PLAYER) });
    const second = await migrateV1({ legacy, store });
    expect(second).toEqual({ migrated: false });
    expect(store.map.has('dopamine_player')).toBe(false);
  });

  it('does not overwrite a v2 player', async () => {
    const store = asyncStore();
    store.map.set('dopamine_player', '{"xp":1}');
    const legacy = legacyWith({ simplemobilegames_player: JSON.stringify(PLAYER) });
    await migrateV1({ legacy, store });
    expect(store.map.get('dopamine_player')).toBe('{"xp":1}');
  });

  it('survives garbage', async () => {
    for (const bad of ['null', '42', '{bad']) {
      const legacy = legacyWith({
        simplemobilegames_player: bad,
        birdFlightLeaderboard_v1: bad,
        gameSoundsMuted: bad,
      });
      const store = asyncStore();
      await expect(migrateV1({ legacy, store })).resolves.toEqual({ migrated: true });
      expect(store.map.get('migrated_v1')).toBe('1');
      expect(store.map.has('dopamine_player')).toBe(false);
      expect(legacy.getItem('dopamineSoundsMuted')).toBeNull();
    }
  });

  it('does not throw when storage fails', async () => {
    const boom = () => { throw new Error('boom'); };
    const legacy = { getItem: boom, setItem: boom, removeItem: boom };
    const store = asyncStore();
    await expect(migrateV1({ legacy, store })).resolves.toEqual({ migrated: true });
  });

  it('carries the mute flag', async () => {
    const legacy = legacyWith({ gameSoundsMuted: 'true' });
    await migrateV1({ legacy, store: asyncStore() });
    expect(legacy.getItem('dopamineSoundsMuted')).toBe('true');
  });
});
