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
    scene.kernel = { events: new EventBus() };
    scene.onEnter();
    scene.pause();
    scene.update(10);
    scene.resume();
    expect(scene._acc).toBe(0);
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
    const Haptics = {
      impact: vi.fn(() => {
        throw new Error('x');
      }),
      notification: vi.fn(() => Promise.reject(new Error('y'))),
    };
    const h = createHaptics(Haptics, true);
    expect(() => {
      h.flap();
      h.crash();
    }).not.toThrow();
    await Promise.resolve();
  });
});
