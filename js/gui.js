import { DEFAULT_PARAMS } from "./constants.js";
import { PRESET_NAMES } from "./presets.js";
import { KEY_BINDINGS, findBinding } from "./input.js";
import { PALETTES, PALETTE_IDS, applyPalette } from "./palettes.js";

const PARAM_BINDINGS = {
  antsCount: { type: "int", apply: (sim, v) => sim.setAntsCount(v) },
  speed: { type: "float", target: "speed" },
  randomTurn: { type: "float", target: "randomTurn" },
  evaporation: { type: "float", target: "evaporation" },
  deposit: { type: "float", target: "deposit" },
  pheromoneInfluence: { type: "float", target: "pheromoneInfluence" },
  senseRadius: { type: "float", target: "senseRadius" },
  senseAngle: {
    type: "float",
    target: "senseAngle",
    transform: (v) => (v * Math.PI) / 180,
  },
  homeInfluence: { type: "float", target: "homeInfluence" },
  foodRegrowth: { type: "float", target: "foodRegrowth" },
  foodColor: { type: "color", target: "foodColor" },
  foodPheromoneColor: { type: "color", target: "foodPheromoneColor" },
  homePheromoneColor: { type: "color", target: "homePheromoneColor" },
  antColor: { type: "color", target: "antColor" },
  carryingColor: { type: "color", target: "carryingColor" },
};

const TOGGLE_BINDINGS = {
  showFoodPheromone: { target: "showFoodPheromone" },
  showHomePheromone: { target: "showHomePheromone" },
  obstaclesEnabled: { target: "obstaclesEnabled" },
  showTrails: { target: "showTrails" },
};

const PARAM_IDS = Object.keys(PARAM_BINDINGS);
const TOGGLE_IDS = Object.keys(TOGGLE_BINDINGS);

function readValue(el, type) {
  if (type === "int") return parseInt(el.value, 10);
  if (type === "color") return hexToRgb(el.value);
  return parseFloat(el.value);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function applyParam(sim, id, binding, onParamsChanged) {
  const input = document.getElementById(id);
  const value = readValue(input, binding.type);
  if (binding.apply) {
    binding.apply(sim, value);
  } else {
    const finalValue = binding.transform ? binding.transform(value) : value;
    sim.params[binding.target] = finalValue;
    if (id === "foodPheromoneColor") {
      sim.foodPheromones.setColor(finalValue);
    } else if (id === "homePheromoneColor") {
      sim.homePheromones.setColor(finalValue);
    }
  }
  syncNumericFromSlider(id, input.value);
  onParamsChanged();
}

function syncNumericFromSlider(sliderId, value) {
  const num = document.getElementById(sliderId + "Num");
  if (!num) return;
  if (value === undefined || value === null || value === "") return;
  if (num.type === "number" || num.type === "range") {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    const min = num.min !== "" ? Number(num.min) : -Infinity;
    const max = num.max !== "" ? Number(num.max) : Infinity;
    if (v < min) value = String(min);
    else if (v > max) value = String(max);
  }
  num.value = value;
}

function syncSliderFromNumeric(sliderId, numInput) {
  const slider = document.getElementById(sliderId);
  if (!slider) return false;
  let v = parseFloat(numInput.value);
  if (Number.isNaN(v)) return false;
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  if (v < min) v = min;
  if (v > max) v = max;
  slider.value = String(v);
  numInput.value = String(v);
  return true;
}

function bindSlider(sim, id, binding, onParamsChanged) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener("input", () =>
    applyParam(sim, id, binding, onParamsChanged)
  );
  const numInput = document.getElementById(id + "Num");
  if (numInput) {
    numInput.addEventListener("change", () => {
      if (syncSliderFromNumeric(id, numInput)) {
        applyParam(sim, id, binding, onParamsChanged);
      }
    });
    numInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") numInput.blur();
    });
  }
  applyParam(sim, id, binding, onParamsChanged);
}

function bindToggle(sim, id, binding, onParamsChanged) {
  const input = document.getElementById(id);
  if (!input) return;
  const apply = () => {
    sim.params[binding.target] = input.checked;
    onParamsChanged();
  };
  input.addEventListener("change", apply);
  apply();
}

function bindAction(id, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
}

function readAntsCountFromInput() {
  const el = document.getElementById("antsCount");
  return el ? parseInt(el.value, 10) : DEFAULT_PARAMS.antsCount;
}

