# Bird Flight Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Bird Flight alone, rebuilt on dopaminejs 2.4.0 and Capacitor 8, as version code 3 on the Play closed track, with a volunteer testers page on baryo.dev.

**Architecture:** The game world is plain data stepped by a pure `step()` at a fixed 1/60 s, driven by the dopaminejs kernel's `fixed_update` event, and drawn by a dopaminejs `Scene`. Progression goes through `RewardSystem` with storage on Capacitor Preferences. Everything native sits behind `src/platform/` with a browser fallback, so Vitest and Playwright run without a device.

**Tech Stack:** Vite 8.3.4, Vitest 5.0.5, Playwright 1.64.1, dopaminejs 2.4.0, Capacitor 8.5.3 (preferences 8.0.1, haptics 8.0.2, app 8.1.2, status-bar 8.0.4, splash-screen 8.0.2), Android Gradle with the existing upload keystore, Android Publisher API v3, Next.js 15 (baryoweb).

**Spec:** `docs/superpowers/specs/2026-10-18-bird-flight-rebuild-design.md`

## Global Constraints

- Repo `~/repos/SimpleMobileGames`, work on branch `bird-flight-v2` off `main`.
- Package name `com.baryodev.birdflight`. Keystore `android/app/my-release-key.keystore` and `android/keystore.properties` are never moved, printed, logged or committed.
- `versionCode 3`, `versionName "2.0.0"`.
- `compileSdkVersion 36`, `targetSdkVersion 36`, `minSdkVersion 24` (Capacitor 8 floor).
- Exact dependency versions in `package.json`, no `^` or `~`.
- `capacitor.config.json` gets no `server` block. The WebView origin stays `https://localhost`.
- Only permission added beyond the current manifest: `android.permission.VIBRATE`. No `INTERNET` use by the game code, no analytics.
- UI text, store text and the testers page: plain words, no em dashes, no emoji. The mute control uses an SVG icon with an `aria-label`, not the old emoji.
- Play API calls use `gcloud auth application-default print-access-token` and header `x-goog-user-project: baryodev-play`.
- dopaminejs is used as published. A bug found in it is reported to Arnel and fixed in `~/repos/dopaminejs`, not patched here.
- Commits: short imperative subject, no trailers.

## Review Focus

1. **A long frame (app resumed, tab switched, GC pause):** the bird must not fall through the floor or skip a pipe. The kernel clamps its accumulator at 5 steps; `step()` must also handle the bird crossing the floor inside one step. Test in Task 2.
2. **Corrupt or foreign saved data** (`simplemobilegames_player` holding `"null"`, a number, or broken JSON): the game boots with a fresh player and keeps any valid leaderboard. Test in Task 3.
3. **Tap during the game-over screen or on a button:** must not flap or restart by accident. Test in Task 5.
4. **Very short or very wide screens** (landscape tablet, 320x480): the pipe gap must fit, so the pipe range is never empty. Test in Task 2.
5. **Back button and background during a run:** the run pauses and the timer does not count the time away as one huge step. Test in Task 6.

---

### Task 1: Strip the hub and scaffold the build

**Files:**
- Delete: `block_drop.html`, `chess_game.html`, `dice_game.html`, `sky_ace.html`, `bird_flight.html`, `index.html` (root), `js/`, `css/`, `tests/game-tests.spec.js`, `tests/bird-flight.spec.js`, `www/playwright.config.js`, `KOFI_SETUP.md`
- Create: `index.html` (Vite entry), `src/main.js` (placeholder that renders a canvas), `vite.config.js`, `vitest.config.js`
- Modify: `package.json`, `playwright.config.js`, `.gitignore`, `README.md`, `PRIVACY_POLICY.md`

