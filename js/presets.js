/**
 * Curated parameter presets for quick experimentation.
 *
 * Each preset is a complete parameter set; missing keys fall back to
 * Simulation#params. Sliders in the UI are not pre-bound to preset values:
 * applyPreset() writes the values into the simulation, then the GUI is
 * notified to re-sync its inputs.
 */

export const PRESETS = {
  Exploración: {
    antsCount: 300,
    speed: 2.2,
    randomTurn: 0.4,
    evaporation: 0.92,
    deposit: 6,
    pheromoneInfluence: 1.4,
    senseRadius: 22,
    senseAngleDeg: 90,
    homeInfluence: 0.2,
    foodRegrowth: 0.0,
  },
  Persistente: {
    antsCount: 600,
    speed: 1.4,
    randomTurn: 0.15,
    evaporation: 0.985,
    deposit: 12,
    pheromoneInfluence: 2.5,
    senseRadius: 20,
    senseAngleDeg: 60,
    homeInfluence: 0.6,
    foodRegrowth: 0.0,
  },
  Denso: {
    antsCount: 800,
    speed: 1.0,
    randomTurn: 0.25,
    evaporation: 0.96,
    deposit: 10,
    pheromoneInfluence: 2.0,
    senseRadius: 16,
    senseAngleDeg: 70,
    homeInfluence: 0.4,
    foodRegrowth: 0.05,
  },
  Escasez: {
    antsCount: 150,
    speed: 1.6,
    randomTurn: 0.35,
    evaporation: 0.95,
    deposit: 20,
    pheromoneInfluence: 3.0,
    senseRadius: 26,
    senseAngleDeg: 80,
    homeInfluence: 0.5,
    foodRegrowth: 0.0,
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);
