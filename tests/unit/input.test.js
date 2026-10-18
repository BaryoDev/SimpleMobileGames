import { describe, it, expect } from 'vitest';
import { shouldFlap } from '../../src/ui/input.js';

const plain = { closest: () => null };
const inButton = { closest: (sel) => (sel.includes('button') ? {} : null) };

describe('shouldFlap', () => {
  it('space and tap flap while playing', () => {
    expect(shouldFlap({ type: 'pointerdown', target: plain }, 'playing')).toBe(true);
    expect(shouldFlap({ type: 'keydown', code: 'Space', target: plain }, 'playing')).toBe(true);
    expect(shouldFlap({ type: 'keydown', code: 'ArrowUp', target: plain }, 'ready')).toBe(true);
  });

  it('a tap on a button does not flap', () => {
    expect(shouldFlap({ type: 'pointerdown', target: inButton }, 'playing')).toBe(false);
    expect(shouldFlap({ type: 'keydown', code: 'Space', target: inButton }, 'ready')).toBe(false);
  });

  it('nothing flaps on the game-over screen', () => {
    expect(shouldFlap({ type: 'pointerdown', target: plain }, 'over')).toBe(false);
    expect(shouldFlap({ type: 'keydown', code: 'Space', target: plain }, 'over')).toBe(false);
  });

  it('other keys do nothing', () => {
    expect(shouldFlap({ type: 'keydown', code: 'KeyA', target: plain }, 'playing')).toBe(false);
    expect(shouldFlap({ type: 'keydown', code: 'Enter', target: plain }, 'playing')).toBe(false);
    expect(shouldFlap({ type: 'keyup', code: 'Space', target: plain }, 'playing')).toBe(false);
  });
});
