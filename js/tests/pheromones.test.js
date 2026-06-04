import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { PheromoneField } = await import("../pheromones.js");

test("PheromoneField initializes with zeroed cells", () => {
  const f = new PheromoneField(100, 100, 10);
  assert.equal(f.cols, 10);
  assert.equal(f.rows, 10);
  for (let i = 0; i < f.field.length; i++) {
    assert.equal(f.field[i], 0);
  }
});

test("deposit adds to the correct cell", () => {
  const f = new PheromoneField(100, 100, 10);
  f.deposit(15, 25, 5);
  assert.equal(f.field[f.index(1, 2)], 5);
});

test("deposit clamps out-of-range coordinates to nearest cell", () => {
  const f = new PheromoneField(100, 100, 10);
  f.deposit(-100, -100, 3);
  assert.equal(f.field[f.index(0, 0)], 3);
  f.deposit(1000, 1000, 4);
  assert.equal(f.field[f.index(f.cols - 1, f.rows - 1)], 4);
});

test("sample returns 0 outside world bounds", () => {
  const f = new PheromoneField(100, 100, 10);
  assert.equal(f.sample(-1, 50), 0);
  assert.equal(f.sample(50, 200), 0);
});

test("sample returns the deposited value", () => {
  const f = new PheromoneField(100, 100, 10);
  f.deposit(15, 25, 7);
  assert.equal(f.sample(15, 25), 7);
});

test("evaporate spreads value to neighbors (diffusion)", () => {
  const f = new PheromoneField(30, 30, 10);
  f.deposit(15, 15, 100);
  f.evaporate(0);
  const neighbors = [
    f.field[f.index(0, 1)],
    f.field[f.index(1, 0)],
    f.field[f.index(1, 2)],
    f.field[f.index(2, 1)],
  ];
  assert.ok(
    neighbors.some((v) => v > 0),
    "neighbors receive value via diffusion"
  );
  assert.ok(f.field[f.index(1, 1)] < 100, "center value diluted by diffusion");
});

test("evaporate reduces individual cell values (decay)", () => {
  const f = new PheromoneField(30, 30, 10);
  f.deposit(15, 15, 100);
  f.evaporate(0.1);
  for (let i = 0; i < f.field.length; i++) {
    assert.ok(f.field[i] <= 100, "no cell exceeds the original peak");
  }
  const center = f.field[f.index(1, 1)];
  assert.ok(center < 100, "center value decays");
  assert.ok(center > 0, "center retains some value");
});

test("clearAll zeros the field and buffer", () => {
  const f = new PheromoneField(30, 30, 10);
  f.deposit(15, 15, 5);
  f.clearAll();
  for (let i = 0; i < f.field.length; i++) {
    assert.equal(f.field[i], 0);
  }
});

test("activeCount counts cells above threshold", () => {
  const f = new PheromoneField(30, 30, 10);
  assert.equal(f.activeCount(), 0);
  f.deposit(15, 15, 1);
  assert.equal(f.activeCount(), 1);
  f.deposit(5, 5, 0.05);
  assert.equal(f.activeCount(), 1, "values below threshold are not counted");
});

test("resize clears and recomputes dimensions", () => {
  const f = new PheromoneField(100, 100, 10);
  f.deposit(15, 15, 5);
  f.resize(200, 200);
  assert.equal(f.cols, 20);
  assert.equal(f.rows, 20);
  for (let i = 0; i < f.field.length; i++) {
    assert.equal(f.field[i], 0);
  }
});
