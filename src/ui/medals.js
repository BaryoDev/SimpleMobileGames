const SVG_NS = 'http://www.w3.org/2000/svg';

export const MEDAL_FLOORS = [
  ['platinum', 100],
  ['gold', 50],
  ['silver', 25],
  ['bronze', 10],
];

const LOOK = {
  bronze: { rim: '#a8602a', face: '#d98c4a', shine: '#f2b883', ribbon: '#c0392b' },
  silver: { rim: '#8b95a3', face: '#c8d0da', shine: '#eef2f6', ribbon: '#3b82c4' },
  gold: { rim: '#c98a0a', face: '#ffc933', shine: '#fff0a0', ribbon: '#d9382b' },
  platinum: { rim: '#6c7fa8', face: '#b9c9ea', shine: '#f4f8ff', ribbon: '#7a4fd0' },
};

export function medalFor(score) {
  if (!Number.isFinite(score)) return null;
  for (const [name, floor] of MEDAL_FLOORS) if (score >= floor) return name;
  return null;
}

function node(tag, attrs, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.append(n);
  return n;
}

export function medalElement(kind) {
  const look = LOOK[kind];
  if (!look) return null;
  const svg = node('svg', { viewBox: '0 0 64 72', 'aria-hidden': 'true', class: 'medal-svg' });
  node('path', { d: 'M18 2h12l6 22H22z', fill: look.ribbon }, svg);
  node('path', { d: 'M46 2H34l-6 22h14z', fill: look.ribbon, 'fill-opacity': 0.8 }, svg);
  node('circle', { cx: 32, cy: 44, r: 24, fill: look.rim }, svg);
  node('circle', { cx: 32, cy: 44, r: 19, fill: look.face }, svg);
  node('path', { d: 'M32 30l4.200 8.600 9.400 1.300-6.800 6.600 1.600 9.400-8.400-4.400-8.400 4.400 1.600-9.400-6.800-6.600 9.400-1.300z', fill: look.shine }, svg);
  node('path', { d: 'M17 38a16 16 0 0 1 10-12', fill: 'none', stroke: look.shine, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-opacity': 0.7 }, svg);
  return svg;
}
