import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { degToRad, DEFAULT_PARAMS, PHEROMONE_CELL_SIZE } =
  await import("../constants.js");

test("degToRad converts correctly", () => {
  assert.ok(Math.abs(degToRad(0)) < 1e-9);
  assert.ok(Math.abs(degToRad(180) - Math.PI) < 1e-9);
  assert.ok(Math.abs(degToRad(90) - Math.PI / 2) < 1e-9);
});

test("DEFAULT_PARAMS exposes a valid initial state", () => {
  assert.ok(DEFAULT_PARAMS.antsCount > 0);
  assert.ok(DEFAULT_PARAMS.evaporation > 0 && DEFAULT_PARAMS.evaporation < 1);
  assert.ok(Array.isArray(DEFAULT_PARAMS.foodColor));
  assert.equal(DEFAULT_PARAMS.foodColor.length, 3);
});

test("critical constants are positive", () => {
  assert.ok(PHEROMONE_CELL_SIZE > 0);
});
