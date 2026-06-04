import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { PALETTES, PALETTE_IDS, applyPalette } = await import("../palettes.js");
const { Simulation } = await import("../simulation.js");

test("all palettes have the required color slots", () => {
  for (const id of PALETTE_IDS) {
    const c = PALETTES[id].colors;
    assert.ok(Array.isArray(c.food) && c.food.length === 3, `${id}.food`);
    assert.ok(Array.isArray(c.foodPheromone) && c.foodPheromone.length === 3);
    assert.ok(Array.isArray(c.homePheromone) && c.homePheromone.length === 3);
    assert.ok(Array.isArray(c.ant) && c.ant.length === 3);
    assert.ok(Array.isArray(c.carrying) && c.carrying.length === 3);
    assert.ok(Array.isArray(c.background) && c.background.length === 3);
  }
});

test("PALETTE_IDS lists all palettes", () => {
  for (const id of ["default", "deuteranopia", "tritanopia", "highContrast"]) {
    assert.ok(PALETTES[id], `missing palette ${id}`);
  }
});

test("applyPalette updates sim params and pheromone fields", () => {
  const sim = new Simulation(800, 600);
  applyPalette(sim, "deuteranopia");
  const c = PALETTES.deuteranopia.colors;
  assert.deepEqual(sim.params.foodColor, c.food);
  assert.deepEqual(sim.params.foodPheromoneColor, c.foodPheromone);
  assert.deepEqual(sim.params.homePheromoneColor, c.homePheromone);
  assert.deepEqual(sim.params.antColor, c.ant);
  assert.deepEqual(sim.params.carryingColor, c.carrying);
  assert.deepEqual(sim.params.backgroundColor, c.background);
});

test("applyPalette with unknown id is a no-op", () => {
  const sim = new Simulation(800, 600);
  const before = [...sim.params.foodColor];
  applyPalette(sim, "nonexistent");
  assert.deepEqual(sim.params.foodColor, before);
});
