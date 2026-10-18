import { RULES } from './rules.js';

const COLORS = {
  sky: '#70c5ce',
  ground: '#ded895',
  grass: '#73bf2e',
  cloud: 'rgba(255, 255, 255, 0.6)',
  birdBody: '#f4ce42',
  birdWing: '#f7e396',
  birdBeak: '#f76808',
  birdEye: '#fff',
  pipeBody: '#73bf2e',
  pipeBorder: '#000',
};

const CLOUDS = [
  { x: 0.1, y: 0.12, w: 80, s: 18 },
  { x: 0.35, y: 0.28, w: 64, s: 26 },
  { x: 0.55, y: 0.08, w: 96, s: 22 },
  { x: 0.75, y: 0.35, w: 70, s: 30 },
  { x: 0.92, y: 0.2, w: 88, s: 20 },
];

const STRIP = 20;
const CAP = 20;

function drawClouds(ctx, world, time) {
  const { width, height } = world;
  ctx.fillStyle = COLORS.cloud;
  for (const c of CLOUDS) {
    const span = width + c.w * 2;
    const x = (((c.x * width - time * c.s) % span) + span) % span - c.w;
    const y = c.y * (height / 2);
    ctx.beginPath();
    ctx.arc(x, y, c.w / 2, 0, Math.PI * 2);
    ctx.arc(x + c.w * 0.4, y - c.w * 0.2, c.w * 0.4, 0, Math.PI * 2);
    ctx.arc(x + c.w * 0.8, y, c.w / 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround(ctx, world) {
  const { width, height } = world;
  const top = height - RULES.groundHeight;
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, top, width, RULES.groundHeight);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, top, width, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  const offset = world.distance % STRIP;
  for (let i = -1; i < width / STRIP + 1; i += 1) {
    ctx.fillRect(i * STRIP - offset, top + 5, 2, 10);
  }
}

function drawPipes(ctx, world) {
  const floorY = world.height - RULES.groundHeight;
  const w = RULES.pipeWidth;
  ctx.fillStyle = COLORS.pipeBody;
  ctx.strokeStyle = COLORS.pipeBorder;
  ctx.lineWidth = 2;
  for (const p of world.pipes) {
    const bottomY = p.top + p.gap;
    ctx.fillRect(p.x, 0, w, p.top);
    ctx.strokeRect(p.x, 0, w, p.top);
    ctx.fillRect(p.x - 2, p.top - CAP, w + 4, CAP);
    ctx.strokeRect(p.x - 2, p.top - CAP, w + 4, CAP);
    ctx.fillRect(p.x, bottomY, w, floorY - bottomY);
    ctx.strokeRect(p.x, bottomY, w, floorY - bottomY);
    ctx.fillRect(p.x - 2, bottomY, w + 4, CAP);
    ctx.strokeRect(p.x - 2, bottomY, w + 4, CAP);
  }
}

function drawBird(ctx, world, alpha, time, prevY) {
  const { bird } = world;
  const r = RULES.birdRadius;
  const prev = prevY ?? bird.y;
  let y = prev + (bird.y - prev) * Math.min(1, Math.max(0, alpha));
  if (world.phase === 'ready') y = bird.y + Math.sin(time * 6) * 5;
  const rotation =
    world.phase === 'ready'
      ? 0
      : Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy / 60) * 0.1));

  ctx.save();
  ctx.translate(bird.x, y);
  ctx.rotate(rotation);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';

  ctx.fillStyle = COLORS.birdBody;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.birdEye;
  ctx.beginPath();
  ctx.arc(6, -6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(8, -6, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.birdBeak;
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(16, 6);
  ctx.lineTo(8, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORS.birdWing;
  ctx.beginPath();
  ctx.ellipse(-6, 2, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, world, alpha, time, prevY) {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, world.width, world.height);
  drawClouds(ctx, world, time);
  drawGround(ctx, world);
  drawPipes(ctx, world);
  drawBird(ctx, world, alpha, time, prevY);
}
