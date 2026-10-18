const svg = (body, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${
    fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  } aria-hidden="true">${body}</svg>`;

const digits = (text) =>
  svg(`<text x="12" y="16" text-anchor="middle" font-size="9" font-weight="700" font-family="sans-serif">${text}</text><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>`, true);

export const ICONS = {
  first_game: svg('<path d="M3 12l18-8-6 16-3-7-9-1z"/>'),
  level_5: svg('<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
  level_10: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>'),
  streak_3: svg('<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/>'),
  streak_7: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  bf_score_10: digits('10'),
  bf_score_25: digits('25'),
  bf_score_50: digits('50'),
  bf_score_100: digits('100'),
  bf_pipes_100: svg('<rect x="4" y="3" width="6" height="18" rx="1"/><rect x="14" y="3" width="6" height="18" rx="1"/><path d="M4 8h6M14 8h6"/>'),
};
