import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    has: (k) => store.has(k),
  };
})();

const { loadParams, saveParams, applySavedParams, clearParams, debounceSave } =
  await import("../persistence.js");
const { Simulation } = await import("../simulation.js");

test("loadParams returns null when nothing is stored", () => {
  // Ensure clean state
  try {
    localStorage.removeItem("aco-params-v1");
  } catch {
    // ignore
  }
  assert.equal(loadParams(), null);
});

test("saveParams then loadParams roundtrips the snapshot", () => {
  const sim = new Simulation(800, 600);
  sim.params.speed = 2.5;
  sim.params.deposit = 12;
  sim.params.foodColor = [10, 20, 30];
  saveParams(sim);
  const loaded = loadParams();
  assert.equal(loaded.speed, 2.5);
  assert.equal(loaded.deposit, 12);
  assert.deepEqual(loaded.foodColor, [10, 20, 30]);
});

test("applySavedParams updates sim.params", () => {
  const sim = new Simulation(800, 600);
  const changed = applySavedParams(sim, {
    speed: 3.0,
    randomTurn: 0.2,
    foodColor: [1, 2, 3],
  });
  assert.equal(changed, true);
  assert.equal(sim.params.speed, 3.0);
  assert.equal(sim.params.randomTurn, 0.2);
  assert.deepEqual(sim.params.foodColor, [1, 2, 3]);
});

test("applySavedParams ignores unknown keys", () => {
  const sim = new Simulation(800, 600);
  const beforeSpeed = sim.params.speed;
  const changed = applySavedParams(sim, { unknownKey: 99, speed: 1.1 });
  assert.equal(changed, true);
  assert.notEqual(sim.params.speed, beforeSpeed);
  assert.equal(sim.params.unknownKey, undefined);
});

test("clearParams removes the snapshot", () => {
  const sim = new Simulation(800, 600);
  saveParams(sim);
  clearParams();
  assert.equal(loadParams(), null);
});

test("debounceSave coalesces rapid saves into one", async () => {
  const sim = new Simulation(800, 600);
  clearParams();
  let saves = 0;
  const wrapped = debounceSave(() => {
    saves++;
    saveParams(sim);
  }, 20);
  for (let i = 0; i < 5; i++) wrapped.schedule(sim);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(saves, 1);
  wrapped.cancel();
});
