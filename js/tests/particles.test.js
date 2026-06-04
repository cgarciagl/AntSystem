import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { ParticleSystem } = await import("../particles.js");

test("ParticleSystem starts empty", () => {
  const fx = new ParticleSystem();
  assert.equal(fx.particles.length, 0);
});

test("emit spawns the requested number of particles", () => {
  const fx = new ParticleSystem();
  fx.emit(10, 20, [255, 0, 0], 5);
  assert.equal(fx.particles.length, 5);
  for (const p of fx.particles) {
    assert.equal(p.x, 10);
    assert.equal(p.y, 20);
    assert.equal(p.life, 1);
  }
});

test("particles move and decay over time", () => {
  const fx = new ParticleSystem();
  fx.emit(0, 0, [255, 0, 0], 1, 2);
  const p = fx.particles[0];
  const startX = p.x;
  fx.update(100);
  assert.notEqual(p.x, startX, "particle should have moved");
  assert.ok(p.life < 1, "life should have decayed");
});

test("particles are removed when life drops to 0", () => {
  const fx = new ParticleSystem();
  fx.emit(0, 0, [255, 0, 0], 1);
  fx.update(1000);
  assert.equal(fx.particles.length, 0);
});

test("max cap is respected", () => {
  const fx = new ParticleSystem(3);
  fx.emit(0, 0, [0, 255, 0], 10);
  assert.equal(fx.particles.length, 3);
});

test("clear empties the system", () => {
  const fx = new ParticleSystem();
  fx.emit(0, 0, [0, 0, 255], 5);
  fx.clear();
  assert.equal(fx.particles.length, 0);
});
