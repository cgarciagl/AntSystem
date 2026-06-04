import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { PRESETS, PRESET_NAMES } = await import("../presets.js");

test("all presets have the same key shape", () => {
  const baseKeys = Object.keys(PRESETS[PRESET_NAMES[0]]).sort();
  for (const name of PRESET_NAMES) {
    const keys = Object.keys(PRESETS[name]).sort();
    assert.deepEqual(keys, baseKeys, `preset ${name} has wrong shape`);
  }
});

test("preset values are within expected ranges", () => {
  for (const [name, p] of Object.entries(PRESETS)) {
    assert.ok(p.speed >= 0.5 && p.speed <= 4, `${name} speed out of range`);
    assert.ok(
      p.evaporation >= 0.9 && p.evaporation <= 0.999,
      `${name} evap out of range`
    );
    assert.ok(p.senseAngleDeg >= 10 && p.senseAngleDeg <= 180, `${name} angle`);
    assert.ok(
      p.homeInfluence >= 0 && p.homeInfluence <= 2,
      `${name} homeInfluence`
    );
    assert.ok(p.deposit >= 1 && p.deposit <= 30, `${name} deposit`);
  }
});

test("preset names are stable (used as keys)", () => {
  assert.deepEqual(PRESET_NAMES, [
    "Exploración",
    "Persistente",
    "Denso",
    "Escasez",
  ]);
});
