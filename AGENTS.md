# AGENTS.md

Guidance for coding agents working on the **hormigas-aco** (Ant Colony Optimization) browser simulation. Read this before making changes.

## Project shape

- Vanilla JavaScript (ES modules), **no build step**. `index.html` is opened directly in the browser; PixiJS v7 is loaded as a global from a CDN (`<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/...">`). There is no `npm run build`.
- All source lives in `js/` (ESM, `type: "module"` in `package.json`).
- All tests live in `js/tests/` and run on Node's built-in test runner — no Jest, no Vitest.
- Package manager: **pnpm ≥ 9** (see `packageManager` in `package.json`); `.npmrc` enables `auto-install-peers` and `node-linker=hoisted`.
- Target: modern browsers only. UI labels and comments are in **Spanish** — keep new user-facing strings in Spanish.

## Commands

Run from the repository root.

```sh
pnpm install            # one-time
pnpm test               # run the full test suite (js/tests/)
pnpm test:watch         # node --test --watch
pnpm lint               # eslint js/
pnpm lint:fix           # eslint --fix js/
pnpm format             # prettier --write "js/**/*.js" index.html styles.css
pnpm format:check       # prettier --check
```

### Running a single test

The runner is `node --test --test-concurrency=1 js/tests/`. To run one file:

```sh
node --test --test-concurrency=1 js/tests/simulation.test.js
```

To run a single test by name pattern, use `--test-name-pattern` (regex matched against `test("...")` titles):

```sh
node --test --test-concurrency=1 --test-name-pattern="addFood stacks" js/tests/
```

Always keep `--test-concurrency=1`: the suite shares the global `p5-mock` and some module state. The whole file is ~340 lines / 30+ tests and finishes in well under a second.

## Code style

### Formatting (Prettier, see `.prettierrc.json`)

- **Double quotes** for strings (`"…"`, not `'…'`). JSDoc double-quoted too.
- **Semicolons required**.
- 2-space indent, LF line endings, 80-col print width.
- Trailing commas where ES5 allows (`"trailingComma": "es5"`).
- Arrow functions always parenthesized (`arrowParens: "always"`).

### Imports

- Use ES `import` / `export` exclusively. No CommonJS, no transpilation.
- Named exports for everything except the `main.js` entry, which only has side effects.
- Group imports: third-party (none today) → local modules. Multi-line named imports use one name per line (see `simulation.js`).
- Tests import the SUT via **dynamic** `await import("../module.js")` (see `js/tests/*.test.js`) so `p5-mock.js` runs first as a side-effecting import.

### Types & JSDoc

- The project is plain JS, no TypeScript, but **every exported class, function, and method has JSDoc** with `@param` / `@returns` and often `@example`. Match that — do not add implementation comments, but **do** document public APIs.
- JSDoc is the source of truth for editor type hints; ESLint's `no-undef` is enabled, so reference only declared symbols or globals explicitly whitelisted in `eslint.config.js` (browser globals + `PIXI`).
- Prefer `@typedef` for object shapes (e.g. `Palette` in `palettes.js`).
- For class fields with a meaningful type, prefer a single `@type` JSDoc line on the field over per-field comments.

### Naming

- **Classes**: `PascalCase` (`Simulation`, `PheromoneField`, `Vec2`).
- **Functions / methods / variables**: `camelCase`.
- **Module-level constants**: `SCREAMING_SNAKE_CASE`, grouped in `js/constants.js`. Don't scatter magic numbers in feature files — extend `constants.js`.
- **Private fields and methods**: leading underscore (`_listeners`, `_drawSeries`, `_buildParams`).
- File names: lowercase, hyphen-free, descriptive (`spatial-grid.js`, `event-emitter.js`).

### Class / method conventions

