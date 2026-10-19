import { Game, GameUI, ParticleSystem, SoundManager } from 'dopaminejs';
import 'dopaminejs/style.css';
import './ui/styles.css';
import { createWorld, resize } from './game/world.js';
import { FlightScene } from './game/scene.js';
import { shouldFlap } from './ui/input.js';
import { createScreens, svgElement, FLAME_ICON } from './ui/screens.js';
import { createStorage } from './platform/storage.js';
import { migrateV1 } from './migrate.js';
import { addScore, sanitize, LEADERBOARD_KEY } from './leaderboard.js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { createHaptics } from './platform/haptics.js';
import { wireLifecycle } from './platform/lifecycle.js';
import { createRewards, recordRun, GAME } from './progression/rewards.js';

const NAME_KEY = 'player_name';
const MAX_DPR = 3;

const MILESTONES = {
  1: { text: 'First point', color: '#4facfe', size: '24px' },
  5: { text: 'Getting good', color: '#45b7d1', size: '28px', sparkle: [20, '#45b7d1'] },
  10: { text: 'Great start', color: '#ffd700', size: '32px', confetti: 30 },
  20: { text: 'On fire', color: '#ff6b00', size: '36px', fire: 25 },
  30: { text: 'Unstoppable', color: '#ff4400', size: '40px', confetti: 50, fire: 30 },
  50: { text: 'Legendary', color: '#ffd700', size: '48px', star: 12, confetti: 60 },
};

function safe(fn) {
  try {
    return fn();
  } catch (error) {
    console.warn('[bird-flight]', error);
    return undefined;
  }
}

function parseBoard(raw) {
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

function guardedLocalStorage() {
  const fallback = new Map();
  return {
    getItem(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return fallback.get(key) ?? null;
      }
    },
    setItem(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        fallback.set(key, String(value));
      }
    },
    removeItem(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        fallback.delete(key);
      }
    },
  };
}

