import { Simulation } from "./simulation.js";
import {
  PANEL_WIDTH,
  GRAPH_WIDTH,
  GRAPH_HEIGHT,
  GRAPH_CAPACITY,
} from "./constants.js";
import { setupGUI, updateStats } from "./gui.js";
import { StatsGraph } from "./stats-graph.js";
import { createRenderer, pointerToWorld } from "./renderer.js";
import {
  loadParams,
  saveParams,
  applySavedParams,
  debounceSave,
} from "./persistence.js";
import { createRecorder, createPlayback } from "./recorder.js";

let sim;
let gui;
let renderer;
let graph;
const recorder = createRecorder();
let playback = null;
let recording = false;
let isPlayingBack = false;

function getPanelWidth() {
  const panel = document.getElementById("panel");
  return panel ? panel.getBoundingClientRect().width : PANEL_WIDTH;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;
  navigator.serviceWorker.register("./sw.js").catch((err) => {
    console.warn("Service worker registration failed:", err);
  });
}

function getCanvasWorld(event) {
  const canvas = renderer.app.view ?? renderer.app.canvas;
  return pointerToWorld(event, canvas, sim.width, sim.height);
}

async function bootstrap() {
  const wrapper = document.getElementById("canvas-wrapper");
  const w = window.innerWidth - getPanelWidth();
  const h = window.innerHeight;
  sim = new Simulation(w, h);
  const saved = loadParams();
  if (saved) {
    applySavedParams(sim, saved);
    sim.foodPheromones.setColor(sim.params.foodPheromoneColor);
    sim.homePheromones.setColor(sim.params.homePheromoneColor);
  }
  renderer = await createRenderer(wrapper, w, h, sim.params.backgroundColor);
  const debouncedSave = debounceSave(saveParams, 300);
  gui = setupGUI(sim, {
    onBgChange: (rgb) => renderer.setBackgroundColor(rgb),
    onParamsChanged: () => debouncedSave.schedule(sim),
    onRecToggle: () => toggleRecording(),
    onPlayRec: () => playRecording(),
    onStopRec: () => stopRecording(),
  });
  graph = new StatsGraph(GRAPH_WIDTH, GRAPH_HEIGHT, GRAPH_CAPACITY);
  const graphCanvas = document.getElementById("statsGraph");
  if (graphCanvas) graph.attachCanvas(graphCanvas);
  setupInput(renderer.app.view ?? renderer.app.canvas);
  gui.showOnboarding();
  registerServiceWorker();
  startLoop();
}

function setupInput(canvas) {
  let isPointerDown = false;

  canvas.addEventListener("pointerdown", (e) => {
    isPointerDown = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasWorld(e);
    if (e.altKey) {
      const ant = sim.followNearestAnt(x, y);
      if (ant) e.preventDefault();
      return;
    }
    sim.handlePointerDown(x, y, e.ctrlKey, e.shiftKey);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;
    const { x, y } = getCanvasWorld(e);
    sim.handlePointerMove(x, y);
  });
  canvas.addEventListener("pointerup", (e) => {
    isPointerDown = false;
    canvas.releasePointerCapture(e.pointerId);
    sim.releaseNest();
  });
  canvas.addEventListener("pointercancel", () => {
    isPointerDown = false;
    sim.releaseNest();
  });
  canvas.addEventListener("dblclick", () => {
    sim.handleDoubleClick();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "F5") return;
    if (
      e.target instanceof HTMLElement &&
      (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
    ) {
      return;
    }
    if (e.key === "Escape" && sim?.followedAnt) {
      sim.unfollowAnt();
      return;
    }
    if (e.key === "g" || e.key === "G") {
      toggleRecording();
      return;
    }
    if (e.key === "p" || e.key === "P") {
      if (isPlayingBack) stopRecording();
      else playRecording();
      return;
    }
    gui?.handleKey(e.key);
  });
  window.addEventListener("resize", () => {
    const nw = window.innerWidth - getPanelWidth();
    const nh = window.innerHeight;
    renderer.resize(nw, nh);
    sim.resize(nw, nh);
  });
}

