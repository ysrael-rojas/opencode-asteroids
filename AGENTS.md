# AGENTS.md

Pure client-side Asteroids clone in one file. No framework, no bundler, no dependencies, no tests, no lint — **do not try to install anything or add a build step**.

## Run

Open `index.html` directly, or `npx serve .` then visit `http://localhost:3000`. There is no dev server, watch mode, or test command. Verify UI changes in a browser (keyboard input required to play).

## Structure gotchas

- `game.js` is executed top-to-bottom in browser global scope (`'use strict'`, no modules/exports) and expects `#canvas` to already exist — it's loaded at the end of `<body>`. Keep it that way.
- Canvas size is defined in **two places** that must stay in sync: `width`/`height` on the `<canvas>` in `index.html` and `W`/`H` constants in `game.js`. Change both together or the game/coordinates break.
- Main loop uses `requestAnimationFrame`; `dt` is clamped to `0.05`s. Physics constants in `update(dt)` assume this delta timing.
- `pressed('Space')` is edge-triggered (fires once per keydown, consumed on read) via the `justPressed` map; held keys live in `keys`. Only `e.code` values are listened to (`Space`, `Arrow*`). Readability/text prompts live in the HUD.

## Code conventions

- Identifiers and class structure are in English; UI strings and most comments are in **Spanish** (HUD: `NIVEL`, `PUNTAJE`, `GAME OVER`). Match whichever you are writing.
- State machine is a module-level string: `'playing' | 'dead' | 'gameover'`. Entities are plain classes (`Ship`, `Bullet`, `Asteroid`, `Particle`) mutated by `update(dt)`/`draw()`; removal happens via `dead` flag + `filter()` in `update()`.
- `RADII`/`SPEEDS`/`POINTS` arrays in `game.js` are indexed by asteroid size 1–3 (element 0 unused).
- Repo is in Spanish (README); descriptions may overstate implemented features — trust `game.js` over README prose.
