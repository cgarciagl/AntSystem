import {
  MIN_FOOD_RADIUS,
  MAX_FOOD_RADIUS,
  ANT_TAIL_X,
  ANT_BODY_HALF,
  ANT_NOSE_X,
  NEST_RADIUS,
  PHEROMONE_DRAW_THRESHOLD,
} from "./constants.js";

/**
 * Convert an RGB tuple to a 0xRRGGBB hex number for PixiJS.
 * @param {[number, number, number]} rgb
 * @returns {number}
 */
export const rgbToHex = ([r, g, b]) =>
  ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);

/**
 * Convert a 0xRRGGBB hex number to an RGB tuple.
 * @param {number} hex
 * @returns {[number, number, number]}
 */
export const hexToRgb = (hex) => [
  (hex >> 16) & 0xff,
  (hex >> 8) & 0xff,
  hex & 0xff,
];

/**
 * Thin PixiJS-based renderer for the simulation.
 *
 * Architecture: one persistent Graphics per visual category (pheromones,
 * food, obstacles, nest, ants). Each frame clears and redraws the
 * dynamic ones; static elements (nest body) are drawn once and only
 * moved. PixiJS batches consecutive draws of the same style into a
 * single WebGL draw call, so 700 ants are 1–2 draw calls, not 700.
 *
 * Text labels (nest label, paused overlay) are created once and reused
 * across frames to avoid per-frame allocation.
 *
 * @example
 *   const app = await createRenderer(wrapper, 800, 600);
 *   const sim = new Simulation(800, 600);
 *   app.ticker.add(() => { sim.update(); app.render(sim); });
 */