- [ ] **Step 1:** `git switch -c bird-flight-v2`.
- [ ] **Step 2:** Delete the files listed above. `www/` is build output from now on (already gitignored).
- [ ] **Step 3:** Rewrite `package.json`: name `bird-flight`, version `2.0.0`, `"type": "module"`. Dependencies pinned to the Tech Stack versions plus `dopaminejs@2.4.0` and `@capacitor/android@8.5.3`, `@capacitor/core@8.5.3`, `@capacitor/cli@8.5.3`. Scripts:
  - `dev`: `vite`
  - `build`: `vite build` (outDir `www`, `emptyOutDir: true`, `base: './'`)
  - `test`: `vitest run`
  - `e2e`: `playwright test`
  - `sync`: `npm run build && cap sync android`
  - `bundle`: `npm run sync && cd android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew bundleRelease`
  - `apk`: same with `assembleDebug`
- [ ] **Step 4:** `playwright.config.js`: `webServer` runs `npx vite preview --port 4173 --strictPort` after `npm run build`, `baseURL` `http://localhost:4173`, one project with the Pixel 7 device profile, `testDir: 'tests/e2e'`.
- [ ] **Step 5:** README: what the app is, the scripts above, how a release goes out (Task 8). PRIVACY_POLICY.md: rename Game Hub to Bird Flight, contact `baryodev@gmail.com`, date 2026-10-18, otherwise the same claims.
- [ ] **Step 6:** Run `npm install && npm run build`. Expected: `www/index.html` exists and references a hashed JS file.
- [ ] **Step 7:** Commit: "keep only Bird Flight and build it with Vite".

### Task 2: Game rules and world

**Files:**
- Create: `src/game/rules.js`, `src/game/world.js`, `src/game/random.js`
- Test: `tests/unit/world.test.js`

**Interfaces:**
- Produces, `rules.js`:
  - `export const RULES = { gravity: 900, flapVelocity: -276, maxFall: 600, birdRadius: 12, hitInset: 4, groundHeight: 100, pipeWidth: 52, pipeSpacing: 300, pipeMargin: 50, nearMissDistance: 30 }` (pixels and seconds; the old per-frame values times 60 and 3600)
  - `export function speedFor(score: number): number` returns `150 + 4 * score`, capped at `230`
  - `export function gapFor(score: number): number` returns `150` at score 0, falling linearly to `120` at score 40, flat after
  - `export function pipeRange(height: number, gap: number): { min: number, max: number }` with `min = pipeMargin`, `max = height - groundHeight - gap - pipeMargin`, and when `max < min` returns `{ min, max: min }`
- Produces, `random.js`: `export function seeded(seed: number): () => number` (mulberry32, returns values in [0, 1))
- Produces, `world.js`:
  - `export function createWorld({ width, height, seed }): World` where `World = { width, height, phase: 'ready' | 'playing' | 'over', bird: { x, y, vy }, pipes: Array<{ x, top, gap, passed, nearMiss }>, score, distance, rand }`. Bird starts at `x = width / 4`, `y = height / 2`.
  - `export function step(world: World, dt: number, input: { flap: boolean }): StepEvents` where `StepEvents = { scored: boolean, nearMiss: boolean, crashed: boolean, flapped: boolean }`. Mutates `world`. A flap in `ready` moves to `playing`. In `over` it does nothing.
  - `export function resize(world: World, width: number, height: number): void` keeps the bird's relative height and clamps pipes.

