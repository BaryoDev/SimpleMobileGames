# Bird Flight v2 art direction: day to night

Arnel asked for a new look for v2 and picked "day to night sky" on 2026-10-19. This adds to
`2026-10-18-bird-flight-rebuild-design.md`. Everything there still holds, and the store
screenshots in Task 8 are taken after this lands.

## The look

Flat vector shapes with soft gradients, drawn on the canvas. No image files except what is
already in the repo, no web fonts, no network.

The sky changes with the score, so a run shows progress. The phases:

| Score | Phase | Sky (top to bottom) |
|-------|-------|---------------------|
| 0 to 9 | Morning | pale blue to warm peach, low sun |
| 10 to 24 | Day | clear blue to light blue, high sun |
| 25 to 49 | Sunset | deep orange to pink to violet, sun on the horizon |
| 50 and up | Night | navy to indigo, moon, twinkling stars |

Crossing a threshold blends to the next palette over about 1.5 seconds rather than snapping.
The sun or moon disc moves along an arc with the phase. Each new run starts in the morning.

Layers, back to front, scrolling at a fraction of pipe speed for parallax:

1. Sky gradient and sun or moon (static within a phase).
2. Stars (night only) or clouds (other phases), slow drift.
3. Far mountains, 0.1 of pipe speed.
4. Mid hills, 0.3.
5. Near hills with a few round trees, 0.6.
6. Pipes and the ground strip, 1.0.

Hills, pipes and ground take a tint from the current phase, so the night scene is dark
throughout, not a day scene with a dark sky.

The bird is round and chunky, with a lighter belly, a big eye with a highlight, a small beak and
a wing that flaps on every tap and idles slowly otherwise. It tilts with its speed, as it does
now. Its colours stay warm yellow and orange, so it reads against every sky.

The pipes are rounded columns with a lip, a highlight down one side and a shadow down the other.
There is no black outline.

## Screens

- The start, pause and game-over cards are frosted rounded panels (translucent white by day,
  translucent navy at night), with a pill button that presses down on tap.
- Screens fade and scale in, about 200 ms.
- Game over shows a medal for the run: bronze at 10, silver at 25, gold at 50, platinum at 100.
  The medals are SVG. A "New best" tag shows when the run beat the previous best.
- The dopaminejs top bar (level, XP, streak) stays, because it is the framework showcase. It is
  restyled through CSS overrides in `src/ui/styles.css` to match the cards. The dopaminejs
  stylesheet itself is not edited.
- The title reads "Bird Flight".

## Fixes carried in

- The name field is prefilled after an upgrade from v1. If no last name is stored, it uses the
  name of the newest v1 leaderboard entry.
- The empty-name fallback and the placeholder agree. Both say "Player".

## Constraints

- 60 fps on a mid-range phone. Gradients and the hill silhouettes are drawn once into cached
  offscreen canvases and rebuilt only on resize or a phase change. Nothing is allocated per
  frame in the draw loop.
- The world and the rules do not change. The art reads the world and the score, and never
  writes to them.
- `prefers-reduced-motion`: no parallax drift, no star twinkle, no card transitions, and the
  phase blend snaps. Gameplay is unchanged.
- The copy rules still apply: plain words, sentence case, no emoji, no exclamation marks.

## Builder's calls (Claude)

- The phase thresholds, the palettes, the parallax speeds and the medal thresholds above.
- Prefilling the name from the newest v1 leaderboard entry.
