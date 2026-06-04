/**
 * Color palettes for color-blind friendly modes.
 *
 * Each palette defines a quintet of distinguishable colors for the
 * main UI elements. The default palette assumes normal trichromatic
 * vision; the deuteranopia and tritanopia palettes are based on the
 * well-known Wong (2011) and IBM colorblind-safe recommendations.
 *
 * @typedef {{ id: string, label: string, colors: {
 *   food: [number, number, number],
 *   foodPheromone: [number, number, number],
 *   homePheromone: [number, number, number],
 *   ant: [number, number, number],
 *   carrying: [number, number, number],
 *   background: [number, number, number],
 * } }} Palette
 */

/** @type {Record<string, Palette>} */
export const PALETTES = {
  default: {
    id: "default",
    label: "Predeterminado",
    colors: {
      food: [60, 180, 60],
      foodPheromone: [0, 180, 255],
      homePheromone: [255, 180, 0],
      ant: [200, 200, 200],
      carrying: [255, 200, 60],
      background: [17, 17, 17],
    },
  },
  deuteranopia: {
    id: "deuteranopia",
    label: "Deuteranopia (rojo-verde)",
    colors: {
      food: [0, 114, 178],
      foodPheromone: [213, 94, 0],
      homePheromone: [204, 121, 167],
      ant: [240, 228, 66],
      carrying: [230, 159, 0],
      background: [17, 17, 17],
    },
  },
  tritanopia: {
    id: "tritanopia",
    label: "Tritanopia (azul-amarillo)",
    colors: {
      food: [213, 94, 0],
      foodPheromone: [204, 121, 167],
      homePheromone: [240, 228, 66],
      ant: [86, 180, 233],
      carrying: [255, 200, 60],
      background: [17, 17, 17],
    },
  },
  highContrast: {
    id: "highContrast",
    label: "Alto contraste",
    colors: {
      food: [255, 255, 255],
      foodPheromone: [255, 80, 80],
      homePheromone: [80, 255, 80],
      ant: [255, 255, 0],
      carrying: [255, 120, 0],
      background: [0, 0, 0],
    },
  },
};

export const PALETTE_IDS = Object.keys(PALETTES);

/**
 * Apply a palette to a simulation, updating pheromone field colors and
 * param colors. Does NOT emit events — callers should re-sync their UI
 * via the simulation's existing reset/sync callbacks.
 * @param {import("./simulation.js").Simulation} sim
 * @param {string} paletteId
 */
export function applyPalette(sim, paletteId) {
  const palette = PALETTES[paletteId];
  if (!palette) return;
  const c = palette.colors;
  sim.params.foodColor = [...c.food];
  sim.params.foodPheromoneColor = [...c.foodPheromone];
  sim.params.homePheromoneColor = [...c.homePheromone];
  sim.params.antColor = [...c.ant];
  sim.params.carryingColor = [...c.carrying];
  sim.params.backgroundColor = [...c.background];
  sim.foodPheromones.setColor(c.foodPheromone);
  sim.homePheromones.setColor(c.homePheromone);
}