- [ ] **Step 1: Write the failing tests** in `tests/unit/world.test.js`:
  - `gravity pulls the bird down`: after 1 s of `step(w, 1/60, {flap:false})` in `playing`, `w.bird.y` grew by about `0.5 * 900` capped by `maxFall` (assert within 5%).
  - `a flap sets upward velocity`: after one step with `flap: true`, `w.bird.vy` is close to `-276 + 900/60`.
  - `stepping is deterministic`: two worlds with the same seed and the same flap sequence over 600 steps of 1/60 end with identical `bird.y`, `score` and pipes. Frame-rate independence comes from the kernel's fixed step; the world is only ever stepped at 1/60.
  - `scores once per pipe`: a pipe placed so the bird passes its right edge yields `scored: true` once and `score === 1`, then `false` on later steps.
  - `crashes on a pipe, the floor and stays crashed`: bird inside a pipe column outside the gap gives `crashed: true` and `phase === 'over'`; a bird at `height - groundHeight` crashes; further steps return all false.
  - `ceiling stops the bird without crashing`: bird at y 0 moving up ends at `birdRadius` with `vy === 0`, phase still `playing`.
  - `one long step cannot tunnel through the floor`: `step(w, 5/60, ...)` from just above the floor crashes rather than ending below the floor with phase `playing`.
  - `near miss fires once per pipe` when the bird passes within 30 px of the gap edge.
  - `pipe range never inverts`: `pipeRange(300, 150)` returns `max >= min`; a 320x480 world spawns pipes whose `top` is inside the range.
  - `difficulty`: `speedFor(0) === 150`, `speedFor(20) === 230`, `speedFor(100) === 230`, `gapFor(0) === 150`, `gapFor(40) === 120`, `gapFor(80) === 120`.
  - `same seed, same pipes`: two worlds with seed 7 produce identical pipe `top` values over 600 steps.
- [ ] **Step 2:** `npx vitest run tests/unit/world.test.js`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement the three files. Collision uses the old inset box: bird box is the circle's bounding box shrunk by `hitInset` on each side. Pipes spawn when the last pipe's x is `pipeSpacing` from the right edge (or none exist), `top` drawn from `pipeRange` with `world.rand`. Pipes move at `speedFor(score)`; a pipe off the left edge is removed.
- [ ] **Step 4:** `npx vitest run tests/unit/world.test.js`. Expected: PASS.
- [ ] **Step 5:** Commit: "move the bird and pipes into a pure fixed-step world".

### Task 3: Storage and migration

**Files:**
- Create: `src/platform/storage.js`, `src/migrate.js`, `src/leaderboard.js`
- Test: `tests/unit/migrate.test.js`, `tests/unit/leaderboard.test.js`

**Interfaces:**
- Produces, `storage.js`: `export function createStorage(): AsyncStorageLike` returning an adapter over `@capacitor/preferences` (`get/set/remove` mapped to `getItem/setItem/removeItem`). On the web, `Preferences` falls back to localStorage under its own prefix, so no extra branch.
- Produces, `leaderboard.js`:
  - `export const LEADERBOARD_KEY = 'leaderboard'`
  - `export function addScore(entries: Entry[], name: string, score: number, now: number): { entries: Entry[], run: Entry }` where `Entry = { name, score, ts }`. Same rules as the old `saveScore`: name trimmed, blank becomes `Anonymous`, case-insensitive match keeps the best score, sorted descending, top 5. Name capped at 16 characters.
  - `export function sanitize(value: unknown): Entry[]` drops anything that is not `{ name: string, score: finite number >= 0, ts: number }`.
- Produces, `migrate.js`: `export async function migrateV1({ legacy: StorageLike, store: AsyncStorageLike }): Promise<{ migrated: boolean }>`.
  - Runs only when `store.getItem('migrated_v1')` is null. Sets it to `'1'` at the end, even when there was nothing to move.
  - `legacy.getItem('simplemobilegames_player')`: if it parses to an object, write it unchanged to `store` key `dopamine_player` (only if that key is empty). `RewardSystem._migrate` sanitizes it on `init()`.
  - `legacy.getItem('birdFlightLeaderboard_v1')`: `sanitize` it and write as JSON to `store` key `leaderboard`.
  - `legacy.getItem('gameSoundsMuted') === 'true'`: write `localStorage` key `dopamine_muted` to `'true'` (the key SoundManager reads; confirm the name in `node_modules/dopaminejs/src/dopamine/audio/` and use that).
  - Never throws. Parse failures skip that key.

