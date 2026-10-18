import { describe, it, expect } from 'vitest';
import { addScore, sanitize, LEADERBOARD_KEY } from '../../src/leaderboard.js';

describe('leaderboard', () => {
  it('uses the leaderboard key', () => {
    expect(LEADERBOARD_KEY).toBe('leaderboard');
  });

  it('keeps the best score per name, case-insensitive', () => {
    let { entries } = addScore([], 'Ana', 10, 1);
    ({ entries } = addScore(entries, 'ana', 7, 2));
    expect(entries).toHaveLength(1);
    expect(entries[0].score).toBe(10);
    ({ entries } = addScore(entries, 'ANA', 15, 3));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ score: 15, ts: 3 });
  });

  it('blank name becomes Anonymous', () => {
    const { entries, run } = addScore([], '   ', 4, 1);
    expect(run.name).toBe('Anonymous');
    expect(entries[0].name).toBe('Anonymous');
  });

  it('top five only', () => {
    let entries = [];
    for (let i = 1; i <= 7; i++) ({ entries } = addScore(entries, `p${i}`, i, i));
    expect(entries.map((e) => e.score)).toEqual([7, 6, 5, 4, 3]);
  });

  it('long names are cut at 16', () => {
    const { run } = addScore([], 'x'.repeat(40), 1, 1);
    expect(run.name).toHaveLength(16);
  });

  it('sanitize drops bad rows and non-arrays', () => {
    expect(sanitize(null)).toEqual([]);
    expect(sanitize('x')).toEqual([]);
    expect(
      sanitize([
        { name: 'Ana', score: 12, ts: 1 },
        { name: 5 },
        { name: 'Ben', score: 'x', ts: 1 },
        { name: 'Cy', score: -1, ts: 1 },
        { name: 'Di', score: Infinity, ts: 1 },
        null,
      ]),
    ).toEqual([{ name: 'Ana', score: 12, ts: 1 }]);
  });
});
