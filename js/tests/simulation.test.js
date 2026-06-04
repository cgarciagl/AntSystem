import { test } from "node:test";
import assert from "node:assert/strict";
import "./p5-mock.js";

const { Simulation } = await import("../simulation.js");
const { RandomWalker } = await import("../entities.js");
const { ANT_MAX_ENERGY, ANT_ENERGY_DEATH_THRESHOLD, ANT_ENERGY_GAIN_PER_FOOD } =
  await import("../constants.js");

test("Simulation constructs with default state", () => {
  const sim = new Simulation(800, 600);
  assert.equal(sim.ants.length, 0);
  assert.equal(sim.foodSources.length, 0);
  assert.equal(sim.obstacles.length, 0);
  assert.equal(sim.paused, false);
  assert.ok(sim.foodPheromones);
  assert.ok(sim.homePheromones);
  assert.ok(sim.foodGrid);
  assert.equal(sim.foodPheromones.cols, 80);
  assert.equal(sim.foodPheromones.rows, 60);
});

test("setAntsCount grows and shrinks", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(50);
  assert.equal(sim.ants.length, 50);
  sim.setAntsCount(20);
  assert.equal(sim.ants.length, 20);
  sim.setAntsCount(20);
  assert.equal(sim.ants.length, 20);
});

test("addFood stacks on nearby sources", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 10);
  sim.addFood(105, 105, 5);
  assert.equal(sim.foodSources.length, 1);
  assert.equal(sim.foodSources[0].amount, 15);
});

test("addFood creates new sources when far apart", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 10);
  sim.addFood(300, 300, 5);
  assert.equal(sim.foodSources.length, 2);
});

test("removeFoodAt removes sources within radius", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 10);
  sim.addFood(500, 500, 5);
  sim.removeFoodAt(100, 100, 50);
  assert.equal(sim.foodSources.length, 1);
  assert.equal(sim.foodSources[0].pos.x, 500);
});

test("togglePause flips state and emits event", () => {
  const sim = new Simulation(800, 600);
  let payload = null;
  sim.on("pauseChanged", (p) => {
    payload = p;
  });
  sim.togglePause();
  assert.equal(sim.paused, true);
  assert.deepEqual(payload, { paused: true });
  sim.togglePause();
  assert.equal(sim.paused, false);
});

test("applyPreset updates params and ant count", () => {
  const sim = new Simulation(800, 600);
  const ok = sim.applyPreset("Persistente", () => 100);
  assert.equal(ok, true);
  assert.equal(sim.ants.length, 600);
  assert.ok(sim.params.evaporation > 0.98);
});

test("applyPreset returns false for unknown name", () => {
  const sim = new Simulation(800, 600);
  assert.equal(
    sim.applyPreset("Nope", () => 100),
    false
  );
});

test("resetParams restores defaults", () => {
  const sim = new Simulation(800, 600);
  sim.params.speed = 3.5;
  sim.resetParams();
  assert.equal(sim.params.speed, 1.6);
});

test("reset clears world state", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 10);
  sim.setAntsCount(50);
  sim.reset(() => 30);
  assert.equal(sim.foodSources.length, 0);
  assert.equal(sim.ants.length, 30);
});

test("nearestFood returns the closest non-empty source", () => {
  const sim = new Simulation(800, 600);
  sim.addFood(100, 100, 10);
  sim.addFood(150, 100, 5);
  sim.addFood(500, 500, 5);
  const closest = sim.nearestFood({ x: 120, y: 105 });
  assert.equal(closest.pos.x, 100);
});

test("EventEmitter subscribe/emit roundtrip", async () => {
  const { EventEmitter } = await import("../event-emitter.js");
  const e = new EventEmitter();
  let received = null;
  e.on("ping", (p) => {
    received = p;
  });
  e.emit("ping", { ok: true });
  assert.deepEqual(received, { ok: true });
});

test("EventEmitter unsubscribe works", async () => {
  const { EventEmitter } = await import("../event-emitter.js");
  const e = new EventEmitter();
  let count = 0;
  const off = e.on("ping", () => count++);
  e.emit("ping");
  off();
  e.emit("ping");
  assert.equal(count, 1);
});

test("followNearestAnt picks the closest live ant within radius", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(5);
  sim.ants[0].pos.set(100, 100);
  sim.ants[1].pos.set(110, 100);
  sim.ants[2].pos.set(300, 300);
  sim.ants[3].pos.set(200, 200);
  const picked = sim.followNearestAnt(102, 100, 50);
  assert.equal(picked, sim.ants[0]);
  assert.equal(sim.followedAnt, sim.ants[0]);
});

test("followNearestAnt returns null and clears followedAnt when no ant is in range", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(3);
  sim.ants[0].pos.set(50, 50);
  sim.ants[1].pos.set(60, 60);
  sim.followedAnt = sim.ants[0];
  const picked = sim.followNearestAnt(700, 700, 20);
  assert.equal(picked, null);
  assert.equal(sim.followedAnt, null);
});

test("followNearestAnt ignores dead ants", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(3);
  sim.ants[0].pos.set(100, 100);
  sim.ants[0].alive = false;
  sim.ants[1].pos.set(105, 100);
  const picked = sim.followNearestAnt(102, 100, 50);
  assert.equal(picked, sim.ants[1]);
});

test("followNearestAnt emits a 'followed' event", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(2);
  sim.ants[0].pos.set(100, 100);
  let payload = null;
  sim.on("followed", (e) => {
    payload = e;
  });
  sim.followNearestAnt(100, 100);
  assert.equal(payload.ant, sim.ants[0]);
});

