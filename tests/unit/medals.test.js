import { describe, it, expect } from 'vitest';
import { medalFor } from '../../src/ui/medals.js';

describe('medalFor', () => {
  it.each([
    [0, null],
    [9, null],
    [10, 'bronze'],
    [24, 'bronze'],
    [25, 'silver'],
    [49, 'silver'],
    [50, 'gold'],
    [99, 'gold'],
    [100, 'platinum'],
    [NaN, null],
    [-5, null],
  ])('score %s earns %s', (score, medal) => {
    expect(medalFor(score)).toBe(medal);
  });
});
