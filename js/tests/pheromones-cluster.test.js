import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { PheromoneField } = await import("../pheromones.js");

test("depositCluster adds to a (2r+1)x(2r+1) cell neighborhood", () => {
  const f = new PheromoneField(100, 100, 10);
  f.depositCluster(50, 50, 10, 2);
  let total = 0;
  for (let v of f.field) total += v;
  assert.equal(total, 10 * 25);
});

test("depositCluster at the edge of the world clamps gracefully", () => {
  const f = new PheromoneField(100, 100, 10);
  f.depositCluster(0, 0, 10, 2);
  let total = 0;
  for (let v of f.field) total += v;
  assert.ok(total > 0);
  assert.ok(total <= 10 * 25);
});

test("deposit at a single cell only touches one cell", () => {
  const f = new PheromoneField(100, 100, 10);
  f.deposit(55, 55, 10);
  let nonZero = 0;
  for (let v of f.field) if (v !== 0) nonZero++;
  assert.equal(nonZero, 1);
});
