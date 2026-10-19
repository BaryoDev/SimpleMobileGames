import { test, expect } from '@playwright/test';

async function start(page, name = 'Tester') {
  await page.goto('/?test=1');
  await page.locator('#player-name').fill(name);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
}

async function offBox(page) {
  const box = await page.locator('#game').boundingBox();
  return { x: 6, y: box.height - 60 };
}

async function restart(page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible({ timeout: 300 });
  }).toPass();
}

async function frames(page, n = 3) {
  await page.evaluate(
    (count) => new Promise((resolve) => {
      let left = count;
      const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    }),
    n,
  );
}

async function crash(page) {
  const canvas = page.locator('#game');
  for (let i = 0; i < 3; i += 1) await canvas.click({ position: { x: 100, y: 300 } });
  await expect(page.locator('#screen-over')).toBeVisible({ timeout: 15000 });
}

test('start, flap and crash', async ({ page }) => {
  await start(page);
  await crash(page);
  await expect(page.locator('#final-score')).toHaveText(/^\d+$/);
  await expect(page.locator('#board')).toContainText('Tester');
});

test('scores a point', async ({ page }) => {
  await start(page);
  await page.locator('#game').click({ position: { x: 100, y: 300 } });
  await page.evaluate(() => {
    const w = window.__bf.world;
    w.bird.y = 300;
    w.bird.vy = 0;
    w.pipes = [{ x: w.bird.x - 60, top: 225, gap: 150, passed: false, nearMiss: false }];
  });
  await expect(page.locator('#hud-score')).toHaveText('1');
});

test('a tap on the over screen does not restart or flap', async ({ page }) => {
  await start(page);
  await crash(page);
  const spot = await offBox(page);
  await page.mouse.click(spot.x, spot.y);
  await page.keyboard.press('Space');
  await frames(page);
  await expect(page.locator('#screen-over')).toBeVisible();
  expect(await page.evaluate(() => window.__bf.world.phase)).toBe('over');
});

test('high score and mute survive a reload', async ({ page }) => {
  await start(page);
  await page.locator('#game').click({ position: { x: 100, y: 300 } });
  await page.evaluate(() => {
    const w = window.__bf.world;
    w.bird.y = 300;
    w.bird.vy = 0;
    w.pipes = [{ x: w.bird.x - 60, top: 225, gap: 150, passed: false, nearMiss: false }];
  });
  await expect(page.locator('#hud-score')).toHaveText('1');
  await expect(page.locator('#screen-over')).toBeVisible({ timeout: 15000 });
  await restart(page);
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('#best')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await expect(page.locator('#player-name')).toHaveValue('Tester');
});

test('no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await start(page);
  await crash(page);
  await restart(page);
  expect(errors).toEqual([]);
});

test('fits a 320x480 screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeInViewport();
});

test('the game-over screen fits a landscape phone', async ({ page }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await start(page);
  await crash(page);
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeInViewport();
});

test('Restart is ignored right after the over screen appears', async ({ page }) => {
  await start(page);
  await crash(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).dispatchEvent('click');
  await frames(page);
  await expect(page.locator('#screen-over')).toBeVisible();
  await restart(page);
  await expect(page.locator('#screen-over')).toBeHidden();
});

test('boots to the start screen when storage reads fail', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw new Error('storage unavailable');
    };
  });
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
});

test('the over screen still shows when saving fails', async ({ page }) => {
  const errors = [];
  const warnings = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.addInitScript(() => {
    window.__threw = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('leaderboard') || String(key).includes('dopamine_player')) {
        window.__threw += 1;
        throw new Error('disk full');
      }
      return original.call(this, key, value);
    };
  });
  await start(page);
  await crash(page);
  await expect(page.locator('#board')).toContainText('Tester');
  await expect.poll(() => page.evaluate(() => window.__threw)).toBeGreaterThan(0);
  await expect.poll(() => warnings.some((w) => w.includes('could not'))).toBe(true);
  expect(errors).toEqual([]);
});

test('the start card says Bird Flight and the name placeholder is Player', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.getByRole('heading', { name: 'Bird Flight', exact: true })).toBeVisible();
  await expect(page.locator('#player-name')).toHaveAttribute('placeholder', 'Player');
});

test('the name is prefilled from the newest v1 leaderboard entry', async ({ page }) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('seeded')) return;
    window.localStorage.setItem('seeded', '1');
    window.localStorage.setItem(
      'birdFlightLeaderboard_v1',
      JSON.stringify([
        { name: 'Older', score: 9, ts: 1000 },
        { name: 'Newest', score: 3, ts: 2000 },
      ]),
    );
  });
  await page.goto('/?test=1');
  await expect(page.locator('#player-name')).toHaveValue('Newest');
});

test('the sky phase follows the score and game over shows a medal', async ({ page }) => {
  await start(page);
  await page.locator('#game').click({ position: { x: 100, y: 300 } });
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'morning');
  await page.evaluate(() => {
    const w = window.__bf.world;
    w.bird.y = 300;
    w.bird.vy = 0;
    w.score = 9;
    w.pipes = [{ x: w.bird.x - 60, top: 225, gap: 150, passed: false, nearMiss: false }];
  });
  await expect(page.locator('#hud-score')).toHaveText('10');
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'day');
  await expect(page.locator('#screen-over')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.medal')).toHaveAttribute('data-medal', 'bronze');
  await expect(page.locator('.new-best')).toBeVisible();
});

test('no medal below 10', async ({ page }) => {
  await start(page);
  await crash(page);
  await expect(page.locator('.medal')).toBeHidden();
});
