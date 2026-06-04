/**
 * Centralized constants and default parameters.
 *
 * Grouped by domain. Exported individually so importers can pull only
 * what they need; DEFAULT_PARAMS is the source of truth for slider
 * initial values and the "Reset params" button.
 */

export const PANEL_WIDTH = 280;
export const TARGET_FRAME_MS = 1000 / 60;

export const PHEROMONE_CELL_SIZE = 10;
export const PHEROMONE_FOOD_CHANNEL = "food";
export const PHEROMONE_HOME_CHANNEL = "home";

export const PHEROMONE_ACTIVE_THRESHOLD = 0.1;
export const PHEROMONE_DRAW_THRESHOLD = 0.5;
export const PHEROMONE_DRAW_ALPHA_MIN = 10;
export const PHEROMONE_DRAW_ALPHA_MAX = 180;
export const PHEROMONE_DRAW_BRIGHTNESS = 4;

export const NEST_RADIUS = 24;
export const NEST_RETURN_FORCE = 0.4;

export const FOOD_MERGE_DISTANCE = 20;
export const FOOD_PICKUP_DISTANCE = 10;
export const FOOD_CLICK_AMOUNT = 40;
export const FOOD_REMOVE_RADIUS = 18;
export const FOOD_SPAWN_MARGIN = 40;
export const MIN_FOOD_RADIUS = 4;
export const MAX_FOOD_RADIUS = 28;
export const FOOD_REGROWTH_DEFAULT = 0.0;

export const MASSIVE_FOOD_SOURCES = 10;
export const MASSIVE_FOOD_MIN_AMOUNT = 80;
export const MASSIVE_FOOD_MAX_AMOUNT = 200;

export const ANT_MIN_LIFESPAN = 4000;
export const ANT_MAX_LIFESPAN = 12000;
export const CARRYING_SPEED_FACTOR = 0.9;
export const TURN_LERP_BASE = 0.15;
export const PHEROMONE_NOISE_THRESHOLD = 1e-6;
export const RANDOM_TURN_SCALE = 0.6283185307179586; // 2π × 0.1

export const ANT_TAIL_X = 3;
export const ANT_BODY_HALF = 2;
export const ANT_NOSE_X = 4;

export const ANT_MAX_ENERGY = 100;
export const ANT_ENERGY_DECAY_PER_PX = 0.012;
export const ANT_ENERGY_GAIN_PER_FOOD = 35;
export const ANT_ENERGY_HOME_REFILL = 60;
export const ANT_ENERGY_DEATH_THRESHOLD = 1;
export const ANT_ENERGY_CRITICAL = 20;

export const FOOD_GRID_CELL_SIZE = 80;
export const FOOD_GRID_QUERY_CELLS = 2;

export const OBSTACLE_PICK_RADIUS = 20;

export const GRAPH_WIDTH = 248;
export const GRAPH_HEIGHT = 50;
export const GRAPH_CAPACITY = 120;

export const TOUCH_TAP_THRESHOLD_MS = 300;
export const TOUCH_TAP_THRESHOLD_PX = 10;

/**
 * Initial parameter set. Mirrors the slider defaults in index.html
 * (which the GUI re-applies on startup).
 */
export const DEFAULT_PARAMS = {
  antsCount: 700,
  antsCountMax: 2000,
  speed: 1.6,
  randomTurn: 0.5,
  evaporation: 0.97,
  deposit: 8,
  pheromoneInfluence: 2.0,
  senseRadius: 18,
  senseAngleDeg: 70,
  homeInfluence: 0.3,
  foodRegrowth: FOOD_REGROWTH_DEFAULT,
  obstaclesEnabled: true,
  showFoodPheromone: true,
  showHomePheromone: true,
  showTrails: false,
  foodColor: [60, 180, 60],
  foodPheromoneColor: [0, 180, 255],
  homePheromoneColor: [255, 180, 0],
  antColor: [200, 200, 200],
  carryingColor: [255, 200, 60],
  backgroundColor: [17, 17, 17],
};

/**
 * Convert a degree value to radians. Exists so callers don't need p5
 * globals (e.g. in tests).
 * @param {number} deg
 * @returns {number}
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}
