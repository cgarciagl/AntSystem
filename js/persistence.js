/**
 * Persist user-tunable parameters to localStorage so they survive
 * page reloads. Params are stored under a single key as a JSON object.
 *
 * The implementation is fault-tolerant: corrupt JSON, missing fields,
 * or unavailable localStorage (file://, private mode) are all treated
 * as "no saved state" rather than throwing.
 */

const STORAGE_KEY = "aco-params-v1";

/**
 * The set of param keys that are persisted. Excludes derived / volatile
 * fields that don't make sense to restore (e.g. stats counters).
 */
const PERSISTED_KEYS = [
  "speed",
  "randomTurn",
  "evaporation",
  "deposit",
  "pheromoneInfluence",
  "senseRadius",
  "senseAngle",
  "homeInfluence",
  "foodRegrowth",
  "obstaclesEnabled",
  "showFoodPheromone",
  "showHomePheromone",
  "showTrails",
  "foodColor",
  "foodPheromoneColor",
  "homePheromoneColor",
  "antColor",
  "carryingColor",
  "backgroundColor",
];

/**
 * @returns {object|null} Saved params, or null when nothing is stored /
 *   storage is unavailable.
 */
export function loadParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save a snapshot of `sim.params` to localStorage. Only the keys listed
 * in PERSISTED_KEYS are stored; everything else (counters, derived
 * state) is intentionally ignored.
 * @param {import("./simulation.js").Simulation} sim
 */
export function saveParams(sim) {
  try {
    const snapshot = {};
    for (const key of PERSISTED_KEYS) {
      const v = sim.params[key];
      snapshot[key] = Array.isArray(v) ? [...v] : v;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may be unavailable (file://, private mode, quota)
  }
}

/**
 * Merge saved params into sim.params, keeping current values when
 * the saved snapshot is missing a key. Returns true if anything was
 * restored.
 * @param {import("./simulation.js").Simulation} sim
 * @param {object} saved
 * @returns {boolean}
 */
export function applySavedParams(sim, saved) {
  if (!saved) return false;
  let changed = false;
  for (const key of PERSISTED_KEYS) {
    if (!(key in saved)) continue;
    const v = saved[key];
    if (Array.isArray(v)) {
      sim.params[key] = [...v];
    } else {
      sim.params[key] = v;
    }
    changed = true;
  }
  return changed;
}

/**
 * Wipe the persisted snapshot (used by the reset button).
 */
export function clearParams() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Wrap a save function in a debouncer so rapid param changes don't
 * hammer localStorage on every pixel of slider movement.
 * @param {(sim: import("./simulation.js").Simulation) => void} save
 * @param {number} [ms=300]
 * @returns {{ schedule: (sim: import("./simulation.js").Simulation) => void, cancel: () => void }}
 */
export function debounceSave(save, ms = 300) {
  let timer = null;
  return {
    schedule(sim) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        save(sim);
      }, ms);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
