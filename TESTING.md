# Automated Testing Guide

## Overview
This project includes comprehensive automated tests using Playwright to ensure all games function correctly before deployment.

## Test Coverage

### Games Tested
- ✅ **Bird Flight** - Canvas rendering, gameplay, controls, scoring
- ✅ **Dice Master** - Number picker visibility, dice rolling, UI display
- ✅ **Sky Ace** - Game start, canvas, controls, responsiveness
- ✅ **Block Drop** - Board rendering, controls, scoring, screen fit
- ✅ **Chess Master** - Coin toss, board setup, piece selection, PGN export

### Test Categories
1. **UI Rendering** - Verifies all elements display correctly
2. **Button Functionality** - Tests back buttons, mute buttons, game controls
3. **Game Logic** - Validates core mechanics work as expected
4. **Responsive Design** - Ensures games fit all screen sizes
5. **Error Checking** - Confirms no JavaScript console errors
6. **Sound System** - Mute toggle and localStorage persistence

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests Before Build
```bash
npm run test:build
```

### Full Build with Tests (Recommended)
```bash
npm run build
```
This will:
1. Run all tests
2. Block build if any test fails
3. Sync Capacitor
4. Build Android APK

### Deploy to Device
```bash
npm run deploy
```
This runs the full build (with tests) and deploys to connected device.

## Test Results

**Total Tests:** 40+
- Bird Flight: 5 tests
- Dice Master: 4 tests  
- Sky Ace: 4 tests
- Block Drop: 4 tests
- Chess Master: 5 tests
- Common Features: 15 tests (3 per game)
- Main Menu: 4 tests

## What Tests Check

### Every Game
- ✅ Page loads without errors
- ✅ Canvas/game board renders
- ✅ Back button exists and links correctly
- ✅ Mute button toggles sound
- ✅ No JavaScript console errors
- ✅ Responsive on mobile (375x667)
- ✅ No horizontal scrolling

### Game-Specific
- **Bird Flight**: Start game, score display
- **Dice Master**: Number buttons visible (no white background)
- **Sky Ace**: Start screen, game canvas
- **Block Drop**: Controls, no vertical overflow
- **Chess Master**: 64 squares, move history, PGN export

## Continuous Integration

Tests automatically run before every build. If ANY test fails:
- ❌ Build is blocked
- ❌ Deployment is prevented
- ✅ Error report shows which test failed

This ensures broken code never reaches the device.

## Adding New Tests

Edit `tests/game-tests.spec.js` and follow the existing pattern:

```javascript
test.describe('New Game', () => {
  test('should do something', async ({ page }) => {
    await page.goto(`${BASE_URL}/new_game.html`);
    // Your test code
    await expect(element).toBeVisible();
  });
});
```

## Troubleshooting

### Tests fail locally
1. Ensure all game files are in the root directory
2. Check console for specific error messages
3. Run `npx playwright test --headed` to see browser

### Chromium not installed
```bash
npx playwright install chromium
```

### Update Playwright
```bash
npm update @playwright/test
```

## Files

- `tests/game-tests.spec.js` - All test cases
- `playwright.config.js` - Playwright configuration
- `package.json` - Test scripts

## Benefits

✅ **Catch bugs before deployment**  
✅ **Automated regression testing**  
✅ **Confidence in code quality**  
✅ **Fast feedback loop**  
✅ **No manual testing needed**
