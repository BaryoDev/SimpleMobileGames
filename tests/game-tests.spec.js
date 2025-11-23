import { test, expect } from '@playwright/test';

const BASE_URL = 'file://' + process.cwd();

// Bird Flight Tests
test.describe('Bird Flight Game', () => {
    test('should load game and render canvas', async ({ page }) => {
        await page.goto(`${BASE_URL}/bird_flight.html`);
        const canvas = await page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should have working back button', async ({ page }) => {
        await page.goto(`${BASE_URL}/bird_flight.html`);
        const backBtn = await page.locator('.back-btn');
        await expect(backBtn).toBeVisible();
        await expect(backBtn).toHaveAttribute('href', 'index.html');
    });

    test('should have mute button that toggles', async ({ page }) => {
        await page.goto(`${BASE_URL}/bird_flight.html`);
        const muteBtn = await page.locator('#muteBtn');
        await expect(muteBtn).toBeVisible();

        const initialText = await muteBtn.textContent();
        await muteBtn.click();
        const newText = await muteBtn.textContent();
        expect(initialText).not.toBe(newText);
    });

    test('should start game and show score', async ({ page }) => {
        await page.goto(`${BASE_URL}/bird_flight.html`);
        await page.click('#start-btn');
        await page.waitForTimeout(500);
        const score = await page.locator('#score');
        await expect(score).toBeVisible();
    });

    test('should have no console errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error));
        await page.goto(`${BASE_URL}/bird_flight.html`);
        await page.waitForTimeout(1000);
        expect(errors).toHaveLength(0);
    });
});

// Dice Master Tests
test.describe('Dice Master Game', () => {
    test('should load and render dice container', async ({ page }) => {
        await page.goto(`${BASE_URL}/dice_game.html`);
        const container = await page.locator('.game-container');
        await expect(container).toBeVisible();
    });

    test('should have visible number picker buttons', async ({ page }) => {
        await page.goto(`${BASE_URL}/dice_game.html`);
        const numberBtns = await page.locator('.btn-number').all();
        expect(numberBtns.length).toBeGreaterThan(0);

        for (const btn of numberBtns) {
            await expect(btn).toBeVisible();
        }
    });

    test('should have working roll button', async ({ page }) => {
        await page.goto(`${BASE_URL}/dice_game.html`);
        await page.click('.btn-number >> nth=0');
        const rollBtn = await page.locator('.btn-roll');
        await expect(rollBtn).toBeVisible();
        await rollBtn.click();
        await page.waitForTimeout(500);
    });

    test('should not have white background issues', async ({ page }) => {
        await page.goto(`${BASE_URL}/dice_game.html`);
        const body = await page.locator('body');
        const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgb(255, 255, 255)');
    });
});

// Sky Ace Tests
test.describe('Sky Ace Game', () => {
    test('should load and show start screen', async ({ page }) => {
        await page.goto(`${BASE_URL}/sky_ace.html`);
        const startScreen = await page.locator('#startScreen');
        await expect(startScreen).toBeVisible();
    });

    test('should render game canvas', async ({ page }) => {
        await page.goto(`${BASE_URL}/sky_ace.html`);
        const canvas = await page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should have mute button', async ({ page }) => {
        await page.goto(`${BASE_URL}/sky_ace.html`);
        const muteBtn = await page.locator('#muteBtn');
        await expect(muteBtn).toBeVisible();
    });

    test('should start game on button click', async ({ page }) => {
        await page.goto(`${BASE_URL}/sky_ace.html`);
        await page.click('#startBtn');
        await page.waitForTimeout(500);
        const uiLayer = await page.locator('#ui-layer');
        const isHidden = await uiLayer.evaluate(el => el.classList.contains('hidden'));
        expect(isHidden).toBe(false);
    });
});