function syncInputsFromParams(sim) {
  for (const id of PARAM_IDS) {
    const binding = PARAM_BINDINGS[id];
    const input = document.getElementById(id);
    if (!input) continue;
    let raw = sim.params[binding.target];
    if (raw === undefined || raw === null) continue;
    if (binding.transform && typeof raw === "number")
      raw = (raw * 180) / Math.PI;
    let value = binding.type === "color" ? rgbToHex(raw) : String(raw);
    if (input.type === "range" || input.type === "number") {
      const v = Number(value);
      if (Number.isFinite(v)) {
        const min = input.min !== "" ? Number(input.min) : -Infinity;
        const max = input.max !== "" ? Number(input.max) : Infinity;
        if (v < min) value = String(min);
        else if (v > max) value = String(max);
      }
    }
    input.value = value;
    syncNumericFromSlider(id, value);
  }
  for (const id of TOGGLE_IDS) {
    const input = document.getElementById(id);
    if (input) input.checked = sim.params[TOGGLE_BINDINGS[id].target];
  }
}

function setPresetOptions() {
  const select = document.getElementById("presetSelect");
  if (!select) return;
  select.innerHTML = '<option value="">— presets —</option>';
  for (const name of PRESET_NAMES) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
}

function bindKeyboardHelp() {
  const list = document.getElementById("shortcutsList");
  if (!list) return;
  list.innerHTML = KEY_BINDINGS.map(
    (b) =>
      `<li><kbd>${b.key === " " ? "Espacio" : b.key}</kbd> ${b.description}</li>`
  ).join("");
}

function wireTooltips() {
  const elements = document.querySelectorAll("[data-tooltip]");
  for (const el of elements) {
    const tip = el.dataset.tooltip;
    if (!tip) continue;
    el.title = tip;
  }
}

function wireCollapsibleSections() {
  const headings = document.querySelectorAll("h2.collapsible");
  for (const h of headings) {
    h.addEventListener("click", () => {
      const key = h.dataset.section;
      const body = document.querySelector(`[data-section-body="${key}"]`);
      if (!body) return;
      const collapsed = h.classList.toggle("collapsed");
      body.style.display = collapsed ? "none" : "";
    });
    h.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        h.click();
      }
    });
    h.tabIndex = 0;
    h.setAttribute("role", "button");
    h.setAttribute("aria-expanded", "true");
  }
}

function wireOnboarding(onDismiss) {
  const overlay = document.getElementById("onboarding");
  const btn = document.getElementById("onboardingDismiss");
  if (!overlay || !btn) return;
  if (localStorage.getItem("aco-onboarding-seen") === "1") {
    overlay.classList.add("hidden");
    return;
  }
  overlay.classList.remove("hidden");
  const dismiss = () => {
    overlay.classList.add("hidden");
    try {
      localStorage.setItem("aco-onboarding-seen", "1");
    } catch {
      // localStorage may be unavailable (file://, private mode, etc.)
    }
    onDismiss?.();
  };
  btn.addEventListener("click", dismiss);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });
}

/**
 * Build the GUI and wire all DOM bindings to the simulation.
 * @param {import("./simulation.js").Simulation} sim
 * @param {object} [options]
 * @param {(rgb: [number, number, number]) => void} [options.onBgChange]
 *   Called when the background color param changes.
 * @param {() => void} [options.onParamsChanged]
 *   Called whenever any param changes (debounced by the caller).
 * @returns {object} handle exposing panel/theme/reset for the keyboard layer
 */
