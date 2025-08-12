import { Nest, FoodSource, Ant } from "./entities.js";
import { PheromoneField } from "./pheromones.js";

export class Simulation {
  constructor(w, h) {
    this.params = {
      speed: 1.6,
      randomTurn: 0.12,
      evaporation: 0.97,
      deposit: 8,
      pheromoneInfluence: 0.3,
      senseRadius: 18,
      senseAngle: radians(70),
    };
    this.nest = new Nest(w * 0.5, h * 0.5);
    this.pheromones = new PheromoneField(w, h, 10);
    this.ants = [];
    this.foodSources = [];
    this.setAntsCount(250);
  }
  reset(getAntsCount) {
    this.pheromones.clearAll();
    this.foodSources = [];
    this.setAntsCount(getAntsCount());
    this.nest.pos.set(width * 0.5, height * 0.5);
  }
  setAntsCount(n) {
    if (n > this.ants.length) {
      for (let i = this.ants.length; i < n; i++) this.ants.push(new Ant(this));
    } else if (n < this.ants.length) {
      this.ants.length = n;
    }
  }
  addFood(x, y, amount) {
    for (const f of this.foodSources) {
      if (dist(x, y, f.pos.x, f.pos.y) < 20) {
        f.amount += amount;
        return;
      }
    }
    this.foodSources.push(new FoodSource(x, y, amount));
  }
  removeFoodAt(x, y, r) {
    this.foodSources = this.foodSources.filter(
      (f) => dist(x, y, f.pos.x, f.pos.y) > r
    );
  }
  resize(w, h) {
    this.pheromones.resize(w, h);
  }
  nearestFood(pos) {
    let best = null,
      dBest = 1e9;
    for (const f of this.foodSources) {
      if (f.amount <= 0) continue;
      const d = p5.Vector.dist(pos, f.pos);
      if (d < dBest) {
        dBest = d;
        best = f;
      }
    }
    return best;
  }
  update() {
    this.pheromones.evaporate(1 - this.params.evaporation);
    for (const ant of this.ants) ant.update();
    this.foodSources = this.foodSources.filter((f) => f.amount > 0);
  }
  draw() {
    this.pheromones.draw();
    noStroke();
    for (const f of this.foodSources) {
      const r = constrain(Math.sqrt(f.amount), 4, 28);
      fill(60, 180, 60);
      circle(f.pos.x, f.pos.y, r * 2);
      fill(255);
      textSize(10);
      textAlign(CENTER, CENTER);
      text(Math.round(f.amount), f.pos.x, f.pos.y);
    }
    this.nest.draw();
    for (const ant of this.ants) ant.draw();
  }
}
