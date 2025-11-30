const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Set viewport to 1080x1920 (Portrait)
    await page.setViewportSize({ width: 1080, height: 1920 });

    const baseUrl = 'file://' + path.join(process.cwd(), 'bird_flight.html');
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl);

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    // Screenshot 1: Title Screen
    console.log('Taking Screenshot 1: Title Screen');
    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_1_title.png') });

    // Screenshot 2: Gameplay
    console.log('Taking Screenshot 2: Gameplay');

    // Start the game
    await page.fill('#player-name-input', 'Player 1');
    await page.click('#start-btn');

    // Wait for a moment to let the bird fall/fly a bit
    await page.waitForTimeout(1000); // 1 second into gameplay

    // Simulate a jump to make it look active
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_2_gameplay.png') });

    // Screenshot 3: Game Over (optional, but good for completeness)
    console.log('Taking Screenshot 3: Game Over');
    // Wait for game over (bird hits ground)
    // Bird falls...
    await page.waitForTimeout(4000);

    // Check if game over screen is visible
    const gameOverVisible = await page.isVisible('#game-over-screen');
    if (gameOverVisible) {
        await page.screenshot({ path: path.join(screenshotsDir, 'screenshot_3_gameover.png') });
    } else {
        console.log('Game over screen not visible yet, skipping screenshot 3');
    }

    await browser.close();
    console.log('Screenshots generated in ./screenshots');
})();