export async function createRenderer(wrapper, width, height, bgColor) {
  const PIXI = window.PIXI;
  if (!PIXI) throw new Error("PixiJS not loaded (window.PIXI is undefined)");

  // PixiJS v7: synchronous constructor. v8 uses `await app.init({...})`.
  const app = new PIXI.Application({
    width,
    height,
    backgroundColor: rgbToHex(bgColor ?? [17, 17, 17]),
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  const canvas = app.view ?? app.canvas;
  wrapper.appendChild(canvas);
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.cursor = "crosshair";

  const foodPheromoneG = new PIXI.Graphics();
  const homePheromoneG = new PIXI.Graphics();
  const foodG = new PIXI.Graphics();
  const obstacleG = new PIXI.Graphics();
  const trailG = new PIXI.Graphics();
  const particlesG = new PIXI.Graphics();
  const highlightG = new PIXI.Graphics();
  const nestG = new PIXI.Graphics();
  const antG = new PIXI.Graphics();
  const overlayG = new PIXI.Graphics();

  const nestLabel = new PIXI.Text("NIDO", {
    fontFamily: "system-ui, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    fill: 0xffffff,
    align: "center",
    letterSpacing: 1,
  });
  nestLabel.anchor.set(0.5);
  nestLabel.position.set(0, 0);
  nestG.addChild(nestLabel);

  const pausedLabel = new PIXI.Text(
    "  ⏸  PAUSADO — Espacio para continuar · S/→ para paso a paso",
    {
      fontFamily: "system-ui, sans-serif",
      fontSize: 13,
      fill: 0xffffff,
    }
  );
  pausedLabel.position.set(0, 9);

  const layers = app.stage;
  layers.addChild(
    foodPheromoneG,
    homePheromoneG,
    foodG,
    obstacleG,
    trailG,
    particlesG,
    highlightG,
    nestG,
    antG,
    overlayG
  );

  drawNestBody(nestG);

  return {
    app,
    layers: {
      foodPheromoneG,
      homePheromoneG,
      foodG,
      obstacleG,
      trailG,
      particlesG,
      highlightG,
      nestG,
      antG,
      overlayG,
    },
    pheromoneStride: 1,
    setPheromoneStride(s) {
      this.pheromoneStride = Math.max(1, Math.min(4, s | 0));
    },
    setNest(nest) {
      nestG.position.set(nest.pos.x, nest.pos.y);
    },
    setObstacles(obstacles) {
      obstacleG.clear();
      for (const ob of obstacles) {
        obstacleG.beginFill(0x444444);
        obstacleG.drawCircle(ob.pos.x, ob.pos.y, ob.r);
        obstacleG.endFill();
        obstacleG.beginFill(0x222222);
        obstacleG.drawCircle(ob.pos.x, ob.pos.y, ob.r * 0.7);
        obstacleG.endFill();
      }
    },
    setFood(sources) {
      foodG.clear();
      for (const f of sources) {
        const r = Math.max(
          MIN_FOOD_RADIUS,
          Math.min(MAX_FOOD_RADIUS, Math.sqrt(f.amount))
        );
        foodG.beginFill(rgbToHex(f.color || [60, 180, 60]));
        foodG.drawCircle(f.pos.x, f.pos.y, r);
        foodG.endFill();
      }
    },
    drawPheromones(field, graphics, stride = 1) {
      graphics.clear();
      const [r, g, b] = field.color;
      const cs = field.cellSize * stride;
      const cols = field.cols;
      const rows = field.rows;
      const f = field.field;
      graphics.blendMode = PIXI.BLEND_MODES.ADD;
      const hex = (r << 16) | (g << 8) | b;
      for (let y = 0; y < rows; y += stride) {
        for (let x = 0; x < cols; x += stride) {
          let v = 0;
          for (let dy = 0; dy < stride && y + dy < rows; dy++) {
            for (let dx = 0; dx < stride && x + dx < cols; dx++) {
              v += f[x + dx + (y + dy) * cols];
            }
          }
          if (v <= PHEROMONE_DRAW_THRESHOLD) continue;
          const alpha = Math.min(1, v * 0.04) * 0.7;
          graphics.beginFill(hex, alpha);
          graphics.drawRect(x * field.cellSize, y * field.cellSize, cs, cs);
          graphics.endFill();
        }
      }
      graphics.blendMode = PIXI.BLEND_MODES.NORMAL;
    },
    drawTrails(ants) {
      trailG.clear();
      if (ants.length < 2) return;
      trailG.blendMode = PIXI.BLEND_MODES.ADD;
      trailG.lineStyle({ width: 1, color: 0x88aaff, alpha: 0.08 });
      for (let i = 1; i < ants.length; i++) {
        const a = ants[i - 1];
        const b = ants[i];
        if (!a.alive || !b.alive) continue;
        trailG.moveTo(a.pos.x, a.pos.y);
        trailG.lineTo(b.pos.x, b.pos.y);
      }
      trailG.blendMode = PIXI.BLEND_MODES.NORMAL;
    },
    drawAnts(ants, params, walkers = []) {
      antG.clear();
      const antColor = rgbToHex(params.antColor);
      const carryingColor = rgbToHex(params.carryingColor);
      const headColor = rgbToHex(darken(params.antColor, 0.35));
      const carryingHeadColor = rgbToHex(darken(params.carryingColor, 0.35));
      const walkerColor = 0xff5577;
      const walkerCarryingColor = 0xff99aa;
      for (let pass = 0; pass < 2; pass++) {
        const isCarrying = pass === 1;
        antG.beginFill(isCarrying ? carryingColor : antColor);
        for (const ant of ants) {
          if (!ant.alive) continue;
          if (ant.carrying > 0 !== isCarrying) continue;
          drawAntPolygon(antG, ant);
        }
        antG.endFill();
        antG.beginFill(isCarrying ? carryingHeadColor : headColor);
        for (const ant of ants) {
          if (!ant.alive) continue;
          if (ant.carrying > 0 !== isCarrying) continue;
          drawAntHead(antG, ant);
        }
        antG.endFill();
        if (walkers.length > 0) {
          antG.beginFill(isCarrying ? walkerCarryingColor : walkerColor);
          for (const w of walkers) {
            if (!w.alive) continue;
            if (w.carrying > 0 !== isCarrying) continue;
            drawAntPolygon(antG, w);
          }
          antG.endFill();
          antG.beginFill(darken([0xff, 0x55, 0x77], 0.35));
          for (const w of walkers) {
            if (!w.alive) continue;
            if (w.carrying > 0 !== isCarrying) continue;
            drawAntHead(antG, w);
          }
          antG.endFill();
        }
      }
    },
    drawParticles(particles) {
      particlesG.clear();
      if (particles.particles.length === 0) return;
      particlesG.blendMode = PIXI.BLEND_MODES.ADD;
      particles.draw(particlesG, rgbToHex);
      particlesG.blendMode = PIXI.BLEND_MODES.NORMAL;
    },
    drawFollowedHighlight(ant) {
      highlightG.clear();
      highlightG.lineStyle({ width: 2, color: 0xffe040, alpha: 0.9 });
      highlightG.drawCircle(ant.pos.x, ant.pos.y, 6);
      highlightG.lineStyle({ width: 1, color: 0xffe040, alpha: 0.5 });
      highlightG.drawCircle(ant.pos.x, ant.pos.y, 11);
      highlightG.lineStyle({ width: 0 });
      const sense = ant.getLastSense && ant.getLastSense();
      if (!sense) return;
      const drawSensor = (p, hue) => {
        const intensity = Math.min(1, p.v * 0.05);
        const alpha = 0.25 + intensity * 0.75;
        const radius = 3 + intensity * 5;
        highlightG.beginFill(hue, alpha);
        highlightG.drawCircle(p.x, p.y, radius);
        highlightG.endFill();
        highlightG.lineStyle({ width: 1, color: 0xffffff, alpha: 0.5 });
        highlightG.drawCircle(p.x, p.y, radius);
        highlightG.lineStyle({ width: 0 });
      };
      drawSensor(sense.left, 0x88aaff);
      drawSensor(sense.center, 0xffffff);
      drawSensor(sense.right, 0x88aaff);
      highlightG.lineStyle({ width: 1, color: 0xffe040, alpha: 0.4 });
      for (const p of [sense.left, sense.center, sense.right]) {
        highlightG.moveTo(ant.pos.x, ant.pos.y);
        highlightG.lineTo(p.x, p.y);
      }
      highlightG.lineStyle({ width: 0 });
    },
    clearFollowedHighlight() {
      highlightG.clear();
    },
    /**
     * Render a recorded frame in place of the live simulation. The
     * static layers (obstacles/food) are redrawn from the frame data;
     * the dynamic pheromone/trail/particles layers are cleared.
     * @param {{ants: {x: number, y: number, h: number, c: number, e: number}[], food: {x: number, y: number, a: number}[], obstacles: {x: number, y: number, r: number}[]}} frame
     * @param {{antColor: [number, number, number], carryingColor: [number, number, number]}} params
     */
    renderFrame(frame, params) {
      antG.clear();
      obstacleG.clear();
      foodG.clear();
      particlesG.clear();
      highlightG.clear();
      trailG.clear();
      homePheromoneG.clear();
      foodPheromoneG.clear();
      for (const ob of frame.obstacles) {
        obstacleG.beginFill(0x444444);
        obstacleG.drawCircle(ob.x, ob.y, ob.r);
        obstacleG.endFill();
        obstacleG.beginFill(0x222222);
        obstacleG.drawCircle(ob.x, ob.y, ob.r * 0.7);
        obstacleG.endFill();
      }
      for (const f of frame.food) {
        const r = Math.max(
          MIN_FOOD_RADIUS,
          Math.min(MAX_FOOD_RADIUS, Math.sqrt(f.a))
        );
        foodG.beginFill(rgbToHex(params.foodColor || [60, 180, 60]));
        foodG.drawCircle(f.x, f.y, r);
        foodG.endFill();
      }
      const antColor = rgbToHex(params.antColor);
      const carryingColor = rgbToHex(params.carryingColor);
      const headColor = rgbToHex(darken(params.antColor, 0.35));
      const carryingHeadColor = rgbToHex(darken(params.carryingColor, 0.35));
      for (let pass = 0; pass < 2; pass++) {
        const isCarrying = pass === 1;
        antG.beginFill(isCarrying ? carryingColor : antColor);
        for (const a of frame.ants) {
          if (a.c > 0 !== isCarrying) continue;
          drawAntPolygonFromXYH(antG, a.x, a.y, a.h);
        }
        antG.endFill();
        antG.beginFill(isCarrying ? carryingHeadColor : headColor);
        for (const a of frame.ants) {
          if (a.c > 0 !== isCarrying) continue;
          drawAntHeadFromXYH(antG, a.x, a.y, a.h);
        }
        antG.endFill();
      }
    },
    drawPausedOverlay(width) {
      overlayG.clear();
      overlayG.beginFill(0x000000, 0.6);
      overlayG.drawRect(0, 0, width, 36);
      overlayG.endFill();
      if (!overlayG.children.includes(pausedLabel)) {
        overlayG.addChild(pausedLabel);
      }
    },
    clearPausedOverlay() {
      overlayG.clear();
      if (overlayG.children.includes(pausedLabel)) {
        overlayG.removeChild(pausedLabel);
      }
    },
    setBackgroundColor(rgb) {
      app.renderer.background.color = rgbToHex(rgb);
    },
    resize(w, h) {
      app.renderer.resize(w, h);
    },
    destroy() {
      app.destroy(true, { children: true, texture: true });
    },
  };
}

/**
 * Draw the static nest body (brown circle + entrance) once. Position
 * is set later via `setNest`.
 * @param {import("pixi.js").Graphics} g
 */
function drawNestBody(g) {
  g.beginFill(0x785028);
  g.drawCircle(0, 0, NEST_RADIUS);
  g.endFill();
  g.beginFill(0x4a3018);
  g.drawCircle(0, 0, NEST_RADIUS * 0.55);
  g.endFill();
}

/**
 * Draw a single ant as a triangle in world space. The triangle vertices
 * are pre-rotated and translated here because PixiJS Graphics applies
 * its own transform to the entire batch — setting position/rotation
 * per-polygon would re-transform all previously drawn ants.
 * @param {import("pixi.js").Graphics} g
 * @param {{pos: {x: number, y: number}, dir: {heading: () => number}}} ant
 */
function drawAntPolygon(g, ant) {
  const h = ant.dir.heading();
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  const px = ant.pos.x;
  const py = ant.pos.y;
  const tx = (x, y) => px + x * cos - y * sin;
  const ty = (x, y) => py + x * sin + y * cos;
  g.drawPolygon([
    tx(-ANT_TAIL_X, -ANT_BODY_HALF),
    ty(-ANT_TAIL_X, -ANT_BODY_HALF),
    tx(-ANT_TAIL_X, ANT_BODY_HALF),
    ty(-ANT_TAIL_X, ANT_BODY_HALF),
    tx(ANT_NOSE_X, 0),
    ty(ANT_NOSE_X, 0),
  ]);
}

/**
 * Draw a small dark head dot at the ant's front. Drawn as a separate
 * pass over a separate `beginFill` so the head color is independent
 * of the body color.
 * @param {import("pixi.js").Graphics} g
 * @param {{pos: {x: number, y: number}, dir: {heading: () => number}}} ant
 */
function drawAntHead(g, ant) {
  const h = ant.dir.heading();
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  const hx = ant.pos.x + ANT_NOSE_X * 0.85 * cos;
  const hy = ant.pos.y + ANT_NOSE_X * 0.85 * sin;
  g.drawCircle(hx, hy, 1.1);
}

/**
 * Variant of drawAntPolygon that takes pre-computed x, y, heading
 * instead of an ant object. Used by the recorder/playback path to
 * skip the per-ant method call.
 * @param {import("pixi.js").Graphics} g
 * @param {number} px
 * @param {number} py
 * @param {number} h
 */
function drawAntPolygonFromXYH(g, px, py, h) {
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  const tx = (x, y) => px + x * cos - y * sin;
  const ty = (x, y) => py + x * sin + y * cos;
  g.drawPolygon([
    tx(-ANT_TAIL_X, -ANT_BODY_HALF),
    ty(-ANT_TAIL_X, -ANT_BODY_HALF),
    tx(-ANT_TAIL_X, ANT_BODY_HALF),
    ty(-ANT_TAIL_X, ANT_BODY_HALF),
    tx(ANT_NOSE_X, 0),
    ty(ANT_NOSE_X, 0),
  ]);
}

function drawAntHeadFromXYH(g, px, py, h) {
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  g.drawCircle(px + ANT_NOSE_X * 0.85 * cos, py + ANT_NOSE_X * 0.85 * sin, 1.1);
}

/**
 * Darken an RGB tuple by a factor (0 = black, 1 = unchanged).
 * @param {[number, number, number]} rgb
 * @param {number} factor
 * @returns {[number, number, number]}
 */
function darken(rgb, factor) {
  return [
    Math.max(0, Math.floor(rgb[0] * (1 - factor))),
    Math.max(0, Math.floor(rgb[1] * (1 - factor))),
    Math.max(0, Math.floor(rgb[2] * (1 - factor))),
  ];
}

/**
 * Convert world (x, y) from a pointer event to logical world coordinates.
 * With autoDensity enabled, `canvas.width` is the backing buffer (CSS × dpr)
 * but the simulation lives in CSS-pixel space — so we map relative to the
 * CSS rect width, not the backing buffer.
 * @param {PointerEvent} event
 * @param {HTMLCanvasElement} canvas
 * @param {number} worldW
 * @param {number} worldH
 * @returns {{x: number, y: number}}
 */
export function pointerToWorld(event, canvas, worldW, worldH) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * worldW,
    y: ((event.clientY - rect.top) / rect.height) * worldH,
  };
}
