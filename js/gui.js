export function setupGUI(sim) {
  const guiElements = {};
  const ids = [
    "antsCount",
    "speed",
    "randomTurn",
    "evaporation",
    "deposit",
    "pheromoneInfluence",
    "senseRadius",
    "senseAngle",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    guiElements[id] = el;
    const valSpan = document.getElementById(id + "Val");
    const updateVal = () => {
      valSpan.textContent = el.value;
      applyParam(sim, id, el.value);
    };
    el.addEventListener("input", updateVal);
    updateVal();
  });
  document
    .getElementById("resetBtn")
    .addEventListener("click", () =>
      sim.reset(() => parseInt(guiElements["antsCount"].value))
    );
  document
    .getElementById("clearPheromonesBtn")
    .addEventListener("click", () => sim.pheromones.clearAll());
  document.getElementById("spawnFoodBtn").addEventListener("click", () => {
    for (let i = 0; i < 10; i++) {
      const x = random(40, width - 40);
      const y = random(40, height - 40);
      sim.addFood(x, y, random(80, 200));
    }
  });
  return guiElements;
}
function applyParam(sim, key, value) {
  const v = parseFloat(value);
  switch (key) {
    case "antsCount":
      sim.setAntsCount(parseInt(value));
      break;
    case "speed":
      sim.params.speed = v;
      break;
    case "randomTurn":
      sim.params.randomTurn = v;
      break;
    case "evaporation":
      sim.params.evaporation = v;
      break;
    case "deposit":
      sim.params.deposit = v;
      break;
    case "pheromoneInfluence":
      sim.params.pheromoneInfluence = v;
      break;
    case "senseRadius":
      sim.params.senseRadius = v;
      break;
    case "senseAngle":
      sim.params.senseAngle = radians(v);
      break;
  }
}
export function updateStats(sim) {
  document.getElementById("fps").textContent = nf(frameRate(), 2, 1);
  document.getElementById("foodCount").textContent = sim.foodSources.length;
  document.getElementById("pheromoneCount").textContent =
    sim.pheromones.activeCount();
}
