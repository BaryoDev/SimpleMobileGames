import { describe, it, expect } from 'vitest';
import { backAction } from '../../src/platform/back.js';

describe('backAction', () => {
  it('pauses a run in progress', () => {
    expect(backAction({ phase: 'playing', paused: false })).toBe('pause');
  });
  it('resumes when paused', () => {
    expect(backAction({ phase: 'playing', paused: true })).toBe('resume');
  });
  it('exits from the start screen', () => {
    expect(backAction({ phase: 'ready', paused: false })).toBe('exit');
  });
  it('returns to the start screen from game over', () => {
    expect(backAction({ phase: 'over', paused: false })).toBe('ready');
  });
});
