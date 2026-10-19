import { describe, it, expect } from 'vitest';
import { PHASES, phaseFor, skyAt, colorsOf } from '../../src/game/palette.js';

describe('phaseFor', () => {
  it.each([
    [0, 'morning'],
    [9, 'morning'],
    [10, 'day'],
    [24, 'day'],
    [25, 'sunset'],
    [49, 'sunset'],
    [50, 'night'],
    [1000, 'night'],
    [-1, 'morning'],
    [NaN, 'morning'],
    [Infinity, 'morning'],
  ])('score %s is %s', (score, phase) => {
    expect(phaseFor(score)).toBe(phase);
  });

  it('keeps the floors in ascending order', () => {
    expect(PHASES.map((p) => p.floor)).toEqual([0, 10, 25, 50]);
  });
});

describe('skyAt', () => {
  const channel = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

  it('equals the first palette at 0 and the second at 1', () => {
    expect(skyAt('morning', 'night', 0)).toEqual(colorsOf('morning'));
    expect(skyAt('morning', 'night', 1)).toEqual(colorsOf('night'));
  });

  it('lies between the two palettes at the midpoint', () => {
    const mid = skyAt('day', 'sunset', 0.5);
    const a = colorsOf('day');
    const b = colorsOf('sunset');
    for (const key of ['top', 'mid', 'bottom', 'pipe', 'ground']) {
      for (let i = 0; i < 3; i += 1) {
        const lo = Math.min(channel(a[key], i), channel(b[key], i));
        const hi = Math.max(channel(a[key], i), channel(b[key], i));
        expect(channel(mid[key], i)).toBeGreaterThanOrEqual(lo);
        expect(channel(mid[key], i)).toBeLessThanOrEqual(hi);
      }
    }
    expect(mid.orbY).toBeCloseTo((a.orbY + b.orbY) / 2, 6);
  });

  it('clamps t and writes into the object it is given', () => {
    const out = {};
    expect(skyAt('day', 'night', 5, out)).toBe(out);
    expect(out).toEqual(colorsOf('night'));
    expect(skyAt('day', 'night', -3)).toEqual(colorsOf('day'));
  });
});
