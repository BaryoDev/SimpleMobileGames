# Bird Flight rebuild

## Why

The app on Play (`com.baryodev.birdflight`) is a closed-testing build from December 2025 that
nobody uses. It ships five games as "Game Hub", each a single HTML file with inline scripts and
hand-copied, outdated dopaminejs files. It targets Android API 35, which Play no longer accepts
for updates. Arnel wants one game, Bird Flight, rebuilt properly on dopaminejs and Capacitor,
pushed to the closed track, and enough volunteer testers recruited from baryo.dev to clear
Play's rule for new personal accounts: 12 testers opted in for 14 days in a row before a
production application is allowed.

The app is also a showcase for dopaminejs, so it should use the framework the way its README
says to, not around it.

## Goals

1. Bird Flight is the only game. Block Drop, Chess, Dice Master and Sky Ace are deleted, along
   with the Game Hub menu, `www/data-service.js` and the other copied dopaminejs files.
2. The game is a small modular codebase built with Vite, with game rules separate from
   rendering, input, storage and the native platform.
3. dopaminejs 2.4.0 from npm drives progression and feel: `RewardSystem` (XP, levels,
   achievements, daily streak, high score), `GameUI`, `ParticleSystem` and `SoundManager`.
4. Capacitor 8 with target SDK 36. The native layer is used where it improves the game on a
   phone: haptics on flap, score and crash; pause when the app goes to the background; the
   Android back button; status bar and splash screen; persistent storage that survives the
   WebView clearing its data.
5. Same feel as today on a mid-range phone: steady 60 fps, the same tap-to-flap controls.
6. A signed AAB, version code 3, on the closed testing (alpha) track with a Google Group of
   testers attached.
7. A "Welcome, volunteer testers" page on baryo.dev with the two links a tester needs.

## Non-goals

- iOS. Android only for now.
- Online leaderboards, accounts, ads, analytics or any network use. The app stays offline.
- New game modes. The improvements are to how it is built and how it feels, not new content.
- Changes to dopaminejs itself, unless the rebuild finds a real bug there. A bug found goes to
  the dopaminejs repo as its own fix, not a local workaround.

## Anti-goals

