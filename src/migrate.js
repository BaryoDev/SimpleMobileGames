import { sanitize, LEADERBOARD_KEY } from './leaderboard.js';

const DONE_KEY = 'migrated_v1';
const V1_PLAYER = 'simplemobilegames_player';
const V1_LEADERBOARD = 'birdFlightLeaderboard_v1';
const V1_MUTED = 'gameSoundsMuted';
const PLAYER_KEY = 'dopamine_player';
const MUTED_KEY = 'dopamineSoundsMuted';

function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function attempt(fn) {
  try {
    await fn();
  } catch {
    // saved data is untrusted, a bad key is skipped
  }
}

export async function migrateV1({ legacy, store }) {
  try {
    if ((await store.getItem(DONE_KEY)) !== null) return { migrated: false };
  } catch {
    return { migrated: false };
  }

  await attempt(async () => {
    const raw = legacy.getItem(V1_PLAYER);
    const player = parse(raw);
    if (player === null || typeof player !== 'object' || Array.isArray(player)) return;
    if ((await store.getItem(PLAYER_KEY)) === null) await store.setItem(PLAYER_KEY, raw);
  });

  await attempt(async () => {
    const rows = parse(legacy.getItem(V1_LEADERBOARD));
    if (!Array.isArray(rows)) return;
    await store.setItem(LEADERBOARD_KEY, JSON.stringify(sanitize(rows)));
  });

  await attempt(async () => {
    if (legacy.getItem(V1_MUTED) === 'true') legacy.setItem(MUTED_KEY, 'true');
  });

  await attempt(() => store.setItem(DONE_KEY, '1'));
  return { migrated: true };
}
