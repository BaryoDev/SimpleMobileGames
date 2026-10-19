import { RULES } from './rules.js';
import { phaseFor, colorsOf, skyAt } from './palette.js';
import { createScenery } from './scenery.js';

const BLEND_SECONDS = 1.5;
const FLAP_SECONDS = 0.28;
const TAU = Math.PI * 2;
const LIP = 22;
const LIP_OVERHANG = 4;

const CLOUDS = [
  { x: 0.1, y: 0.12, w: 84, s: 9 },
  { x: 0.38, y: 0.5, w: 64, s: 13 },
  { x: 0.58, y: 0.05, w: 100, s: 7 },
  { x: 0.78, y: 0.7, w: 72, s: 15 },
  { x: 0.93, y: 0.3, w: 90, s: 10 },
];

const STARS = Array.from({ length: 46 }, (_, i) => {
  const h = (n) => {
    const s = Math.sin((i + 1) * n) * 43758.5453;
    return s - Math.floor(s);
  };
  return { x: h(12.9898), y: h(78.233), r: 0.7 + h(37.719) * 1.3, p: h(4.1414) * TAU };
});

function prefersReducedMotion() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

const smooth = (t) => t * t * (3 - 2 * t);

export function createRenderer({ reducedMotion } = {}) {
  const scenery = createScenery();
  const scratch = {};
  let reduced = reducedMotion ?? prefersReducedMotion();
  let curIdx = 0;
  let curPhase = 'morning';
  let prevPhase = 'morning';
  let blending = false;
  let blendStart = 0;
  let blendEase = 1;
  let lastWorld = null;
  let lastVy = 0;
  let wingStart = -10;

  if (reducedMotion === undefined && typeof matchMedia === 'function') {
    try {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        reduced = e.matches;
      });
    } catch {
      // older webviews have no change event, the value read at boot stays
    }
  }

  function drawLayer(ctx, key, y, width, offset, dpr) {
    const px = Math.floor(offset * dpr) / dpr;
    const draw = (canvas, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(canvas, -px, y, width, scenery.stripH);
      ctx.drawImage(canvas, width - px, y, width, scenery.stripH);
    };
    if (blending) draw(scenery.set(1 - curIdx)[key], 1);
    draw(scenery.set(curIdx)[key], blending ? blendEase : 1);
    ctx.globalAlpha = 1;
  }

  function drawOrb(ctx, c, width, floorY) {
    const x = c.orbX * width;
    const y = c.orbY * floorY;
    const r = c.moon > 0.5 ? 22 : 26;
    ctx.fillStyle = c.glow;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.35, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.orb;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    if (c.moon > 0.02) {
      ctx.globalAlpha = c.moon * 0.35;
      ctx.fillStyle = '#9aa0c8';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.08, y - r * 0.25);
      ctx.arc(x - r * 0.3, y - r * 0.25, r * 0.22, 0, TAU);
      ctx.moveTo(x + r * 0.65, y + r * 0.2);
      ctx.arc(x + r * 0.35, y + r * 0.2, r * 0.3, 0, TAU);
      ctx.moveTo(x + r * 0.04, y + r * 0.5);
      ctx.arc(x - r * 0.1, y + r * 0.5, r * 0.14, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawStars(ctx, c, width, floorY, time) {
    if (c.star < 0.01) return;
    ctx.fillStyle = '#fff';
    for (const s of STARS) {
      const drift = reduced ? 0 : time * 3;
      const x = (((s.x * width - drift) % width) + width) % width;
      const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(time * 2.2 + s.p);
      ctx.globalAlpha = c.star * twinkle;
      ctx.beginPath();
      ctx.arc(x, s.y * floorY * 0.7, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(ctx, c, width, floorY, time) {
    if (c.cloudA < 0.01) return;
    ctx.fillStyle = c.cloud;
    ctx.globalAlpha = c.cloudA;
    for (const cl of CLOUDS) {
      const span = width + cl.w * 2;
      const drift = reduced ? 0 : time * cl.s;
      const x = (((cl.x * width - drift) % span) + span) % span - cl.w;
      const y = 24 + cl.y * floorY * 0.42;
      const w = cl.w;
      ctx.beginPath();
      ctx.arc(x + w * 0.25, y, w * 0.2, 0, TAU);
      ctx.arc(x + w * 0.48, y - w * 0.1, w * 0.25, 0, TAU);
      ctx.arc(x + w * 0.75, y, w * 0.19, 0, TAU);
      ctx.rect(x + w * 0.25, y, w * 0.5, w * 0.19);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, c, world) {
    const { width, height } = world;
    const top = height - RULES.groundHeight;
    ctx.fillStyle = c.ground;
    ctx.fillRect(0, top, width, RULES.groundHeight);
    ctx.fillStyle = c.groundTop;
    ctx.fillRect(0, top, width, 14);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.22;
    ctx.fillRect(0, top, width, 3);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = c.groundMark;
    ctx.fillRect(0, top + 14, width, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.groundMark;
    const stripe = 36;
    const offset = world.distance % stripe;
    for (let i = -1; i < width / stripe + 1; i += 1) {
      const x = i * stripe - offset;
      ctx.fillRect(x, top + 30, 14, 4);
      ctx.fillRect(x + 18, top + 52, 10, 4);
    }
  }

  function drawPipes(ctx, c, world) {
    const floorY = world.height - RULES.groundHeight;
    const w = RULES.pipeWidth;
    const lw = w + LIP_OVERHANG * 2;
    for (const p of world.pipes) {
      const bottomY = p.top + p.gap;
      const x = p.x;
      const lx = x - LIP_OVERHANG;
      for (let k = 0; k < 2; k += 1) {
        const y0 = k === 0 ? 0 : bottomY + LIP;
        const h = k === 0 ? p.top - LIP : floorY - bottomY - LIP;
        if (h <= 0) continue;
        ctx.fillStyle = c.pipe;
        ctx.fillRect(x + 2, y0, w - 4, h);
        ctx.fillStyle = c.pipeLight;
        ctx.fillRect(x + 6, y0, 7, h);
        ctx.fillStyle = c.pipeDark;
        ctx.fillRect(x + w - 14, y0, 12, h);
      }
      const lips = [p.top - LIP, bottomY];
      for (const ly of lips) {
        roundedRect(ctx, lx, ly, lw, LIP, 7);
        ctx.fillStyle = c.pipe;
        ctx.fill();
        roundedRect(ctx, lx + 4, ly + 3, 8, LIP - 6, 4);
        ctx.fillStyle = c.pipeLight;
        ctx.fill();
        roundedRect(ctx, lx + lw - 15, ly + 3, 11, LIP - 6, 5);
        ctx.fillStyle = c.pipeDark;
        ctx.fill();
      }
    }
  }

  function drawBird(ctx, world, alpha, time, prevY) {
    const { bird } = world;
    const r = RULES.birdRadius;
    const prev = prevY ?? bird.y;
    let y = prev + (bird.y - prev) * Math.min(1, Math.max(0, alpha));
    if (world.phase === 'ready') y = bird.y + (reduced ? 0 : Math.sin(time * 6) * 5);
    const rotation =
      world.phase === 'ready'
        ? 0
        : Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy / 60) * 0.1));

    const age = time - wingStart;
    let wing = reduced ? 0 : Math.sin(time * 4) * 0.12;
    if (age >= 0 && age < FLAP_SECONDS) {
      const p = age / FLAP_SECONDS;
      wing = -0.95 * Math.cos(p * Math.PI * 1.5) * (1 - p * 0.35);
    }

    ctx.save();
    ctx.translate(bird.x, y);
    ctx.rotate(rotation);

    ctx.fillStyle = '#f59e1b';
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, -2);
    ctx.lineTo(-r * 1.9, -5);
    ctx.lineTo(-r * 1.8, 3);
    ctx.lineTo(-r * 1.05, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f2b21f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 1.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(-0.5, -1.2, r * 1.22, r * 1.0, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff1b5';
    ctx.beginPath();
    ctx.ellipse(2, r * 0.42, r * 0.95, r * 0.55, 0.1, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#e65f0c';
    ctx.beginPath();
    ctx.moveTo(r * 0.75, 3);
    ctx.lineTo(r * 1.55, 5.5);
    ctx.lineTo(r * 0.8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -0.5);
    ctx.lineTo(r * 1.65, 3.4);
    ctx.lineTo(r * 0.75, 5.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5.5, -4.5, 5.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2230';
    ctx.beginPath();
    ctx.arc(6.9, -4.3, 2.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7.6, -5.4, 1, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(-4, 2);
    ctx.rotate(wing);
    ctx.fillStyle = '#f59e1b';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 9, 5.4, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffc94d';
    ctx.beginPath();
    ctx.ellipse(-3, 1, 6, 3, -0.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function advancePhase(world, time, dpr) {
    const resized = scenery.ensure(world.width, world.height, dpr);
    const target = phaseFor(world.score);
    if (resized || world !== lastWorld) {
      lastWorld = world;
      curPhase = target;
      blending = false;
      blendEase = 1;
      lastVy = world.bird.vy;
      wingStart = -10;
      scenery.paint(curIdx, colorsOf(curPhase));
    } else if (target !== curPhase) {
      prevPhase = curPhase;
      curPhase = target;
      if (reduced) {
        blending = false;
        scenery.paint(curIdx, colorsOf(curPhase));
      } else {
        curIdx = 1 - curIdx;
        scenery.paint(curIdx, colorsOf(curPhase));
        blending = true;
        blendStart = time;
      }
    }
    if (blending) {
      const t = (time - blendStart) / BLEND_SECONDS;
      if (t >= 1) {
        blending = false;
        blendEase = 1;
      } else {
        blendEase = smooth(Math.max(0, t));
      }
    }
    return blending ? skyAt(prevPhase, curPhase, blendEase, scratch) : colorsOf(curPhase);
  }

  return {
    draw(ctx, world, alpha, time, prevY, dpr = 1) {
      const c = advancePhase(world, time, dpr);
      if (world.bird.vy < lastVy - 60) wingStart = time;
      lastVy = world.bird.vy;

      const { width, height } = world;
      const floorY = height - RULES.groundHeight;
      const top = floorY - scenery.stripH;
      const speedOffset = (k) => (reduced ? 0 : (world.distance * k) % width);

      if (blending) ctx.drawImage(scenery.set(1 - curIdx).sky, 0, 0, width, floorY);
      ctx.globalAlpha = blending ? blendEase : 1;
      ctx.drawImage(scenery.set(curIdx).sky, 0, 0, width, floorY);
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.bottom;
      ctx.fillRect(0, floorY, width, height - floorY);

      drawOrb(ctx, c, width, floorY);
      drawStars(ctx, c, width, floorY, time);
      drawClouds(ctx, c, width, floorY, time);
      drawLayer(ctx, 'far', top, width, speedOffset(0.1), dpr);
      drawLayer(ctx, 'mid', top, width, speedOffset(0.3), dpr);
      drawLayer(ctx, 'near', top, width, speedOffset(0.6), dpr);
      drawGround(ctx, c, world);
      drawPipes(ctx, c, world);
      drawBird(ctx, world, alpha, time, prevY);
    },
  };
}

const shared = createRenderer();

export function drawWorld(ctx, world, alpha, time, prevY, dpr = 1) {
  shared.draw(ctx, world, alpha, time, prevY, dpr);
}