function createMemoryStore() {
  const data = new Map();
  return {
    async getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async setItem(key, value) {
      data.set(key, String(value));
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}

async function boot() {
  let store;
  try {
    store = createStorage();
  } catch (error) {
    console.warn('[bird-flight] storage unavailable, using memory', error);
    store = createMemoryStore();
  }
  try {
    await migrateV1({ legacy: window.localStorage, store });
  } catch (error) {
    console.warn('[bird-flight] migration failed', error);
  }

  let rewards = null;
  try {
    rewards = await createRewards(store);
  } catch (error) {
    console.warn('[bird-flight] rewards unavailable', error);
  }

  let board = [];
  let playerName = '';
  try {
    board = parseBoard(await store.getItem(LEADERBOARD_KEY));
    playerName = (await store.getItem(NAME_KEY)) ?? '';
  } catch (error) {
    console.warn('[bird-flight] could not read saved data', error);
  }

  if (!playerName && board.length > 0) {
    playerName = board.reduce((a, b) => (b.ts > a.ts ? b : a)).name;
  }

  const savedBest = rewards?.player?.stats?.[GAME]?.highScore ?? 0;
  let best = Math.max(savedBest, ...board.map((e) => e.score), 0);

  const canvas = document.getElementById('game');
  const game = new Game({ canvas, width: window.innerWidth, height: window.innerHeight, backgroundColor: '#9fd0f2' });
  const particles = new ParticleSystem();
  const gameUI = new GameUI(particles);
  const sound = new SoundManager({ storage: guardedLocalStorage() });

  const streakIcon = gameUI.container.querySelector('.streak-icon');
  const flame = svgElement(FLAME_ICON);
  if (streakIcon && flame) streakIcon.replaceChildren(flame);

  const syncProgress = () => {
    if (!rewards?.player) return;
    const { player } = rewards;
    const { total, needed, progress } = rewards.getXPForNextLevel();
    gameUI.updateXP(player.xp, needed, total, progress);
    gameUI.updateLevel(player.level);
    gameUI.updateStreak(player.streak.current);
  };
  safe(syncProgress);
  rewards?.on('level_up', (data) => {
    safe(() => {
      gameUI.showFloatingText(`Level ${data.newLevel}`, window.innerWidth / 2 - 50, window.innerHeight / 3, '#ffd700', '36px');
      particles.confetti(window.innerWidth / 2, window.innerHeight / 3, 40);
    });
  });

  const native = Capacitor.isNativePlatform();
  const haptics = createHaptics(Haptics, native);

  const newWorld = () =>
    createWorld({ width: window.innerWidth, height: window.innerHeight, seed: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
  let world = newWorld();
  let mode = 'menu';

  function toStart() {
    world = newWorld();
    scene.setWorld(world);
    mode = 'menu';
    screens.setName(playerName);
    screens.showReady(best);
  }

  function resumeRun() {
    scene.resume();
    screens.hidePaused();
  }

  const screens = createScreens(document.getElementById('ui'), {
    onStart(name) {
      playerName = String(name ?? '').trim().slice(0, 16);
      store.setItem(NAME_KEY, playerName).catch((e) => console.warn('[bird-flight] could not save name', e));
      safe(() => sound.initAudio());
      mode = 'playing';
      screens.showPlaying();
    },
    onRestart: toStart,
    onResume: resumeRun,
    onToggleMute() {
      return sound.toggleMute();
    },
  });
  screens.setMuted(sound.muted);
  screens.setName(playerName);
  screens.showReady(best);

  async function persistRun(score, entries) {
    try {
      await store.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('[bird-flight] could not save the leaderboard', error);
    }
    if (!rewards) return;
    try {
      await recordRun(rewards, score);
      syncProgress();
      const unseen = rewards.getUnseenAchievements();
      unseen.forEach((a, i) => setTimeout(() => safe(() => screens.showAchievement(a)), 500 + i * 700));
      if (unseen.length > 0) await rewards.markAchievementsSeen(unseen.map((a) => a.id));
    } catch (error) {
      console.warn('[bird-flight] could not record the run', error);
    }
  }

  function onCrash() {
    mode = 'over';
    const score = world.score;
    safe(() => sound.playGameOver());
    haptics.crash();
    let entries = board;
    let run = null;
    try {
      ({ entries, run } = addScore(board, playerName, score, Date.now()));
      board = entries;
    } catch (error) {
      console.warn('[bird-flight] could not rank the run', error);
    }
    best = Math.max(best, score);
    screens.showOver(score, best, board, run);
    persistRun(score, board);
  }

  function celebrate(score) {
    const { bird } = world;
    particles.sparkle(bird.x, bird.y, 10, '#ffd700');
    const m = MILESTONES[score];
    if (!m) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 3;
    gameUI.showFloatingText(m.text, cx - m.text.length * 6, cy, m.color, m.size);
    if (m.sparkle) particles.sparkle(cx, cy, m.sparkle[0], m.sparkle[1]);
    if (m.confetti) particles.confetti(cx, cy, m.confetti);
    if (m.fire) particles.fire(cx, cy, m.fire);
    if (m.star) particles.starBurst(cx, cy, m.star);
  }

  const scene = new FlightScene({
    world,
    onEvents(events) {
      if (events.flapped) {
        safe(() => sound.playJump());
        haptics.flap();
        screens.hideFlapHint();
      }
      if (events.scored) {
        screens.showScore(world.score);
        safe(() => sound.playScore());
        haptics.score();
        safe(() => celebrate(world.score));
      }
      if (events.nearMiss) {
        safe(() => {
          gameUI.showFloatingText('Close call', world.bird.x, world.bird.y - 30, '#45b7d1', '20px');
          particles.sparkle(world.bird.x, world.bird.y, 15, '#45b7d1');
        });
      }
      if (events.crashed) onCrash();
    },
  });

  function fit() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    game.renderer.resize(Math.round(w * dpr), Math.round(h * dpr));
    scene.dpr = dpr;
    resize(world, w, h);
    scene.snap();
  }
  fit();
  window.addEventListener('resize', fit);

  const onInput = (event) => {
    if (mode !== 'playing' || scene.paused) return;
    if (event.type === 'keydown' && event.repeat) return;
    if (!shouldFlap(event, world.phase)) return;
    if (event.type === 'keydown') event.preventDefault();
    scene.flap();
  };
  window.addEventListener('pointerdown', onInput);
  window.addEventListener('keydown', onInput);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !scene.paused && mode === 'playing' && world.phase === 'playing') {
      scene.pause();
      screens.showPaused();
    }
  });

  game.setScene(scene);
  game.start();

  if (native) {
    wireLifecycle({
      App,
      scene,
      onPause: () => screens.showPaused(),
      onBack(action) {
        if (action === 'pause') {
          scene.pause();
          screens.showPaused();
        } else if (action === 'resume') resumeRun();
        else if (action === 'ready') {
          if (screens.overGuardClear()) toStart();
        } else if (mode === 'playing') toStart();
        else App.exitApp();
      },
    });
    const quiet = (call) => safe(() => Promise.resolve(call()).catch(() => {}));
    quiet(() => StatusBar.setStyle({ style: Style.Light }));
    quiet(() => StatusBar.setOverlaysWebView({ overlay: false }));
    requestAnimationFrame(() => requestAnimationFrame(() => quiet(() => SplashScreen.hide())));
  }

  if (import.meta.env.DEV || new URLSearchParams(window.location.search).get('test') === '1') {
    window.__bf = {
      get world() {
        return world;
      },
      scene,
    };
  }
}

boot().catch((error) => console.error('[bird-flight] failed to start', error));