// Block Drop Tests
test.describe('Block Drop Game', () => {
    test('should load and render game board', async ({ page }) => {
        await page.goto(`${BASE_URL}/block_drop.html`);
        const canvas = await page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
    });

    test('should have control buttons', async ({ page }) => {
        await page.goto(`${BASE_URL}/block_drop.html`);
        const controls = await page.locator('.control-btn').all();
        expect(controls.length).toBeGreaterThan(0);
    });

    test('should fit screen without scrolling', async ({ page }) => {
        await page.goto(`${BASE_URL}/block_drop.html`);
        const container = await page.locator('.container');
        const hasOverflow = await container.evaluate(el => {
            return el.scrollHeight > el.clientHeight;
        });
        expect(hasOverflow).toBe(false);
    });

    test('should show score and level', async ({ page }) => {
        await page.goto(`${BASE_URL}/block_drop.html`);
        const score = await page.locator('.score-value');
        const level = await page.locator('.level-value');
        await expect(score).toBeVisible();
        await expect(level).toBeVisible();
    });
});

// Chess Master Tests
test.describe('Chess Master Game', () => {
    test('should load and show coin toss modal', async ({ page }) => {
        await page.goto(`${BASE_URL}/chess_game.html`);
        const coinModal = await page.locator('#coinModal');
        await expect(coinModal).toBeVisible();
    });

    test('should render chess board', async ({ page }) => {
        await page.goto(`${BASE_URL}/chess_game.html`);
        const board = await page.locator('#chessBoard');
        await expect(board).toBeVisible();
    });

    test('should have 64 squares', async ({ page }) => {
        await page.goto(`${BASE_URL}/chess_game.html`);
        await page.waitForTimeout(500);
        const squares = await page.locator('.square').all();
        expect(squares.length).toBe(64);
    });

    test('should have export PGN button', async ({ page }) => {
        await page.goto(`${BASE_URL}/chess_game.html`);
        const exportBtn = await page.locator('button:has-text("Export PGN")');
        await expect(exportBtn).toBeVisible();
    });

    test('should have move history display', async ({ page }) => {
        await page.goto(`${BASE_URL}/chess_game.html`);
        const moveHistory = await page.locator('#moveHistory');
        await expect(moveHistory).toBeAttached(); // Element exists in DOM even if covered by modal
    });
});

// Common Tests (All Games)
test.describe('Common Features', () => {
    const games = [
        { name: 'Bird Flight', file: 'bird_flight.html' },
        { name: 'Dice Master', file: 'dice_game.html' },
        { name: 'Sky Ace', file: 'sky_ace.html' },
        { name: 'Block Drop', file: 'block_drop.html' },
        { name: 'Chess Master', file: 'chess_game.html' },
    ];

    for (const game of games) {
        test(`${game.name} - should have back button`, async ({ page }) => {
            await page.goto(`${BASE_URL}/${game.file}`);
            const backBtn = await page.locator('.back-btn');
            await expect(backBtn).toBeVisible();
        });

        test(`${game.name} - should have no JavaScript errors`, async ({ page }) => {
            const errors = [];
            page.on('pageerror', error => errors.push(error));
            await page.goto(`${BASE_URL}/${game.file}`);
            await page.waitForTimeout(2000);
            expect(errors).toHaveLength(0);
        });

        test(`${game.name} - should be responsive`, async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
            await page.goto(`${BASE_URL}/${game.file}`);
            await page.waitForTimeout(500);

            // Check no horizontal overflow
            const hasOverflow = await page.evaluate(() => {
                return document.body.scrollWidth > window.innerWidth;
            });
            expect(hasOverflow).toBe(false);
        });
    }
});

// Main Menu Tests
test.describe('Main Menu', () => {
    test('should load index page', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const header = await page.locator('h1:has-text("Game Hub")');
        await expect(header).toBeVisible();
    });

    test('should have all 5 game cards', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const gameCards = await page.locator('.game-card').all();
        expect(gameCards.length).toBe(5);
    });

    test('should have Ko-fi button', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);
        const kofiLink = await page.locator('a[href*="ko-fi.com"]');
        await expect(kofiLink).toBeVisible();
    });

    test('game cards should link to correct files', async ({ page }) => {
        await page.goto(`${BASE_URL}/index.html`);

        const expectedGames = [
            { href: 'bird_flight.html', name: 'Bird Flight' },
            { href: 'dice_game.html', name: 'Dice Master' },
            { href: 'sky_ace.html', name: 'Sky Ace' },
            { href: 'block_drop.html', name: 'Block Drop' },
            { href: 'chess_game.html', name: 'Chess Master' },
        ];

        for (const game of expectedGames) {
            const card = await page.locator(`a[href="${game.href}"]`);
            await expect(card).toBeVisible();
        }
    });
});