test("unfollowAnt clears the followed ant and emits 'unfollowed'", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  sim.ants[0].pos.set(100, 100);
  sim.followNearestAnt(100, 100);
  let fired = false;
  sim.on("unfollowed", () => {
    fired = true;
  });
  sim.unfollowAnt();
  assert.equal(sim.followedAnt, null);
  assert.equal(fired, true);
});

test("unfollowAnt is a no-op when no ant is followed", () => {
  const sim = new Simulation(800, 600);
  let fired = false;
  sim.on("unfollowed", () => {
    fired = true;
  });
  sim.unfollowAnt();
  assert.equal(sim.followedAnt, null);
  assert.equal(fired, false);
});

test("new ants start with full energy", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(3);
  for (const ant of sim.ants) {
    assert.equal(ant.energy, ANT_MAX_ENERGY);
    assert.equal(ant.alive, true);
  }
});

test("ants lose energy as they move and die of starvation at 0", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  ant.energy = ANT_ENERGY_DEATH_THRESHOLD + 0.5;
  ant.pos.set(700, 500);
  for (let i = 0; i < 500 && ant.alive; i++) sim.update();
  assert.equal(ant.alive, false);
  const stats = sim.getStats();
  assert.ok(stats.deathsByStarvation >= 1);
});

test("antDied emits cause=oldAge when lifespan expires", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  ant.lifespan = 1;
  let cause = null;
  sim.on("antDied", (e) => {
    cause = e.cause;
  });
  for (let i = 0; i < 5; i++) sim.update();
  assert.equal(cause, "oldAge");
});

test("ants gain energy when they pick up food", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  ant.pos.set(400, 300);
  ant.energy = ANT_MAX_ENERGY * 0.2;
  sim.addFood(400, 300, 5);
  for (let i = 0; i < 5; i++) sim.update();
  assert.ok(ant.energy > ANT_MAX_ENERGY * 0.2);
  assert.ok(ant.carrying > 0 || ant.energy >= ANT_MAX_ENERGY * 0.8);
});

test("getStats includes meanEnergy and per-cause death counts", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(3);
  sim.ants[0].energy = 50;
  sim.ants[1].energy = 100;
  sim.ants[2].energy = 25;
  sim.setDeltaTime(16);
  sim.update();
  const stats = sim.getStats();
  assert.equal(typeof stats.meanEnergy, "number");
  assert.ok(stats.meanEnergy > 0);
  assert.equal(typeof stats.deathsByOldAge, "number");
  assert.equal(typeof stats.deathsByStarvation, "number");
});

test("followedAnt is auto-unfollowed if it dies", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  ant.energy = ANT_ENERGY_DEATH_THRESHOLD + 0.5;
  ant.pos.set(700, 500);
  sim.followedAnt = ant;
  for (let i = 0; i < 500; i++) sim.update();
  assert.equal(sim.followedAnt, null);
});

test("setWalkersCount adds and removes random walkers", () => {
  const sim = new Simulation(800, 600);
  assert.equal(sim.walkers.length, 0);
  sim.setWalkersCount(50);
  assert.equal(sim.walkers.length, 50);
  sim.setWalkersCount(20);
  assert.equal(sim.walkers.length, 20);
});

test("walkers do not deposit or follow pheromones", () => {
  const sim = new Simulation(800, 600);
  sim.setWalkersCount(1);
  const w = sim.walkers[0];
  const foodP = sim.foodPheromones;
  const homeP = sim.homePheromones;
  foodP.clearAll();
  homeP.clearAll();
  for (let i = 0; i < 50; i++) sim.update();
  assert.equal(foodP.activeCount(), 0);
  assert.equal(homeP.activeCount(), 0);
  assert.ok(w instanceof RandomWalker);
});

test("walkers can still pick up food and have their count tracked separately", () => {
  const sim = new Simulation(800, 600);
  sim.setWalkersCount(1);
  const w = sim.walkers[0];
  w.pos.set(400, 300);
  sim.addFood(400, 300, 3);
  for (let i = 0; i < 5; i++) sim.update();
  const stats = sim.getStats();
  assert.equal(typeof stats.foodCollectedWalkers, "number");
  assert.ok(w.carrying > 0 || stats.foodCollectedWalkers > 0);
});

test("Ant.getLastSense returns null before first sensor pass and data after", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  assert.equal(ant.getLastSense(), null);
  sim.foodPheromones.deposit(420, 300, 50);
  for (let i = 0; i < 3; i++) sim.update();
  const sense = ant.getLastSense();
  assert.ok(sense);
  assert.ok("left" in sense && "center" in sense && "right" in sense);
  assert.ok(typeof sense.left.x === "number");
  assert.ok(sense.left.v >= 0);
});

test("food pheromone is deposited at the food source when an ant picks up food (visible blue cloud)", () => {
  const sim = new Simulation(800, 600);
  sim.setAntsCount(1);
  const ant = sim.ants[0];
  ant.pos.set(400, 300);
  ant.dir.set(1, 0);
  sim.addFood(420, 300, 5);
  sim.foodPheromones.clearAll();
  sim.homePheromones.clearAll();
  for (let i = 0; i < 25; i++) sim.update();
  assert.ok(ant.carrying > 0 || sim.foodPheromones.activeCount() > 0);
  assert.ok(
    sim.foodPheromones.activeCount() > 0,
    "food pheromone should be deposited at the food source"
  );
  assert.ok(
    sim.homePheromones.activeCount() > 0,
    "home pheromone should be deposited on the return path"
  );
});