export function setupGUI(sim, options = {}) {
  const onParamsChanged = options.onParamsChanged || (() => {});

  for (const id of PARAM_IDS)
    bindSlider(sim, id, PARAM_BINDINGS[id], onParamsChanged);
  for (const id of TOGGLE_IDS)
    bindToggle(sim, id, TOGGLE_BINDINGS[id], onParamsChanged);
  bindAction("resetBtn", () => sim.reset(readAntsCountFromInput));
  bindAction("resetParamsBtn", () => {
    sim.resetParams();
    syncInputsFromParams(sim);
    options.onBgChange?.(sim.params.backgroundColor);
    onParamsChanged();
  });
  bindAction("clearPheromonesBtn", () => {
    sim.foodPheromones.clearAll();
    sim.homePheromones.clearAll();
  });
  bindAction("spawnFoodBtn", () => sim.spawnFoodClusters());
  bindAction("addWalkersBtn", () =>
    sim.setWalkersCount(sim.walkers.length + 100)
  );
  bindAction("removeWalkersBtn", () =>
    sim.setWalkersCount(Math.max(0, sim.walkers.length - 100))
  );
  bindAction("recBtn", () => options.onRecToggle?.());
  bindAction("playRecBtn", () => options.onPlayRec?.());
  bindAction("stopRecBtn", () => options.onStopRec?.());
  bindAction("pauseBtn", () => sim.togglePause());
  bindAction("stepBtn", () => sim.step());
  bindAction("panelToggle", () => handle.togglePanel());
  bindAction("themeToggle", () => handle.toggleTheme());

  const presetSelect = document.getElementById("presetSelect");
  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      const name = presetSelect.value;
      if (!name) return;
      const ok = sim.applyPreset(name, readAntsCountFromInput);
      if (ok) {
        syncInputsFromParams(sim);
        options.onBgChange?.(sim.params.backgroundColor);
        onParamsChanged();
      }
      presetSelect.value = "";
    });
  }

  const paletteSelect = document.getElementById("paletteSelect");
  if (paletteSelect) {
    paletteSelect.innerHTML = PALETTE_IDS.map(
      (id) => `<option value="${id}">${PALETTES[id].label}</option>`
    ).join("");
    paletteSelect.addEventListener("change", () => {
      const id = paletteSelect.value;
      if (!id) return;
      applyPalette(sim, id);
      syncInputsFromParams(sim);
      options.onBgChange?.(sim.params.backgroundColor);
      onParamsChanged();
    });
  }

  setPresetOptions();
  bindKeyboardHelp();
  wireTooltips();
  wireCollapsibleSections();

  sim.on("presetApplied", () => {
    syncInputsFromParams(sim);
    options.onBgChange?.(sim.params.backgroundColor);
    onParamsChanged();
  });
  sim.on("paramsReset", () => {
    syncInputsFromParams(sim);
    options.onBgChange?.(sim.params.backgroundColor);
    onParamsChanged();
  });
  sim.on("pauseChanged", ({ paused }) => {
    const btn = document.getElementById("pauseBtn");
    if (btn) btn.textContent = paused ? "▶ Reanudar" : "⏸ Pausa";
  });
  sim.on("reset", () => {
    syncInputsFromParams(sim);
    options.onBgChange?.(sim.params.backgroundColor);
  });

  const handle = {
    reset: () => {
      sim.reset(readAntsCountFromInput);
    },
    togglePanel: () => {
      const panel = document.getElementById("panel");
      const btn = document.getElementById("panelToggle");
      panel?.classList.toggle("collapsed");
      btn?.classList.toggle("active", panel?.classList.contains("collapsed"));
    },
    toggleTheme: () => {
      const root = document.documentElement;
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      const btn = document.getElementById("themeToggle");
      if (btn) btn.textContent = next === "light" ? "☾" : "☀";
    },
    handleKey: (key) => {
      const b = findBinding(key);
      if (b) b.handler(sim, handle);
    },
    showOnboarding: () => wireOnboarding(),
  };

  return handle;
}

/**
 * Update the live stats in the panel.
 * @param {import("./simulation.js").Simulation} sim
 * @param {import("./stats-graph.js").StatsGraph} [graph]
 * @param {number} [fps] Current frame rate (passed in by the main loop).
 * @param {number} [quality] Current pheromone render stride (1, 2, or 4).
 */
export function updateStats(sim, graph, fps, quality = 1) {
  const fpsText = (fps || 0).toFixed(1);
  const qualitySuffix = quality > 1 ? ` · Q${quality}x` : "";
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("fps", fpsText + qualitySuffix);
  setText("foodCount", sim.foodSources.length);
  setText("antCount", sim.ants.length);
  const pCount =
    sim.foodPheromones.activeCount() + sim.homePheromones.activeCount();
  setText("pheromoneCount", pCount);
  const stats = sim.getStats();
  setText("foodCollected", stats.foodCollected);
  setText("foodCollectedWalkers", stats.foodCollectedWalkers);
  setText("antDeaths", stats.deaths);
  setText("antDeathsAge", stats.deathsByOldAge);
  setText("antDeathsHunger", stats.deathsByStarvation);
  setText("meanEnergy", Math.round(stats.meanEnergy));
  if (graph) {
    graph.pushFps(fps || 0);
    graph.pushFood(sim.foodSources.length);
    graph.render(60, 50);
  }
}
