import { test, expect } from '@playwright/test';

const BASE_URL = 'file://' + process.cwd();

test.describe('Bird Flight Game - Dedicated Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/bird_flight.html`);
    });

    test('should load game and render canvas', async ({ page }) => {
        const canvas = await page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should have working back button', async ({ page }) => {
        const backBtn = await page.locator('.back-btn');
        await expect(backBtn).toBeVisible();
        await expect(backBtn).toHaveAttribute('href', 'index.html');

        // Click and verify navigation
        await backBtn.click();
        await expect(page).toHaveURL(`${BASE_URL}/index.html`);
    });

    test('should have mute button that toggles', async ({ page }) => {
        const muteBtn = await page.locator('#muteBtn');
        await expect(muteBtn).toBeVisible();

        const initialText = await muteBtn.textContent();
        await muteBtn.click();
        const newText = await muteBtn.textContent();
        expect(initialText).not.toBe(newText);

        // Verify localStorage persistence
        const isMuted = await page.evaluate(() => localStorage.getItem('gameSoundsMuted'));
        expect(isMuted).toBe('true');
    });

    test('should start game and show score', async ({ page }) => {
        // Start screen should be visible initially
        const startScreen = await page.locator('#start-screen');
        await expect(startScreen).toBeVisible();

        // Enter name and start
        await page.fill('#player-name-input', 'TestPlayer');
        await page.click('#start-btn');

        // Start screen should be hidden
        await expect(startScreen).not.toBeVisible();

        // Score should be visible
        const score = await page.locator('#score');
        await expect(score).toBeVisible();
        await expect(score).toHaveText('0');
    });

    test('should handle game over state', async ({ page }) => {
        // Start game
        await page.click('#start-btn');

        // Simulate collision/game over by executing script
        await page.evaluate(() => {
            // Access game internals if possible, or simulate collision
            // Since we can't easily access scoped variables, we'll wait for gravity to kill the bird
            // But gravity takes time. Let's try to trigger gameOver() directly if it was exposed, 
            // but it's not. 
            // Instead, let's just wait. The bird falls by default.
        });

        // Wait for game over screen (bird hits ground)
        // Bird starts at y=150, ground is at height-100. Gravity is 0.25.
        // It should fall relatively quickly.
        const gameOverScreen = await page.locator('#game-over-screen');
        await expect(gameOverScreen).toBeVisible({ timeout: 10000 });

        // Check final score display
        const finalScore = await page.locator('#final-score');
        await expect(finalScore).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        const canvas = await page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();

        // Check if canvas fills the window
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox.width).toBe(375);
        expect(canvasBox.height).toBe(667);
    });
});