- A tester losing their existing high score or level on update. The old keys
  (`birdFlightLeaderboard_v1`, `gameSoundsMuted`, and dopaminejs's `dopamine_` keys) are read
  once and migrated.
- Anything that adds a permission beyond what haptics needs (`VIBRATE`). Adding `INTERNET` use
  or tracking would change the Data safety form and the privacy policy.
- Frame-rate-dependent physics. The bird must fall the same on a 60 Hz and a 120 Hz screen.

## Constraints

- Repo stays `~/repos/SimpleMobileGames` (remote `BaryoDev/SimpleMobileGames`), branch off
  `main`.
- Package name `com.baryodev.birdflight` and the existing upload keystore
  (`android/app/my-release-key.keystore`, `android/keystore.properties`, both gitignored) stay.
  Losing either means a new app listing.
- Version code must be above 2. This release is version code 3, version name 2.0.0.
- Play changes go through the Android Publisher API with the ADC login already set up
  (account with Play access, quota project `baryodev-play`).
- Pinned dependency versions, no `^` ranges.
- Copy follows Arnel's writing rules: plain, no em dashes, no emoji in UI text or store text.

## How it is built

### Code layout

```
src/
  main.js            boot: platform, storage, rewards, then the game
  game/
    rules.js         pure: physics constants, difficulty curve, scoring, collision
    world.js         pure: bird, pipes, score as plain state, step(state, dt, input)
    scene.js         dopaminejs Scene that renders the world and runs the fixed step
  ui/                start screen, HUD, pause, game over, leaderboard (DOM)
  progression/       RewardSystem config: achievements and XP rules for Bird Flight
  platform/          Capacitor adapters: storage, haptics, lifecycle, back button, status bar
  migrate.js         one-time import of the v1 localStorage keys
index.html
```

The world is plain data stepped at a fixed 60 Hz timestep. The renderer draws it with
interpolation. That keeps the rules testable without a canvas and fixes the refresh-rate
problem.

### dopaminejs

- `RewardSystem` with a `DataService` backed by Capacitor Preferences (its async storage
  interface). `recordGame('birdFlight', { score })` at the end of every run.
- Bird Flight's achievements live in `progression/`: first flight, scores of 10, 25, 50 and
  100, a 3-day and 7-day streak, 100 total pipes.
- `GameUI` for level-up, achievement toasts and floating score text. `ParticleSystem` for the
  score-milestone effects the store listing already promises (sparkle, confetti, fire at 10,
  20, 30, 50).
- `SoundManager` replaces the hand-written `SoundGenerator`. It needs synchronous storage for
  its mute flag, so it gets localStorage, mirrored to Preferences.

### Capacitor 8

Plugins: `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/app`,
`@capacitor/status-bar`, `@capacitor/splash-screen`. Everything in `platform/` has a web
fallback so the game runs in a desktop browser for development and for Playwright.

Back button: pauses during a run, closes the pause overlay if open, exits from the start
screen. Going to the background pauses the run.

### Android

- App name "Bird Flight" everywhere, including `strings.xml`, which still says HTMLGames and
  `com.example.htmlgames`.
- Existing launcher icons and splash kept.
- `npm run deploy` points at the right activity (`com.baryodev.birdflight/.MainActivity`).

### Tests

- Vitest over `rules.js`, `world.js`, `migrate.js` and the progression config: gravity and
  flap, scoring once per pipe, collision with pipes, floor and ceiling, the difficulty curve,
  the fixed step giving the same result whatever the frame rate, and migration of the old keys.
- Playwright against the built site: start, flap, score a point, crash, game over shows the
  score, the high score and mute survive a reload.
- Gradle `bundleRelease` builds a signed AAB.

## Release

1. Build the signed AAB.
2. Through the API: upload the bundle, put version code 3 on the alpha track with release
   notes, set the en-US listing title to "Bird Flight" and the short description to plain
   copy, attach the testers Google Group to the alpha track, commit the edit.
3. Play then reviews it, usually within a few days.

Arnel asked for the republish and the baryo.dev link, so the builder commits the Play edit and
releases baryo.dev, with a check before each:

- Before committing the edit: the AAB installs and plays on a device or emulator, and an
  over-the-top install on a v1 build keeps the saved data. An uncommitted edit can be deleted,
  so nothing reaches Play until this passes.
- The testers page goes live once Play has approved the build, so the opt-in link works the
  first time someone clicks it. Rollback for baryo.dev is releasing the previous commit.

### Current Play state (read through the API on 2026-10-18)

- alpha (closed testing): release "Flappy1", version code 2, completed.
- internal: version code 1. production and beta: empty.
- No Google Group on any track. Email tester lists are not visible through the API; the Group
  is added alongside whatever is there, not instead of it.
- en-US listing title "Easy Games". The full description already covers Bird Flight only and
  can stay with light edits to drop emoji and em dashes.

### Saved data and the WebView origin

- Capacitor 7 and 8 both serve from `https://localhost` by default, and `capacitor.config.json`
  sets no `server` block. Keep it that way, or localStorage starts empty and the migration has
  nothing to read.
- The old hub kept one dopaminejs player across all five games. That player (XP, level,
  streak, achievements) carries over as is: it is the same person. It is loaded through
  `RewardSystem`'s own migration, which already treats saved state as untrusted. If a field
  does not survive, keep the Bird Flight high score and leaderboard and let the rest start
  fresh. Never fail to boot over bad saved data.

### Store graphics

New screenshots are captured from the rebuilt game with Playwright at a phone size and uploaded
through the API. The icon and feature graphic stay. The Data safety answers stay as they are,
because the app still collects nothing.

## Testers page on baryo.dev

`~/repos/baryoweb` is a Next.js static export deployed to the VM with
`baryovm stack release baryo-web`. The existing `/volunteer` page is Rotary volunteer work,
so testers get a separate page.

- New page `app/testers/page.tsx` at `/testers/`, using `SectionHead`, `LinkButton` and the
  site tokens. Headline along the lines of "Welcome, volunteer testers".
- Content: what Bird Flight is, one screenshot, why testers are needed (12 people for 14
  days), and three steps: join the Google Group, opt in on Play, install and keep it installed
  for 14 days. Each step has its button.
- Link from the footer and from the Bird Flight entry if one is added to the home `#built`
  section. Added to `app/sitemap.ts`.
- Mobile first, motion behind `prefers-reduced-motion`, like the rest of the site.

## Decided by Arnel

- Bird Flight only, the other games are removed.
- Google Group for testers.
- Testers page on baryo.dev.

## Builder's calls (Claude)

- Vite plus a fixed-timestep world, the folder layout above, the achievement list.
- Capacitor Preferences for storage, and the five plugins listed.
- Migrating old saved data.
- Version name 2.0.0, listing title "Bird Flight".
- A separate `/testers/` page rather than reusing `/volunteer`.
- Carrying the shared hub player over, with the high score as the floor if that fails.
- New Play screenshots from the rebuilt game.
- Testers page goes live after Play approves the build.

## Needed from Arnel

- The Google Group address, created with "Anyone on the web can ask to join" or "Anyone can
  join". Groups for gmail.com accounts cannot be created through an API.
