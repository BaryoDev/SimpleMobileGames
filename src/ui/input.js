const FLAP_KEYS = new Set(['Space', 'ArrowUp']);
const UI_SELECTOR = 'button, input, a, [data-ui]';

export function shouldFlap(event, phase) {
  if (phase !== 'ready' && phase !== 'playing') return false;
  if (event.type !== 'pointerdown' && !(event.type === 'keydown' && FLAP_KEYS.has(event.code))) {
    return false;
  }
  return !event.target.closest(UI_SELECTOR);
}
