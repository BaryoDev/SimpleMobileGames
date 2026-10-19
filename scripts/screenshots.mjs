import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'store/screenshots');
const PORT = 4181;
const URL = `http://localhost:${PORT}`;

const frames = (page, n = 3) =>
  page.evaluate(
    (count) => new Promise((resolve) => {
      let left = count;
      const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    }),
    n,
  );

async function settle(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible' });
  await page.waitForFunction(
    (sel) => {
      const node = document.querySelector(sel);
      return node && getComputedStyle(node).opacity === '1' && node.getAnimations({ subtree: true }).length === 0;
    },
    selector,
  );
  await frames(page, 4);
}

mkdirSync(OUT, { recursive: true });
execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'ignore' });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });

try {
  for (let i = 0; i < 60; i += 1) {
    if (await fetch(URL).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${URL}/?test=1`);
  await page.locator('#player-name').fill('Skye');
  await settle(page, '#player-name');
  await page.screenshot({ path: join(OUT, '1-start.png') });

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('#game').click({ position: { x: 100, y: 300 } });
  await page.evaluate(() => {
    const w = window.__bf.world;
    w.score = 26;
    w.bird.y = 300;
    w.bird.vy = 0;
    w.pipes = [{ x: w.bird.x - 60, top: 225, gap: 150, passed: false, nearMiss: false }];
  });
  await page.waitForFunction(() => document.querySelector('#hud-score')?.textContent === '27');
  await page.evaluate(() => {
    const w = window.__bf.world;
    w.bird.y = 280;
    w.bird.vy = -120;
    w.pipes = [
      { x: w.bird.x + 90, top: 200, gap: 170, passed: false, nearMiss: false },
      { x: w.bird.x + 300, top: 260, gap: 170, passed: false, nearMiss: false },
    ];
  });
  await frames(page, 2);
  await page.screenshot({ path: join(OUT, '2-flying.png') });

  await page.evaluate(() => {
    window.__bf.world.score = 30;
    window.__bf.world.bird.y = window.__bf.world.height;
  });
  await settle(page, '#screen-over');
  await page.screenshot({ path: join(OUT, '3-over.png') });
  await browser.close();
} finally {
  server.kill();
}