- Mutating vector / chainable methods return `this` (see `Vec2.set`, `add`, `mult`, `normalize`, `rotate`, `lerp`). Keep this contract.
- Top-level constructors take only their own data; cross-module collaborators (e.g. `Simulation` owning `PheromoneField`, `SpatialGrid`, `EventEmitter`) are wired in the constructor.
- `Simulation` extends `EventEmitter`. Emit semantic events for UI side-effects (`"foodCollected"`, `"antDied"`, `"pauseChanged"`, `"followed"`, …). Do not call DOM APIs from `simulation.js`.
- DOM access is always guarded: `document.getElementById("foo")` may return `null`, so use `?.` or `if (el) { … }` (see `main.js`).
- Anything that touches `localStorage` is wrapped in `try { … } catch { /* ignore */ }` — `persistence.js` is the canonical example. Don't throw on missing / disabled storage.
- Use `===` / `!==` (ESLint `eqeqeq: "error"`). `Number.isFinite` over `isFinite`. Prefer `Math.hypot` for 2D distance (`dist2` in `vec2.js`).

### Error handling

- Pure / testable modules (`entities.js`, `pheromones.js`, `vec2.js`, …) do not throw on bad input — clamp, drop, or return a sensible default. Look at `PheromoneField` and `SpatialGrid` for the pattern.
- Browser-adjacent code (`persistence.js`, `main.js`, `gui.js`) swallows expected failures (storage unavailable, missing DOM nodes) and logs warnings via `console.warn` only when actionable.

### ESLint specifics (`eslint.config.js`)

- Files: `js/**/*.js`. **`js/tests/**` is ignored\*\* — do not lint test files, do not add ESLint config for them.
- `ecmaVersion: 2024`, `sourceType: "module"`. You may use modern syntax (logical assignment, `??`, top-level `await` in tests).
- Unused args/vars are warnings, not errors, and `_`-prefixed names are exempt.
- Empty `catch` blocks are allowed when intentional (`allowEmptyCatch: true`) — use a brief comment when swallowing.

## Architecture at a glance

- `main.js` — entry point, PixiJS bootstrap, render loop, input wiring.
- `simulation.js` — `Simulation` class, owns world state and the `EventEmitter` surface.
- `entities.js` — `Nest`, `FoodSource`, `Ant`, `RandomWalker`.
- `pheromones.js` — `PheromoneField` (2D grid used for both food and home channels).
- `spatial-grid.js` — uniform grid used for O(1)-ish food neighbor queries.
- `obstacles.js` — circular obstacles.
- `particles.js` — pooled particle FX.
- `renderer.js` — PixiJS drawing (separate from simulation).
- `gui.js` / `input.js` — control panel + keyboard shortcuts.
- `persistence.js` — `localStorage` save/load with debounce; fault-tolerant.
- `recorder.js` — frame recorder / playback.
- `stats-graph.js` — side-panel time-series chart.
- `palettes.js` — color-blind-friendly color sets.
- `presets.js` — named parameter bundles (`Exploración`, `Persistente`, `Denso`, `Escasez`).
- `constants.js` — single source of truth for tunable numeric constants and `DEFAULT_PARAMS`.
- `vec2.js` — minimal 2D vector utilities (`Vec2` + helpers `v`, `dist2`, `clamp`, `randRange`, `randomDir`).
- `sw.js` — service worker (PWA offline support). Be cautious when touching it.

## Testing conventions

- New tests go in `js/tests/<module>.test.js`, one file per SUT.
- Always start with:
  ```js
  import { test } from "node:test";
  import assert from "node:assert/strict";
  import "./p5-mock.js";
  const { Thing } = await import("../thing.js");
  ```
- Use `assert.equal` / `assert.deepEqual` / `assert.ok` from `node:assert/strict`. No third-party assertion libraries.
- Prefer small, behavior-focused tests over broad integration tests. Mirror the style of `simulation.test.js`.
- Do not import from `main.js` or any module that touches `document`/`window` outside the p5-mock globals.
- The mock is intentionally minimal (`window`, `document`, `navigator`); extend it in place if a new test needs more globals.

## Things to avoid

- Adding a bundler, transpiler, or TypeScript. The project is intentionally build-free.
- Reaching for `npm` — `pnpm` is pinned in `packageManager`.
- Touching `node_modules/`, `pnpm-lock.yaml` (unless dependency change is intended), or the PixiJS CDN version, without an explicit ask.
- Adding comments inside function bodies — JSDoc on the signature is enough.
- Linting `js/tests/**` or formatting `index.html` indentation manually.
