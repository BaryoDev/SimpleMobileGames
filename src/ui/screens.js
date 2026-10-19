import { phaseFor } from '../game/palette.js';
import { medalFor, medalElement } from './medals.js';

const OVER_GUARD_MS = 400;
const SVG_NS = 'http://www.w3.org/2000/svg';

const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'title', 'text',
]);
const SVG_ATTRIBUTES = new Set([
  'xmlns', 'viewbox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'clip-rule', 'opacity',
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform',
  'offset', 'stop-color', 'stop-opacity', 'id', 'gradientunits', 'gradienttransform',
  'aria-hidden', 'text-anchor', 'textlength', 'lengthadjust', 'font-size', 'font-weight',
  'font-family',
]);

function allowedValue(value) {
  const v = value.trim().toLowerCase();
  if (v.includes('javascript:')) return false;
  return !v.includes('url(') || /^url\(#[\w-]+\)$/.test(v);
}

function clean(node) {
  for (const child of [...node.children]) {
    if (!SVG_ELEMENTS.has(child.localName.toLowerCase())) {
      child.remove();
      continue;
    }
    for (const attr of [...child.attributes]) {
      if (!SVG_ATTRIBUTES.has(attr.name.toLowerCase()) || !allowedValue(attr.value)) {
        child.removeAttribute(attr.name);
      }
    }
    clean(child);
  }
}

export function svgElement(markup) {
  const doc = new DOMParser().parseFromString(String(markup ?? ''), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.querySelector('parsererror')) return null;
  for (const attr of [...root.attributes]) {
    if (!SVG_ATTRIBUTES.has(attr.name.toLowerCase()) || !allowedValue(attr.value)) {
      root.removeAttribute(attr.name);
    }
  }
  clean(root);
  return document.importNode(root, true);
}

export const FLAME_ICON = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500 0 2 1 3 2 3 0-4-1-6 1-9.500z"/></svg>`;

const MUTE_ON = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.500 6.500a8 8 0 0 1 0 11"/></svg>`;
const MUTE_OFF = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6"/><path d="M22 9l-5 6"/></svg>`;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

export function createScreens(root, handlers) {
  const nameInput = el('input', {
    id: 'player-name',
    type: 'text',
    maxlength: '16',
    placeholder: 'Player',
    autocomplete: 'off',
    autocapitalize: 'words',
    'aria-label': 'Your name',
  });
  const bestReady = el('span', { id: 'best', text: '0' });
  const startBtn = el('button', { type: 'submit', class: 'btn', text: 'Start' });
  const startForm = el('form', { class: 'box', 'data-ui': '' },
    el('h1', { text: 'Bird Flight' }),
    el('label', { for: 'player-name', text: 'Your name' }),
    nameInput,
    el('p', { class: 'best-line' }, 'Best ', bestReady),
    startBtn,
    el('p', { class: 'hint', text: 'Tap, click or press space to flap' }),
  );
  const readyScreen = el('div', { id: 'screen-ready', class: 'screen' }, startForm);

  const hud = el('div', { id: 'hud-score', class: 'hud', text: '0', 'aria-live': 'off' });
  const flapHint = el('div', { class: 'flap-hint', text: 'Tap to flap' });

  const finalScore = el('span', { id: 'final-score', text: '0' });
  const bestOver = el('span', { id: 'best-over', text: '0' });
  const newBest = el('p', { class: 'new-best', text: 'New best' });
  const medalSlot = el('div', { class: 'medal', role: 'img' });
  const medalName = el('p', { class: 'medal-name' });
  const boardBody = el('tbody');
  const board = el('table', { id: 'board', class: 'board' },
    el('thead', {}, el('tr', {}, el('th', { text: '#' }), el('th', { text: 'Name' }), el('th', { text: 'Score' }))),
    boardBody,
  );
  const restartBtn = el('button', { type: 'button', class: 'btn', text: 'Restart' });
  const overBox = el('div', { class: 'box', 'data-ui': '' },
    el('h1', { text: 'Game over' }),
    medalSlot,
    medalName,
    el('p', { class: 'score-line' }, 'Score ', finalScore),
    el('p', { class: 'best-line' }, 'Best ', bestOver),
    newBest,
    restartBtn,
    el('h2', { text: 'Rankings' }),
    board,
  );
  const overScreen = el('div', { id: 'screen-over', class: 'screen' }, overBox);

  const resumeBtn = el('button', { type: 'button', class: 'btn', text: 'Resume' });
  const pausedScreen = el('div', { id: 'screen-paused', class: 'screen' },
    el('div', { class: 'box', 'data-ui': '' }, el('h1', { text: 'Paused' }), resumeBtn),
  );

  const muteBtn = el('button', { type: 'button', id: 'mute', class: 'icon-btn', 'data-ui': '' });
  const toasts = el('div', { class: 'toasts', 'aria-live': 'polite', role: 'status' });

  root.append(hud, flapHint, readyScreen, overScreen, pausedScreen, muteBtn, toasts);

  const show = (node, on) => {
    node.hidden = !on;
  };
  show(hud, false);
  show(flapHint, false);
  show(overScreen, false);
  show(pausedScreen, false);
  show(medalSlot, false);
  show(medalName, false);
  document.documentElement.dataset.phase = 'morning';

  let overShownAt = 0;

  function setMuted(muted) {
    muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    muteBtn.setAttribute('aria-pressed', String(muted));
    const icon = svgElement(muted ? MUTE_OFF : MUTE_ON);
    muteBtn.replaceChildren(...(icon ? [icon] : []));
  }

  startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    nameInput.blur();
    startBtn.blur();
    handlers.onStart(nameInput.value);
  });
  restartBtn.addEventListener('click', () => {
    if (performance.now() - overShownAt < OVER_GUARD_MS) return;
    restartBtn.blur();
    handlers.onRestart();
  });
  resumeBtn.addEventListener('click', () => handlers.onResume?.());
  muteBtn.addEventListener('click', () => {
    setMuted(handlers.onToggleMute());
  });

  function renderBoard(entries, run) {
    const rows = entries.map((entry, i) => {
      const tr = el('tr', {}, el('td', { text: String(i + 1) }), el('td', { text: entry.name }), el('td', { text: String(entry.score) }));
      if (run && entry.ts === run.ts && entry.name === run.name) tr.className = 'highlight-run';
      return tr;
    });
    if (rows.length === 0) rows.push(el('tr', {}, el('td', { colspan: '3', text: 'No scores yet' })));
    boardBody.replaceChildren(...rows);
  }

  return {
    setMuted,
    setName(name) {
      nameInput.value = name ?? '';
    },
    showReady(best) {
      document.documentElement.dataset.phase = 'morning';
      bestReady.textContent = String(best);
      show(readyScreen, true);
      show(overScreen, false);
      show(hud, false);
      show(flapHint, false);
      hud.textContent = '0';
    },
    showPlaying() {
      show(readyScreen, false);
      show(overScreen, false);
      show(hud, true);
      show(flapHint, true);
      hud.textContent = '0';
    },
    showScore(n) {
      hud.textContent = String(n);
      document.documentElement.dataset.phase = phaseFor(n);
      if (n > 0) show(flapHint, false);
    },
    hideFlapHint() {
      show(flapHint, false);
    },
    showOver(score, best, entries, run) {
      finalScore.textContent = String(score);
      bestOver.textContent = String(best);
      show(newBest, score > 0 && score >= best);
      const medal = medalFor(score);
      const art = medal ? medalElement(medal) : null;
      medalSlot.replaceChildren(...(art ? [art] : []));
      medalSlot.dataset.medal = medal ?? '';
      const label = medal ? `${medal[0].toUpperCase()}${medal.slice(1)} medal` : '';
      medalSlot.setAttribute('aria-label', label);
      medalName.textContent = label;
      show(medalSlot, Boolean(art));
      show(medalName, Boolean(art));
      renderBoard(entries, run);
      show(hud, false);
      show(flapHint, false);
      show(overScreen, true);
      overShownAt = performance.now();
    },
    overGuardClear() {
      return performance.now() - overShownAt >= OVER_GUARD_MS;
    },
    showPaused() {
      show(pausedScreen, true);
    },
    hidePaused() {
      show(pausedScreen, false);
    },
    showAchievement(achievement) {
      const icon = el('span', { class: 'toast-icon', 'aria-hidden': 'true' });
      const svg = svgElement(achievement.icon);
      if (svg) icon.append(svg);
      const toast = el('div', { class: 'toast' }, icon,
        el('div', { class: 'toast-text' },
          el('strong', { text: String(achievement.name ?? '') }),
          el('span', { text: String(achievement.description ?? '') }),
        ),
        el('span', { class: 'toast-xp', text: `+${Number(achievement.xp) || 0} XP` }),
      );
      toasts.append(toast);
      setTimeout(() => toast.remove(), 4000);
    },
  };
}
