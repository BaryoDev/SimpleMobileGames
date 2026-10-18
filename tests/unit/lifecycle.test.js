import { describe, it, expect, vi } from 'vitest';
import { EventBus } from 'dopaminejs';
import { wireLifecycle } from '../../src/platform/lifecycle.js';
import { createHaptics } from '../../src/platform/haptics.js';
import { FlightScene } from '../../src/game/scene.js';
import { createWorld } from '../../src/game/world.js';

function fakeApp() {
  const listeners = {};
  const removed = [];
  return {
    listeners,
    removed,
    addListener: vi.fn(async (name, fn) => {
      listeners[name] = fn;
      return { remove: async () => removed.push(name) };
    }),
  };
}

const fakeScene = (phase = 'playing', paused = false) => ({
  world: { phase },
  paused,
  pause: vi.fn(function pause() {
    this.paused = true;
  }),
});

describe('wireLifecycle', () => {
  it('pauses a run when the app goes inactive, once', async () => {
    const App = fakeApp();
    const scene = fakeScene();
    const onPause = vi.fn();
    wireLifecycle({ App, scene, onBack: () => {}, onPause });
    await Promise.resolve();
    App.listeners.appStateChange({ isActive: false });
    App.listeners.appStateChange({ isActive: false });
    expect(scene.pause).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the app becomes active, or when no run is going', async () => {
    const App = fakeApp();
    const scene = fakeScene();
    wireLifecycle({ App, scene, onBack: () => {} });
    App.listeners.appStateChange({ isActive: true });
    expect(scene.pause).not.toHaveBeenCalled();
    const idle = fakeScene('ready');
    const App2 = fakeApp();
    wireLifecycle({ App: App2, scene: idle, onBack: () => {} });
    App2.listeners.appStateChange({ isActive: false });
    expect(idle.pause).not.toHaveBeenCalled();
  });

  it('reports back as an action for the current state', () => {
    const App = fakeApp();
    const onBack = vi.fn();
    wireLifecycle({ App, scene: fakeScene(), onBack });
    App.listeners.backButton({ canGoBack: false });
    expect(onBack).toHaveBeenCalledWith('pause');
  });

  it('unsubscribe removes both listeners', async () => {
    const App = fakeApp();
    const off = wireLifecycle({ App, scene: fakeScene(), onBack: () => {} });
    await off();
    expect(App.removed.sort()).toEqual(['appStateChange', 'backButton']);
  });

  it('time away is not seen as steps after resume', () => {
    const world = createWorld({ width: 400, height: 700, seed: 1 });
    const scene = new FlightScene({ world, onEvents: () => {} });
    const events = new EventBus();
    scene.kernel = { events };
    scene.onEnter();
    scene.update(1 / 60);
    expect(scene._acc).toBeGreaterThan(0);
    scene.pause();
    scene.resume();
    expect(scene._acc).toBe(0);
    let steps = 0;
    events.on('fixed_update', () => {
      steps += 1;
    });
    scene.update(10);
    expect(scene._acc).toBeLessThanOrEqual(5 / 60 + 1e-9);
    expect(steps).toBe(0);
  });

  it.each(['resume', 'ready', 'exit'])('reports %s to onBack', (action) => {
    const state = {
      resume: ['playing', true],
      ready: ['over', false],
      exit: ['ready', false],
    }[action];
    const App = fakeApp();
    const onBack = vi.fn();
    wireLifecycle({ App, scene: fakeScene(state[0], state[1]), onBack });
    App.listeners.backButton({});
    expect(onBack).toHaveBeenCalledWith(action);
  });

  it('a failed registration does not become an unhandled rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const App = { addListener: vi.fn(() => Promise.reject(new Error('no plugin'))) };
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const off = wireLifecycle({ App, scene: fakeScene(), onBack: () => {} });
    await new Promise((r) => setTimeout(r));
    await off();
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('createHaptics', () => {
  it('maps to impact and notification on native', () => {
    const Haptics = { impact: vi.fn(async () => {}), notification: vi.fn(async () => {}) };
    const h = createHaptics(Haptics, true);
    h.flap();
    h.score();
    h.crash();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
    expect(Haptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
  });

  it('is a no-op off native', () => {
    const Haptics = { impact: vi.fn(), notification: vi.fn() };
    const h = createHaptics(Haptics, false);
    h.flap();
    h.crash();
    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });

  it('never throws on sync throws or rejections', async () => {
    const rejected = Promise.reject(new Error('y'));
    const caught = vi.spyOn(rejected, 'catch');
    const Haptics = {
      impact: vi.fn(() => {
        throw new Error('x');
      }),
      notification: vi.fn(() => rejected),
    };
    const h = createHaptics(Haptics, true);
    expect(() => {
      h.flap();
      h.crash();
    }).not.toThrow();
    await new Promise((r) => setTimeout(r));
    expect(caught).toHaveBeenCalled();
  });
});
