import { describe, it, expect } from 'vitest';
import { EventBus } from 'dopaminejs';
import { FlightScene } from '../../src/game/scene.js';
import { createWorld } from '../../src/game/world.js';

const FIXED = 1 / 60;

function setup() {
  const world = createWorld({ width: 400, height: 700, seed: 1 });
  const seen = [];
  const scene = new FlightScene({ world, onEvents: (e) => seen.push(e) });
  const events = new EventBus();
  scene.kernel = { events };
  scene.onEnter();
  let acc = 0;
  const frame = (dt) => {
    scene.update(dt);
    acc = Math.min(acc + dt, FIXED * 5);
    while (acc >= FIXED) {
      events.emit('fixed_update', { dt: FIXED });
      acc -= FIXED;
    }
  };
  return { world, scene, frame, seen, kernelRemainder: () => acc / FIXED };
}

describe('FlightScene', () => {
  it('alpha tracks the kernel remainder on a 120 Hz display', () => {
    const { frame, scene, kernelRemainder } = setup();
    for (let i = 0; i < 6; i += 1) {
      frame(1 / 120);
      expect(scene.alpha).toBeCloseTo(kernelRemainder(), 6);
      expect(scene.alpha).toBeLessThan(1);
    }
  });

  it('paused means no steps, and a flap queued while paused is dropped on resume', () => {
    const { world, scene, frame, seen } = setup();
    scene.pause();
    scene.flap();
    frame(FIXED * 2);
    expect(seen.length).toBe(0);
    scene.resume();
    frame(FIXED);
    expect(world.phase).toBe('ready');
  });

  it('keeps previous y on the scene, not the world, and resets it on setWorld', () => {
    const { world, scene, frame } = setup();
    scene.flap();
    frame(FIXED);
    expect('prevY' in world.bird).toBe(false);
    const next = createWorld({ width: 400, height: 700, seed: 2 });
    next.bird.y = 123;
    scene.setWorld(next);
    expect(scene._prevY).toBe(123);
  });
});
