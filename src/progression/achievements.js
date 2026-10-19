import { ICONS } from './icons.js';

const scoreAtLeast = (n) => (player, gameName, result) => Boolean(result) && result.score >= n;

export const ACHIEVEMENTS = {
  first_game: {
    name: 'First flight',
    description: 'Finish your first flight',
    icon: ICONS.first_game,
    xp: 10,
    check: (player) => player.totalGamesPlayed >= 1,
  },
  level_5: {
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: ICONS.level_5,
    xp: 100,
    check: (player) => player.level >= 5,
  },
  level_10: {
    name: 'Expert Player',
    description: 'Reach level 10',
    icon: ICONS.level_10,
    xp: 250,
    check: (player) => player.level >= 10,
  },
  streak_3: {
    name: 'Three days running',
    description: 'Play 3 days in a row',
    icon: ICONS.streak_3,
    xp: 30,
    check: (player) => player.streak.current >= 3,
  },
  streak_7: {
    name: 'Seven days running',
    description: 'Play 7 days in a row',
    icon: ICONS.streak_7,
    xp: 70,
    check: (player) => player.streak.current >= 7,
  },
  bf_score_10: {
    name: 'Ten pipes',
    description: 'Score 10 in one flight',
    icon: ICONS.bf_score_10,
    xp: 20,
    check: scoreAtLeast(10),
  },
  bf_score_25: {
    name: 'Twenty-five pipes',
    description: 'Score 25 in one flight',
    icon: ICONS.bf_score_25,
    xp: 40,
    check: scoreAtLeast(25),
  },
  bf_score_50: {
    name: 'Fifty pipes',
    description: 'Score 50 in one flight',
    icon: ICONS.bf_score_50,
    xp: 80,
    check: scoreAtLeast(50),
  },
  bf_score_100: {
    name: 'Century flight',
    description: 'Score 100 in one flight',
    icon: ICONS.bf_score_100,
    xp: 150,
    check: scoreAtLeast(100),
  },
  bf_pipes_100: {
    name: 'Hundred pipes',
    description: 'Pass 100 pipes across all flights',
    icon: ICONS.bf_pipes_100,
    xp: 50,
    check: (player) => (player.stats?.birdFlight?.totalScore ?? 0) >= 100,
  },
};
