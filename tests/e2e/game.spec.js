import { test, expect } from '@playwright/test';

async function start(page, name = 'Tester') {
  await page.goto('/?test=1');
  await page.locator('#player-name').fill(name);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
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
  await page.waitForTimeout(600);
  await page.mouse.click(10, 700);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
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
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
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

test('the over screen still shows when saving fails', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (String(key).includes('leaderboard') || String(key).includes('dopamine_player')) {
        throw new Error('disk full');
      }
      return original.call(this, key, value);
    };
  });
  await start(page);
  await crash(page);
  await expect(page.locator('#board')).toContainText('Tester');
  expect(errors).toEqual([]);
});
