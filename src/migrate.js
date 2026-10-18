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

function readLegacy(legacy, key) {
  try {
    return legacy.getItem(key);
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function migrateV1({ legacy, store }) {
  try {
    if ((await store.getItem(DONE_KEY)) !== null) return { migrated: false };

    const rawPlayer = readLegacy(legacy, V1_PLAYER);
    if (isPlainObject(parse(rawPlayer))) {
      const existing = await store.getItem(PLAYER_KEY);
      if (!isPlainObject(parse(existing))) await store.setItem(PLAYER_KEY, rawPlayer);
    }

    const rows = sanitize(parse(readLegacy(legacy, V1_LEADERBOARD)));
    if (rows.length > 0 && (await store.getItem(LEADERBOARD_KEY)) === null) {
      await store.setItem(LEADERBOARD_KEY, JSON.stringify(rows));
    }

    try {
      if (readLegacy(legacy, V1_MUTED) === 'true') legacy.setItem(MUTED_KEY, 'true');
    } catch {
      // the mute flag is a nicety, not worth a retry
    }

    await store.setItem(DONE_KEY, '1');
    return { migrated: true };
  } catch {
    // a store write failed, so the flag stays unset and the next boot retries
    return { migrated: false };
  }
}
