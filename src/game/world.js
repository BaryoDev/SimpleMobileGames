import { RULES, speedFor, gapFor, pipeRange } from './rules.js';
import { seeded } from './random.js';

const MAX_SUBSTEP = 1 / 60;

export function createWorld({ width, height, seed }) {
  return {
    width,
    height,
    phase: 'ready',
    bird: { x: width / 4, y: height / 2, vy: 0 },
    pipes: [],
    score: 0,
    distance: 0,
    rand: seeded(seed),
  };
}

function spawnPipe(world) {
  const gap = gapFor(world.score);
  const { min, max } = pipeRange(world.height, gap);
  world.pipes.push({
    x: world.width,
    top: min + world.rand() * (max - min),
    gap,
    passed: false,
    nearMiss: false,
  });
}

function advance(world, dt, flap, events) {
  const { bird } = world;
  const floorY = world.height - RULES.groundHeight;

  if (flap) {
    bird.vy = RULES.flapVelocity;
    events.flapped = true;
  }
  bird.vy = Math.min(RULES.maxFall, bird.vy + RULES.gravity * dt);
  bird.y += bird.vy * dt;

  if (bird.y - RULES.birdRadius <= 0) {
    bird.y = RULES.birdRadius;
    bird.vy = 0;
  }

  const speed = speedFor(world.score);
  world.distance += speed * dt;
  for (const p of world.pipes) p.x -= speed * dt;
  while (world.pipes.length && world.pipes[0].x + RULES.pipeWidth < 0) {
    world.pipes.shift();
  }
  const last = world.pipes[world.pipes.length - 1];
  if (!last || last.x <= world.width - RULES.pipeSpacing) spawnPipe(world);

  const inset = RULES.hitInset;
  const left = bird.x - RULES.birdRadius + inset;
  const right = bird.x + RULES.birdRadius - inset;
  const boxTop = bird.y - RULES.birdRadius + inset;
  const boxBottom = bird.y + RULES.birdRadius - inset;

  if (boxBottom >= floorY) {
    crash(world, events);
    return;
  }

  for (const p of world.pipes) {
    const overlapsColumn = right > p.x && left < p.x + RULES.pipeWidth;
    if (overlapsColumn) {
      if (boxTop < p.top || boxBottom > p.top + p.gap) {
        crash(world, events);
        return;
      }
      const edge = Math.min(boxTop - p.top, p.top + p.gap - boxBottom);
      if (!p.nearMiss && edge < RULES.nearMissDistance) {
        p.nearMiss = true;
        events.nearMiss = true;
      }
    }
    if (!p.passed && p.x + RULES.pipeWidth < bird.x) {
      p.passed = true;
      world.score += 1;
      events.scored = true;
    }
  }
}

function crash(world, events) {
  world.phase = 'over';
  events.crashed = true;
}

export function step(world, dt, input) {
  const events = { scored: false, nearMiss: false, crashed: false, flapped: false };
  if (world.phase === 'over') return events;
  const flap = Boolean(input && input.flap);
  if (world.phase === 'ready') {
    if (!flap) return events;
    world.phase = 'playing';
  }

  const count = Math.max(1, Math.ceil(dt / MAX_SUBSTEP - 1e-9));
  const h = dt / count;
  for (let i = 0; i < count && world.phase === 'playing'; i++) {
    advance(world, h, flap && i === 0, events);
  }
  return events;
}

export function resize(world, width, height) {
  const ratio = world.bird.y / world.height;
  world.width = width;
  world.height = height;
  world.bird.x = width / 4;
  world.bird.y = ratio * height;
  for (const p of world.pipes) {
    const { min, max } = pipeRange(height, p.gap);
    p.top = Math.min(max, Math.max(min, p.top));
  }
}