function startLoop() {
  let lastTime = performance.now();
  let smoothedFps = 60;
  let lastAdaptCheck = 0;
  // PixiJS v7: ticker callback receives a number (deltaTime, normalized).
  // The actual ms delta is available on the ticker instance after update().
  const ticker = renderer.app.ticker;
  ticker.add(() => {
    const dtMs = ticker.deltaMS;
    if (!isPlayingBack) {
      sim.setDeltaTime(dtMs);
      sim.update();
      if (recording) recorder.push(sim);
    }
    renderFrame();
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    const instFps = dt > 0 ? 1000 / dt : 60;
    smoothedFps = smoothedFps * 0.9 + instFps * 0.1;
    if (now - lastAdaptCheck > 2000) {
      lastAdaptCheck = now;
      adaptQuality(smoothedFps);
    }
    updateStats(sim, graph, smoothedFps, renderer.pheromoneStride);
    updateRecButtons();
  });
}

function updateRecButtons() {
  const recBtn = document.getElementById("recBtn");
  const playBtn = document.getElementById("playRecBtn");
  const stopBtn = document.getElementById("stopRecBtn");
  if (recBtn) {
    recBtn.textContent = recording ? "■ Rec" : "● Rec";
    recBtn.classList.toggle("active", recording);
  }
  if (playBtn) {
    playBtn.disabled = recorder.count() === 0;
    playBtn.textContent = isPlayingBack ? "▶ Reproduciendo" : "▶ Play";
  }
  if (stopBtn) {
    stopBtn.disabled = !isPlayingBack && recorder.count() === 0;
  }
}

function toggleRecording() {
  if (isPlayingBack) playback?.stop();
  isPlayingBack = false;
  recording = !recording;
  if (!recording) {
    if (recorder.count() === 0) return;
    playback = createPlayback(recorder.frames, (frame) => {
      renderer.renderFrame(frame, sim.params);
    });
  } else {
    recorder.clear();
  }
}

function playRecording() {
  if (recorder.count() === 0) return;
  recording = false;
  sim.paused = true;
  isPlayingBack = true;
  if (!playback) {
    playback = createPlayback(recorder.frames, (frame) => {
      renderer.renderFrame(frame, sim.params);
    });
  }
  playback.play();
}

function stopRecording() {
  playback?.stop();
  isPlayingBack = false;
  sim.paused = false;
}

/**
 * Adjust render quality (currently: pheromone cell stride) based on
 * measured FPS. Hysteresis is built in via the two thresholds.
 * @param {number} fps
 */
function adaptQuality(fps) {
  if (!renderer) return;
  if (fps < 30 && renderer.pheromoneStride < 4) {
    renderer.setPheromoneStride(renderer.pheromoneStride * 2);
  } else if (fps > 50 && renderer.pheromoneStride > 1) {
    renderer.setPheromoneStride(Math.max(1, renderer.pheromoneStride / 2));
  }
}

function renderFrame() {
  renderer.setNest(sim.nest);
  renderer.setObstacles(sim.obstacles);
  renderer.setFood(sim.foodSources);
  if (sim.params.showFoodPheromone) {
    renderer.drawPheromones(
      sim.foodPheromones,
      renderer.layers.foodPheromoneG,
      renderer.pheromoneStride
    );
  } else {
    renderer.layers.foodPheromoneG.clear();
  }
  if (sim.params.showHomePheromone) {
    renderer.drawPheromones(
      sim.homePheromones,
      renderer.layers.homePheromoneG,
      renderer.pheromoneStride
    );
  } else {
    renderer.layers.homePheromoneG.clear();
  }
  if (sim.params.showTrails) {
    renderer.drawTrails(sim.ants);
  } else {
    renderer.layers.trailG.clear();
  }
  renderer.drawAnts(sim.ants, sim.params, sim.walkers);
  renderer.drawParticles(sim.particles);
  if (sim.followedAnt && sim.followedAnt.alive) {
    renderer.drawFollowedHighlight(sim.followedAnt);
  } else {
    renderer.clearFollowedHighlight();
  }
  if (sim.paused) {
    renderer.drawPausedOverlay(sim.width);
  } else {
    renderer.clearPausedOverlay();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
