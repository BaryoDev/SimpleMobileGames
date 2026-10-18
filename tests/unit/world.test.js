import { describe, it, expect } from 'vitest';
import { RULES, speedFor, gapFor, pipeRange } from '../../src/game/rules.js';
import { createWorld, step, resize } from '../../src/game/world.js';

const DT = 1 / 60;
const idle = { flap: false };

function playing(opts = {}) {
  const w = createWorld({ width: 400, height: 600, seed: 1, ...opts });
  w.phase = 'playing';
  return w;
}

describe('world', () => {
  it('gravity pulls the bird down', () => {
    const w = playing({ height: 1200 });
    const y0 = w.bird.y;
    for (let i = 0; i < 60; i++) {
      w.pipes.length = 0;
      step(w, DT, idle);
    }
    expect(w.phase).toBe('playing');
    expect(w.bird.y - y0).toBeGreaterThan(400 * 0.95);
    expect(w.bird.y - y0).toBeLessThan(400 * 1.05);
  });

  it('a flap sets upward velocity', () => {
    const w = playing();
    step(w, DT, { flap: true });
    expect(w.bird.vy).toBeCloseTo(-276 + 900 / 60, 5);
  });

  it('a flap in ready starts the game, none does nothing', () => {
    const w = createWorld({ width: 400, height: 600, seed: 1 });
    step(w, DT, idle);
    expect(w.phase).toBe('ready');
    const e = step(w, DT, { flap: true });
    expect(w.phase).toBe('playing');
    expect(e.flapped).toBe(true);
  });

  it('stepping is deterministic', () => {
    const run = () => {
      const w = createWorld({ width: 400, height: 600, seed: 3 });
      for (let i = 0; i < 600; i++) step(w, DT, { flap: i % 25 === 0 });
      return { y: w.bird.y, score: w.score, pipes: w.pipes };
    };
    expect(run()).toEqual(run());
  });

  it('scores once per pipe', () => {
    const w = playing();
    w.bird.vy = 0;
    w.pipes = [{ x: w.bird.x - RULES.pipeWidth - 1, top: 200, gap: 300, passed: false, nearMiss: false }];
    w.bird.y = 350;
    let scored = 0;
    for (let i = 0; i < 3; i++) {
      w.bird.y = 350;
      w.bird.vy = 0;
      if (step(w, DT, idle).scored) scored++;
    }
    expect(scored).toBe(1);
    expect(w.score).toBe(1);
  });

  it('crashes on a pipe, the floor and stays crashed', () => {
    const w = playing();
    w.pipes = [{ x: w.bird.x - 10, top: 50, gap: 100, passed: false, nearMiss: false }];
    w.bird.y = 400;
    expect(step(w, DT, idle).crashed).toBe(true);
    expect(w.phase).toBe('over');
    expect(step(w, DT, { flap: true })).toEqual({
      scored: false, nearMiss: false, crashed: false, flapped: false,
    });

    const f = playing();
    f.bird.y = f.height - RULES.groundHeight;
    expect(step(f, DT, idle).crashed).toBe(true);
    expect(f.phase).toBe('over');
  });

  it('ceiling stops the bird without crashing', () => {
    const w = playing();
    w.pipes.length = 0;
    w.bird.y = 0;
    w.bird.vy = -100;
    step(w, DT, idle);
    expect(w.bird.y).toBe(RULES.birdRadius);
    expect(w.bird.vy).toBe(0);
    expect(w.phase).toBe('playing');
  });

  it('one long step cannot tunnel through the floor', () => {
    const w = playing();
    w.bird.y = w.height - RULES.groundHeight - 20;
    w.bird.vy = RULES.maxFall;
    step(w, 5 / 60, idle);
    expect(w.phase).toBe('over');
  });

  it('one long step cannot tunnel through a pipe', () => {
    const w = playing();
    w.bird.y = 300;
    w.pipes = [{ x: w.bird.x + 20, top: 50, gap: 100, passed: false, nearMiss: false }];
    step(w, 5 / 60, idle);
    expect(w.phase).toBe('over');
  });

  it('near miss fires once per pipe', () => {
    const w = playing();
    const gapTop = 200;
    w.pipes = [{ x: w.bird.x - 10, top: gapTop, gap: 150, passed: false, nearMiss: false }];
    let fired = 0;
    for (let i = 0; i < 20; i++) {
      w.bird.y = gapTop + 6 + RULES.birdRadius - RULES.hitInset + 10;
      w.bird.vy = 0;
      if (step(w, DT, idle).nearMiss) fired++;
    }
    expect(w.phase).toBe('playing');
    expect(fired).toBe(1);
  });

  it('no near miss in the middle of the gap', () => {
    const w = playing();
    w.pipes = [{ x: w.bird.x - 10, top: 200, gap: 150, passed: false, nearMiss: false }];
    w.bird.y = 275;
    w.bird.vy = 0;
    expect(step(w, DT, idle).nearMiss).toBe(false);
  });

  it('pipe range never inverts', () => {
    const r = pipeRange(300, 150);
    expect(r.max).toBeGreaterThanOrEqual(r.min);
    const w = playing({ width: 320, height: 480 });
    for (let i = 0; i < 600; i++) {
      w.bird.y = 200;
      w.bird.vy = 0;
      w.phase = 'playing';
      step(w, DT, idle);
    }
    const range = pipeRange(480, gapFor(0));
    expect(w.pipes.length).toBeGreaterThan(0);
    for (const p of w.pipes) {
      expect(p.top).toBeGreaterThanOrEqual(range.min);
      expect(p.top).toBeLessThanOrEqual(range.max);
    }
  });

  it('difficulty', () => {
    expect(speedFor(0)).toBe(150);
    expect(speedFor(20)).toBe(230);
    expect(speedFor(100)).toBe(230);
    expect(gapFor(0)).toBe(150);
    expect(gapFor(40)).toBe(120);
    expect(gapFor(80)).toBe(120);
  });

  it('same seed, same pipes', () => {
    const tops = (seed) => {
      const w = playing({ seed });
      const seen = [];
      for (let i = 0; i < 600; i++) {
        w.bird.y = 250;
        w.bird.vy = 0;
        w.phase = 'playing';
        step(w, DT, idle);
        for (const p of w.pipes) if (!seen.includes(p.top)) seen.push(p.top);
      }
      return seen;
    };
    expect(tops(7)).toEqual(tops(7));
    expect(tops(7).length).toBeGreaterThan(2);
  });

  it('resize keeps relative height and clamps pipes', () => {
    const w = playing();
    w.pipes = [{ x: 300, top: 400, gap: 150, passed: false, nearMiss: false }];
    resize(w, 320, 480);
    expect(w.bird.y).toBeCloseTo(240);
    const r = pipeRange(480, 150);
    expect(w.pipes[0].top).toBeLessThanOrEqual(r.max);
  });
});