- [ ] **Step 1: Write the failing tests** with `createMemoryStorage()` from dopaminejs for `legacy` and a small async Map store:
  - `moves the v1 player`: legacy player `{ xp: 340, level: 3, stats: { birdFlight: { highScore: 27 } } }` ends up in `dopamine_player`, and a `RewardSystem` over a `DataService` on that store `init()`s with `level === 3` and `stats.birdFlight.highScore === 27`.
  - `moves the leaderboard and drops bad rows`: `[{name:'Ana',score:12,ts:1},{name:5},{name:'Ben',score:'x'}]` becomes one entry.
  - `runs once`: a second call with different legacy data changes nothing and returns `migrated: false`.
  - `does not overwrite a v2 player` already in the store.
  - `survives garbage`: legacy values `'null'`, `'42'`, `'{bad'` for each key: no throw, `migrated_v1` set, store has no `dopamine_player`.
  - `carries the mute flag`.
  - Leaderboard: `keeps the best score per name, case-insensitive`, `blank name becomes Anonymous`, `top five only`, `long names are cut at 16`.
- [ ] **Step 2:** Run both test files. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: "carry v1 progress and the leaderboard into Preferences".

### Task 4: Progression

**Files:**
- Create: `src/progression/achievements.js`, `src/progression/rewards.js`
- Test: `tests/unit/progression.test.js`

**Interfaces:**
- Produces, `achievements.js`: `export const ACHIEVEMENTS: Record<string, AchievementDefinition>` with ids and checks:
  - `bf_first_flight` "First flight", any finished run
  - `bf_score_10`, `bf_score_25`, `bf_score_50`, `bf_score_100`, `result.score >= n`
  - `bf_streak_3`, `bf_streak_7`, `player.streak.current >= n`
  - `bf_pipes_100` "Hundred pipes", `player.stats.birdFlight.totalScore >= 100`
  - XP: 10, 20, 40, 80, 150, 30, 70, 50 in that order. Icons are inline SVG strings from `src/progression/icons.js`, no emoji.
- Produces, `rewards.js`: `export async function createRewards(store: AsyncStorageLike): Promise<RewardSystem>` building `new RewardSystem(new DataService({ storage: store }), { achievements: ACHIEVEMENTS })` and awaiting `init()`. `export const GAME = 'birdFlight'`.

- [ ] **Step 1: Write the failing tests:**
  - `a score of 26 unlocks first flight, 10 and 25 but not 50`, via `recordGame(GAME, { score: 26 })`, checked with `getUnlockedAchievements()` ids.
  - `high score is tracked`: two runs of 8 and 15 leave `player.stats.birdFlight.highScore === 15` and the `new_high_score` event fired twice.
  - `hundred pipes accumulates across runs`: four runs of 25.
  - `every achievement has a name, an svg icon and numeric xp`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. If `recordGame` does not keep `totalScore` for the game, compute it in a `stats` update before `recordGame` and say so in a comment.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: "define Bird Flight achievements on dopaminejs".

### Task 5: Scene, screens and boot

**Files:**
- Create: `src/game/scene.js`, `src/game/draw.js`, `src/ui/screens.js`, `src/ui/input.js`, `src/ui/styles.css`, `src/main.js` (replace placeholder), `index.html`
- Test: `tests/unit/input.test.js`, `tests/e2e/game.spec.js`

