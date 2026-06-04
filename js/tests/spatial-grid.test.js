import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { SpatialGrid } = await import("../spatial-grid.js");

test("SpatialGrid has correct dimensions", () => {
  const g = new SpatialGrid(800, 600, 80);
  assert.equal(g.cols, 10);
  assert.equal(g.rows, 8);
  assert.equal(g.cells.length, 80);
});

test("insert places items in the correct cell", () => {
  const g = new SpatialGrid(800, 600, 80);
  const item = { pos: { x: 50, y: 50 } };
  g.insert(item);
  assert.equal(g.cells[g.key(0, 0)].length, 1);
});

test("out-of-bounds items are dropped silently", () => {
  const g = new SpatialGrid(800, 600, 80);
  g.insert({ pos: { x: -10, y: -10 } });
  g.insert({ pos: { x: 1000, y: 1000 } });
  for (const cell of g.cells) {
    assert.equal(cell.length, 0);
  }
});

test("items with NaN positions are dropped silently", () => {
  const g = new SpatialGrid(800, 600, 80);
  g.insert({ pos: { x: NaN, y: 50 } });
  g.insert({ pos: { x: 50, y: NaN } });
  g.insert({ pos: { x: NaN, y: NaN } });
  for (const cell of g.cells) {
    assert.equal(cell.length, 0);
  }
});

test("queryNeighbors returns items in 3x3 neighborhood", () => {
  const g = new SpatialGrid(800, 600, 80);
  const a = { id: "a", pos: { x: 50, y: 50 } };
  const b = { id: "b", pos: { x: 130, y: 50 } };
  const c = { id: "c", pos: { x: 500, y: 500 } };
  g.insert(a);
  g.insert(b);
  g.insert(c);
  const result = g.queryNeighbors(80, 60, 1);
  assert.equal(result.length, 2);
  assert.ok(result.includes(a));
  assert.ok(result.includes(b));
});

test("queryNeighbors with larger radius", () => {
  const g = new SpatialGrid(1600, 1200, 80);
  const a = { id: "a", pos: { x: 50, y: 50 } };
  const b = { id: "b", pos: { x: 700, y: 500 } };
  g.insert(a);
  g.insert(b);
  const nearby = g.queryNeighbors(80, 60, 1);
  const all = g.queryNeighbors(80, 60, 12);
  assert.equal(nearby.length, 1);
  assert.equal(all.length, 2);
});

test("clear empties all cells", () => {
  const g = new SpatialGrid(800, 600, 80);
  g.insert({ pos: { x: 50, y: 50 } });
  g.insert({ pos: { x: 200, y: 200 } });
  g.clear();
  for (const cell of g.cells) {
    assert.equal(cell.length, 0);
  }
});

test("resize clears items and recomputes cells", () => {
  const g = new SpatialGrid(800, 600, 80);
  g.insert({ pos: { x: 50, y: 50 } });
  g.resize(1600, 1200);
  assert.equal(g.cols, 20);
  assert.equal(g.rows, 15);
  for (const cell of g.cells) {
    assert.equal(cell.length, 0);
  }
});
