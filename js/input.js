/**
 * Centralized keyboard shortcut bindings.
 *
 * Each binding is a `(sim) => void` handler; the dispatch layer
 * (main.js) wires p5's keyPressed to dispatch().
 */
export const KEY_BINDINGS = [
  {
    key: " ",
    description: "Pausa / reanuda",
    handler: (sim) => sim.togglePause(),
  },
  {
    key: "s",
    description: "Avanza un paso (en pausa)",
    handler: (sim) => sim.step(),
  },
  {
    key: "r",
    description: "Reset completo",
    handler: (sim, gui) => gui.reset(),
  },
  {
    key: "c",
    description: "Limpia feromonas",
    handler: (sim) => sim.pheromones.clearAll(),
  },
  {
    key: "f",
    description: "Añade comida masiva",
    handler: (sim) => sim.spawnFoodClusters(),
  },
  {
    key: "h",
    description: "Muestra/oculta panel",
    handler: (_sim, gui) => gui.togglePanel(),
  },
  {
    key: "t",
    description: "Cambia tema claro/oscuro",
    handler: (_sim, gui) => gui.toggleTheme(),
  },
  {
    key: "ArrowRight",
    description: "Avanza un paso (en pausa)",
    handler: (sim) => sim.step(),
  },
];

/**
 * Find a binding by key string (case-insensitive, ignores "Arrow" prefix).
 * @param {string} key
 * @returns {object|undefined}
 */
export function findBinding(key) {
  const norm = key.length === 1 ? key.toLowerCase() : key;
  return KEY_BINDINGS.find((b) => b.key === norm || b.key === key);
}