**Interfaces:**
- Consumes: `createWorld`, `step`, `resize` (Task 2), `createStorage`, `migrateV1`, `addScore`, `sanitize`, `LEADERBOARD_KEY` (Task 3), `createRewards`, `GAME` (Task 4).
- Produces, `scene.js`: `export class FlightScene extends Scene` with `constructor({ world, onEvents: (e: StepEvents) => void })`, `flap(): void`, `pause(): void`, `resume(): void`, `get paused(): boolean`. It listens to the kernel's `fixed_update` and calls `step(world, dt, { flap })` once per fixed step, consuming a queued flap. It keeps its own accumulator from `tick` to compute `alpha` for drawing the bird between its previous and current y. Paused means no steps.
- Produces, `draw.js`: `export function drawWorld(ctx, world, alpha, time): void` porting the old sky, clouds, pipes, ground stripes and bird art with the old colours.
- Produces, `input.js`: `export function shouldFlap(event: { type: string, code?: string, target: { closest(sel: string): unknown } }, phase: World['phase']): boolean`. True for `pointerdown` or `keydown` with code `Space` or `ArrowUp`, when phase is `ready` or `playing`, and the target is not inside `button, input, a, [data-ui]`.
- Produces, `screens.js`: `export function createScreens(root: HTMLElement, handlers: { onStart(name: string), onRestart(), onToggleMute(): boolean }): { showReady(best: number), showPlaying(), showScore(n: number), showOver(score: number, best: number, board: Entry[], run: Entry), showPaused(), hidePaused() }`. All text is set with `textContent`. Player names are never inserted as HTML.
- `main.js` boot order: `createStorage()`, `migrateV1`, `createRewards`, load leaderboard, `new Game({ canvas })`, `game.setScene(new FlightScene(...))`, `game.start()`. `GameUI` and `ParticleSystem` from dopaminejs handle level-up, achievement toasts and the milestone effects: score 1, 5, 10, 20, 30, 50 with the old texts in sentence case without exclamation marks ("First point", "Getting good", "Great start", "On fire", "Unstoppable", "Legendary") and the old particle calls. `SoundManager` plays jump, score and game over. On crash: `addScore`, save the board, `recordGame(GAME, { score })`, show unseen achievements, then `markAchievementsSeen`.

- [ ] **Step 1: Write the failing unit tests** in `tests/unit/input.test.js`:
  - `space and tap flap while playing`, `a tap on a button does not flap`, `nothing flaps on the game-over screen`, `other keys do nothing`.
- [ ] **Step 2: Write the failing e2e tests** in `tests/e2e/game.spec.js`:
  - `start, flap and crash`: enter name "Tester", press Start, tap the canvas 3 times, wait for the game-over screen (the bird falls), final score text is a number, leaderboard shows "Tester".
  - `scores a point`: expose `window.__bf` only when `import.meta.env.DEV` or `?test=1`, with `world` access; place the bird in front of a pipe gap and assert the HUD shows 1.
  - `high score and mute survive a reload`.
  - `no console errors` across the start, play and over flow.
  - `fits a 320x480 screen`: no horizontal scroll, Start button visible.
- [ ] **Step 3:** Run `npx vitest run tests/unit/input.test.js` and `npm run e2e`. Expected: FAIL.
- [ ] **Step 4:** Implement. Canvas sized to the viewport times `devicePixelRatio`, world in CSS pixels. `resize()` on window resize.
- [ ] **Step 5:** Run unit and e2e. Expected: PASS.
- [ ] **Step 6:** Compare against the old game in a browser at 390x844 (open `git show main:www/bird_flight.html` saved to `/tmp`): same look, same feel on flap. Note any difference.
- [ ] **Step 7:** Commit: "draw and run Bird Flight on the dopaminejs kernel".

### Task 6: Native behaviour

**Files:**
- Create: `src/platform/haptics.js`, `src/platform/lifecycle.js`, `src/platform/back.js`
- Modify: `src/main.js`
- Test: `tests/unit/back.test.js`, `tests/unit/lifecycle.test.js`

**Interfaces:**
- Produces, `back.js`: `export function backAction(state: { phase, paused: boolean }): 'pause' | 'resume' | 'exit' | 'ready'`. Playing and not paused: `pause`. Paused: `resume`. Ready: `exit`. Over: `ready`.
- Produces, `lifecycle.js`: `export function wireLifecycle({ App, scene, onBack: (action) => void }): () => void` subscribing to `App.addListener('appStateChange')` (inactive pauses) and `backButton`. Returns an unsubscribe. On resume from background the scene stays paused until the player taps.
- Produces, `haptics.js`: `export function createHaptics(Haptics, isNative: boolean): { flap(), score(), crash() }` mapping to `impact({ style: 'LIGHT' })`, `impact({ style: 'MEDIUM' })`, `notification({ type: 'ERROR' })`; no-ops when not native.
- `main.js`: `StatusBar.setOverlaysWebView({ overlay: false })` and a style matching the sky, `SplashScreen.hide()` after the first frame, all guarded by `Capacitor.isNativePlatform()`.

