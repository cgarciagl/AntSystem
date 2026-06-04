import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { createRecorder, createPlayback } = await import("../recorder.js");
const { Simulation } = await import("../simulation.js");

test("createRecorder starts empty", () => {
  const r = createRecorder();
  assert.equal(r.count(), 0);
  assert.equal(r.frames.length, 0);
});

test("recorder.push captures a frame from a simulation", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(3);
  const r = createRecorder();
  r.push(sim);
  assert.equal(r.count(), 1);
  const f = r.frames[0];
  assert.equal(f.ants.length, 3);
  for (const a of f.ants) {
    assert.equal(typeof a.x, "number");
    assert.equal(typeof a.y, "number");
    assert.equal(typeof a.h, "number");
    assert.equal(a.c, 0);
    assert.equal(a.e, 100);
  }
});

test("recorder frames also capture food and obstacles", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 30);
  sim.addObstacle(500, 500, 25);
  const r = createRecorder();
  r.push(sim);
  const f = r.frames[0];
  assert.equal(f.food.length, 1);
  assert.equal(f.food[0].x, 100);
  assert.equal(f.food[0].a, 30);
  assert.equal(f.obstacles.length, 1);
  assert.equal(f.obstacles[0].r, 25);
});

test("recorder drops the oldest frame when at capacity", () => {
  const sim = new Simulation(800, 600);
  const r = createRecorder();
  for (let i = 0; i < 605; i++) r.push(sim);
  assert.equal(r.count(), 600);
});

test("recorder.clear empties the buffer", () => {
  const sim = new Simulation(800, 600);
  const r = createRecorder();
  r.push(sim);
  r.push(sim);
  assert.equal(r.count(), 2);
  r.clear();
  assert.equal(r.count(), 0);
});

test("playback invokes onFrame for each frame in order", () => {
  const frames = [
    { t: 100, ants: [], food: [], obstacles: [] },
    { t: 110, ants: [], food: [], obstacles: [] },
    { t: 120, ants: [], food: [], obstacles: [] },
  ];
  const seen = [];
  const pb = createPlayback(frames, (f) => seen.push(f.t));
  pb.play();
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.deepEqual(seen, [100, 110, 120]);
      resolve();
    }, 100);
  });
});

test("playback.stop() halts playback", () => {
  const frames = [
    { t: 0, ants: [], food: [], obstacles: [] },
    { t: 1000, ants: [], food: [], obstacles: [] },
  ];
  const seen = [];
  const pb = createPlayback(frames, (f) => seen.push(f.t));
  pb.play();
  setTimeout(() => pb.stop(), 10);
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(seen.length, 1);
      assert.equal(pb.isPlaying(), false);
      resolve();
    }, 50);
  });
});

test("playback.isPlaying reflects current state", () => {
  const frames = [{ t: 0, ants: [], food: [], obstacles: [] }];
  const pb = createPlayback(frames, () => {});
  assert.equal(pb.isPlaying(), false);
  pb.play();
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(pb.isPlaying(), false);
      resolve();
    }, 20);
  });
});
