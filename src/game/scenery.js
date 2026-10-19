import { RULES } from './rules.js';

const TAU = Math.PI * 2;

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const far = (x, w) => 0.3 + 0.32 * (1 - Math.abs(Math.sin((Math.PI * 2 * x) / w + 0.5))) + 0.22 * (1 - Math.abs(Math.sin((Math.PI * 5 * x) / w + 1.3)));
const mid = (x, w) => 0.34 + 0.16 * Math.sin((TAU * 2 * x) / w + 1) + 0.09 * Math.sin((TAU * 5 * x) / w + 2);
const near = (x, w) => 0.24 + 0.12 * Math.sin((TAU * 3 * x) / w) + 0.06 * Math.sin((TAU * 7 * x) / w + 1);

function fillProfile(g, w, h, profile, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) g.lineTo(x, h * (1 - profile(Math.min(x, w), w)));
  g.lineTo(w, h);
  g.closePath();
  g.fill();
}

function paintTrees(g, w, h, colors) {
  const count = Math.max(3, Math.round(w / 95));
  for (let i = 0; i < count; i += 1) {
    const x = Math.min(w - 18, Math.max(18, ((i + 0.5) / count) * w + (hash(i) - 0.5) * 30));
    const base = h * (1 - near(x, w)) + 6;
    const r = 10 + hash(i + 40) * 7;
    g.fillStyle = colors.tree;
    g.fillRect(x - 1.5, base - r * 0.8, 3, r * 0.9);
    g.beginPath();
    g.arc(x, base - r * 1.5, r, 0, TAU);
    g.fill();
  }
}

export function createScenery() {
  let width = 0;
  let height = 0;
  let dpr = 1;
  let sets = [null, null];
  let stripH = 0;

  function alloc() {
    const floorY = height - RULES.groundHeight;
    stripH = Math.max(60, floorY * 0.55);
    sets = [0, 1].map(() => ({
      sky: makeCanvas(width * dpr, floorY * dpr),
      far: makeCanvas(width * dpr, stripH * dpr),
      mid: makeCanvas(width * dpr, stripH * dpr),
      near: makeCanvas(width * dpr, stripH * dpr),
    }));
  }

  return {
    get stripH() {
      return stripH;
    },
    ensure(w, h, ratio) {
      if (w === width && h === height && ratio === dpr && sets[0]) return false;
      width = w;
      height = h;
      dpr = ratio;
      alloc();
      return true;
    },
    paint(index, colors) {
      const set = sets[index];
      const floorY = height - RULES.groundHeight;

      const sky = set.sky.getContext('2d');
      sky.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grad = sky.createLinearGradient(0, 0, 0, floorY);
      grad.addColorStop(0, colors.top);
      grad.addColorStop(0.55, colors.mid);
      grad.addColorStop(1, colors.bottom);
      sky.fillStyle = grad;
      sky.fillRect(0, 0, width, floorY);

      const layers = [['far', far, colors.far], ['mid', mid, colors.hillMid], ['near', near, colors.near]];
      for (const [key, profile, color] of layers) {
        const g = set[key].getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, width, stripH);
        fillProfile(g, width, stripH, profile, color);
        if (key === 'near') paintTrees(g, width, stripH, colors);
      }
    },
    set(index) {
      return sets[index];
    },
  };
}