- [ ] **Step 1: Write the failing tests:** each `backAction` case; `wireLifecycle` with a fake `App` that captures listeners: `inactive` calls `scene.pause()`, back during a run pauses, the unsubscribe removes both listeners; `after background the kernel does not see the time away as steps` by asserting the scene's accumulator resets on `resume()`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `exit` calls `App.exitApp()`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: "pause on back and background, add haptics".

### Task 7: Capacitor 8 and the Android project

**Files:**
- Modify: `capacitor.config.json`, `android/variables.gradle`, `android/app/build.gradle`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/AndroidManifest.xml`, `android/build.gradle`, `android/gradle/wrapper/gradle-wrapper.properties`

- [ ] **Step 1:** `capacitor.config.json`: `appId` `com.baryodev.birdflight`, `appName` `Bird Flight`, `webDir` `www`, `plugins.SplashScreen.launchAutoHide: false`. No `server` key. Remove it from `.gitignore` and commit it: it holds no secrets and the build depends on it.
- [ ] **Step 2:** `npx cap migrate` then check its diff. Set the Global Constraints SDK values in `variables.gradle`. `versionCode 3`, `versionName "2.0.0"` in `app/build.gradle`. Signing config unchanged.
- [ ] **Step 3:** `strings.xml`: `app_name` and `title_activity_main` `Bird Flight`, `package_name` and `custom_url_scheme` `com.baryodev.birdflight`.
- [ ] **Step 4:** Install Android platform 36 if missing: `~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-36"`.
- [ ] **Step 5:** `npm run bundle`. Expected: `BUILD SUCCESSFUL`, `android/app/build/outputs/bundle/release/app-release.aab` with today's time.
- [ ] **Step 6:** Check: `unzip -p android/app/build/outputs/bundle/release/app-release.aab base/manifest/AndroidManifest.xml` decoded with `bundletool dump manifest` (install bundletool with brew if absent) shows `versionCode=3`, `targetSdkVersion=36`, permissions limited to `INTERNET` (Capacitor's own) and `VIBRATE`. `jarsigner -verify` reports the existing upload key.
- [ ] **Step 7: Upgrade check on a device.** Use a plugged-in phone if `adb devices` lists it, else create an AVD with `system-images;android-36;google_apis;arm64-v8a`. Build the v1 debug APK from `main` in a temporary worktree, install it, play one run with name "Old" and score at least 1, then `adb install -r` the new debug APK (`npm run apk`). Expected: the leaderboard shows "Old", level and XP match. Then play a run, background the app with the home button, return: the run is paused.
- [ ] **Step 8:** Update `npm run deploy` to install the new APK and start `com.baryodev.birdflight/.MainActivity`.
- [ ] **Step 9:** Commit: "move to Capacitor 8 and target Android 16".

### Task 8: Play release

**Files:**
- Create: `scripts/play.mjs`, `scripts/screenshots.mjs`, `store/release-notes.txt`, `store/listing.json`
- Delete: `scripts/generate_screenshots.js`

**Interfaces:**
- `scripts/play.mjs <command>` with commands `status` (tracks, bundles, listing, testers), `release --dry-run`, `release`. Uses `fetch` against `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.baryodev.birdflight` with the token and header from Global Constraints. The token is never printed.
- `release` does, in one edit: upload the AAB (`upload/.../bundles`, `uploadType=media`), set track `alpha` to `{ releases: [{ name: '2.0.0', versionCodes: ['3'], status: 'completed', releaseNotes: [{ language: 'en-US', text }] }] }`, patch the en-US listing from `store/listing.json`, replace phone screenshots with `store/screenshots/*.png`, set `testers/alpha` to `{ googleGroups: [GROUP] }` where `GROUP` comes from env `BF_TESTERS_GROUP`, then `edits:validate`. Without `--dry-run` it then calls `edits:commit`. With `--dry-run` it deletes the edit.

- [ ] **Step 1:** `store/listing.json`: title `Bird Flight`, short description `Tap to fly through the pipes. How far can you get?`, full description = the current one with the emoji and em dash removed and "Local Leaderboard" kept. `store/release-notes.txt`: `Bird Flight is now its own app. Rebuilt for smoother play on every screen, with haptics, pause on back, and your old scores carried over.`
- [ ] **Step 2:** `scripts/screenshots.mjs` uses Playwright at 1080x1920 (Pixel 7 profile, scale 2.8) to save `store/screenshots/1-start.png`, `2-flying.png`, `3-over.png`.
- [ ] **Step 3:** `node scripts/play.mjs status`. Expected: alpha shows version code 2.
- [ ] **Step 4:** Gate. Needs Task 7 Step 7 passed and `BF_TESTERS_GROUP` set to the address Arnel gives. `node scripts/play.mjs release --dry-run`. Expected: validate succeeds, edit deleted.
- [ ] **Step 5:** `node scripts/play.mjs release`. Expected: commit succeeds. `status` shows alpha version code 3 and the group.
- [ ] **Step 6:** Commit: "release 2.0.0 to closed testing through the Play API".

### Task 9: Testers page on baryo.dev

**Files (in `~/repos/baryoweb`, branch `testers-page` off `master`):**
- Create: `app/testers/page.tsx`, `lib/testers.ts`, `public/testers/bird-flight.png`
- Modify: `app/sitemap.ts`, `components/site-footer.tsx`

**Interfaces:**
- `lib/testers.ts`: `export const BIRD_FLIGHT = { group: 'https://groups.google.com/g/<group-name>', optIn: 'https://play.google.com/apps/testing/com.baryodev.birdflight', store: 'https://play.google.com/store/apps/details?id=com.baryodev.birdflight', days: 14, testers: 12 }`.

- [ ] **Step 1:** Page at `/testers/`, metadata title `Volunteer testers`, canonical `/testers/`. `SectionHead` eyebrow `Volunteer testers`, title `Welcome, volunteer testers`, sub along the lines of `Help get Bird Flight onto Google Play. It takes two minutes and an Android phone.` Then the screenshot (from `store/screenshots/2-flying.png`), a short line on why: Google asks for 12 testers who keep the app for 14 days before it can go public. Three numbered steps with a `LinkButton` each: `Join the testers group` (group), `Become a tester on Google Play` (optIn, says to use the same Google account), `Install Bird Flight` (store). A closing line: keep it installed for 14 days, play when you like, and send feedback by email to `baryodev@gmail.com`.
- [ ] **Step 2:** Add `/testers/` to `app/sitemap.ts` and a `Volunteer testers` link to the footer.
- [ ] **Step 3:** `npm run verify`. Expected: tests, contrast checks and build pass.
- [ ] **Step 4:** Check `/testers/` with `npm run dev` at 375 and 1280 px: no horizontal scroll, buttons readable.
- [ ] **Step 5:** Commit: "add a page for Bird Flight volunteer testers".
- [ ] **Step 6:** Gate. Wait until `node scripts/play.mjs status` (HTMLGames) shows the alpha release reviewed and the opt-in URL opens the tester page for a group member. Then `npm run build && baryovm stack release baryo-web`, and `curl -sI https://baryo.dev/testers/` returns 200.

---

## Execution notes

- Tasks 2, 3, 4 and 6 are independent of each other; Task 5 needs 2 to 4; Task 7 needs 5 and 6; Task 8 needs 7; Task 9 needs Task 8's screenshots and, for its last step, Play approval.
- Push the HTMLGames branch and open a PR to `BaryoDev/SimpleMobileGames` only when Arnel asks.
