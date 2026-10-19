export const PHASES = [
  {
    name: 'morning',
    floor: 0,
    colors: {
      top: '#9fd0f2', mid: '#fbe3d0', bottom: '#ffc9a3',
      far: '#c4cfe3', hillMid: '#a5c8b5', near: '#7fb88a', tree: '#5f9e6e',
      pipe: '#7ccf4f', pipeLight: '#a8ea7a', pipeDark: '#4fa23a',
      ground: '#e7d3a0', groundTop: '#8ed15a', groundMark: '#d4bc86',
      cloud: '#ffffff', orb: '#fff3c4', glow: '#ffe3a0',
      cloudA: 0.85, star: 0, moon: 0, orbX: 0.27, orbY: 0.7,
    },
  },
  {
    name: 'day',
    floor: 10,
    colors: {
      top: '#3c9bf0', mid: '#6cb7f5', bottom: '#a9dcfb',
      far: '#8fb4dd', hillMid: '#6fb98f', near: '#4fa66a', tree: '#3c8a56',
      pipe: '#5cc43a', pipeLight: '#8ae85f', pipeDark: '#3a9a28',
      ground: '#dccb94', groundTop: '#6cc443', groundMark: '#c9b67c',
      cloud: '#ffffff', orb: '#fff6c0', glow: '#fff0a0',
      cloudA: 0.92, star: 0, moon: 0, orbX: 0.42, orbY: 0.16,
    },
  },
  {
    name: 'sunset',
    floor: 25,
    colors: {
      top: '#f2792c', mid: '#f2799a', bottom: '#8a5cc0',
      far: '#a46aa8', hillMid: '#85509a', near: '#603c80', tree: '#43296a',
      pipe: '#86b23f', pipeLight: '#b6d85e', pipeDark: '#5c8a33',
      ground: '#c9946e', groundTop: '#7a9a3a', groundMark: '#b07f5c',
      cloud: '#ffc2c8', orb: '#ffd9a0', glow: '#ff9a5a',
      cloudA: 0.8, star: 0, moon: 0, orbX: 0.5, orbY: 0.64,
    },
  },
  {
    name: 'night',
    floor: 50,
    colors: {
      top: '#0b1437', mid: '#1b2260', bottom: '#3a2f7a',
      far: '#25306b', hillMid: '#1b2556', near: '#141b44', tree: '#0e1436',
      pipe: '#2d7a52', pipeLight: '#4aa874', pipeDark: '#1b5238',
      ground: '#3a3a5c', groundTop: '#2f6a4a', groundMark: '#2e2e4c',
      cloud: '#8a93c8', orb: '#f3f1dc', glow: '#b8c4ff',
      cloudA: 0, star: 1, moon: 1, orbX: 0.6, orbY: 0.22,
    },
  },
];

const BY_NAME = new Map(PHASES.map((p) => [p.name, p]));

export function phaseFor(score) {
  if (!Number.isFinite(score) || score < 0) return PHASES[0].name;
  let name = PHASES[0].name;
  for (const p of PHASES) if (score >= p.floor) name = p.name;
  return name;
}

export function colorsOf(phase) {
  const found = typeof phase === 'string' ? BY_NAME.get(phase) : phase;
  return (found ?? PHASES[0]).colors;
}

function channel(hex, i) {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

function mix(a, b, t) {
  let out = '#';
  for (let i = 0; i < 3; i += 1) {
    const v = Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}

export function skyAt(fromPhase, toPhase, t, out = {}) {
  const a = colorsOf(fromPhase);
  const b = colorsOf(toPhase);
  const k = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 1;
  for (const key of Object.keys(a)) {
    const from = a[key];
    const to = b[key];
    out[key] = typeof from === 'number' ? from + (to - from) * k : mix(from, to, k);
  }
  return out;
}
