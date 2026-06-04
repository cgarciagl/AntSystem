import { Vec2, v, randRange, randomDir } from "./vec2.js";
import {
  FOOD_PICKUP_DISTANCE,
  NEST_RETURN_FORCE,
  CARRYING_SPEED_FACTOR,
  TURN_LERP_BASE,
  PHEROMONE_NOISE_THRESHOLD,
  ANT_MIN_LIFESPAN,
  ANT_MAX_LIFESPAN,
  OBSTACLE_PICK_RADIUS,
  ANT_MAX_ENERGY,
  ANT_ENERGY_DECAY_PER_PX,
  ANT_ENERGY_GAIN_PER_FOOD,
  ANT_ENERGY_HOME_REFILL,
  ANT_ENERGY_DEATH_THRESHOLD,
} from "./constants.js";

/**
 * Static nest at the center of the world. Ants spawn here and return
 * here to drop food.
 */
export class Nest {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   */
  constructor(x, y, radius) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
  }
}

/**
 * A pile of food that ants can pick up. Amount decreases as ants
 * collect; may regrow at a configurable rate.
 */
export class FoodSource {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} amount Initial amount of food.
   * @param {number} [maxAmount=Infinity] Optional cap for regrowth.
   */
  constructor(x, y, amount, maxAmount = Infinity) {
    this.pos = new Vec2(x, y);
    this.amount = amount;
    this.maxAmount = maxAmount;
  }

  /**
   * Remove up to `quantity` food. Returns the actual amount taken.
   * @param {number} quantity
   * @returns {number}
   */
  take(quantity) {
    const taken = Math.min(quantity, this.amount);
    this.amount -= taken;
    return taken;
  }

  /**
   * Add food up to the cap. Returns the amount actually added.
   * @param {number} amount
   * @returns {number}
   */
  add(amount) {
    const room = this.maxAmount - this.amount;
    const added = Math.min(amount, Math.max(0, room));
    this.amount += added;
    return added;
  }

  /**
   * Apply regrowth for an elapsed time slice. No-op when rate or cap is 0.
   * @param {number} rate Food units per millisecond.
   * @param {number} dt Milliseconds elapsed.
   * @returns {boolean} True if the source is empty after the call.
   */
  regrow(rate, dt) {
    if (rate <= 0) return this.amount <= 0;
    if (this.amount >= this.maxAmount) return false;
    const grow = rate * dt;
    this.amount = Math.min(this.maxAmount, this.amount + grow);
    return false;
  }
}

/**
 * A single ant with stochastic pheromone-following behavior.
 *
 * The ant reads `sim.params` and `sim.tempVectors` each tick. Direction
 * vectors used in followPheromones are taken from a shared pool to
 * avoid per-frame allocation. Rendering is handled by an external
 * renderer; this class is pure simulation state.
 */
export class Ant {
  /**
   * @param {import("./simulation.js").Simulation} sim
   */
  constructor(sim) {
    this.sim = sim;
    this.pos = sim.nest.pos.copy();
    this.dir = randomDir();
    this.carrying = 0;
    this.age = 0;
    this.lifespan = randRange(ANT_MIN_LIFESPAN, ANT_MAX_LIFESPAN);
    this.energy = ANT_MAX_ENERGY;
    this.alive = true;
    this._direct = v();
  }

  /**
   * Advance the ant by one simulation step.
   */
  update() {
    if (!this.alive) return;
    const params = this.sim.params;
    this.age++;
    if (this.age > this.lifespan) {
      this.alive = false;
      this.sim.emit("antDied", { ant: this, cause: "oldAge" });
      return;
    }
    if (this.carrying > 0) this.returnToNest(params);
    else this.searchForFood(params);
    this.applyRandomTurn(params);
    this.avoidObstacles();
    const distance = this.move(params);
    this.consumeEnergy(distance);
    this.refillAtNest();
    this.bounceAtBoundaries();
    if (this.energy <= ANT_ENERGY_DEATH_THRESHOLD) {
      this.alive = false;
      this.sim.emit("antDied", { ant: this, cause: "starvation" });
    }
  }

  returnToNest(params) {
    const direct = this._direct;
    direct.set(
      this.sim.nest.pos.x - this.pos.x,
      this.sim.nest.pos.y - this.pos.y
    );
    direct.setMag(NEST_RETURN_FORCE);
    this.dir.add(direct).normalize();
    if (params.showHomePheromone) {
      this.sim.homePheromones.deposit(this.pos.x, this.pos.y, params.deposit);
    }
    if (params.homeInfluence > 0) {
      this.followPheromones(
        this.sim.homePheromones,
        params.pheromoneInfluence * params.homeInfluence
      );
    }
    if (this.pos.dist(this.sim.nest.pos) < this.sim.nest.radius) {
      this.carrying = 0;
      this.energy = Math.min(
        ANT_MAX_ENERGY,
        this.energy + ANT_ENERGY_HOME_REFILL
      );
    }
  }

  searchForFood(params) {
    if (params.showFoodPheromone) {
      this.followPheromones(this.sim.foodPheromones, params.pheromoneInfluence);
    }
    const food = this.sim.nearestFood(this.pos);
    if (food && this.pos.dist(food.pos) < FOOD_PICKUP_DISTANCE) {
      if (food.take(1) > 0) {
        this.carrying = 1;
        this.energy = Math.min(
          ANT_MAX_ENERGY,
          this.energy + ANT_ENERGY_GAIN_PER_FOOD
        );
        if (params.showFoodPheromone) {
          this.sim.foodPheromones.depositCluster(
            food.pos.x,
            food.pos.y,
            params.deposit * 3,
            2
          );
        }
        this.sim.emit("foodCollected", { ant: this, food, amount: 1 });
      }
    }
  }

  /**
   * Sample the field at three points ahead and steer toward the strongest.
   * Uses sim.tempVectors to avoid per-frame allocation.
   * @param {import("./pheromones.js").PheromoneField} field
   * @param {number} influence Effective pheromone influence (slider × multiplier).
   */
  followPheromones(field, influence) {
    const t = this.sim.tempVectors;
    const senseR = this.sim.params.senseRadius;
    const halfAngle = this.sim.params.senseAngle * 0.5;
    t.leftDir.set(this.dir.x, this.dir.y).rotate(-halfAngle);
    t.rightDir.set(this.dir.x, this.dir.y).rotate(halfAngle);
    t.centerPos.set(
      this.pos.x + this.dir.x * senseR,
      this.pos.y + this.dir.y * senseR
    );
    t.leftPos.set(
      this.pos.x + t.leftDir.x * senseR,
      this.pos.y + t.leftDir.y * senseR
    );
    t.rightPos.set(
      this.pos.x + t.rightDir.x * senseR,
      this.pos.y + t.rightDir.y * senseR
    );
    const centerPheromone = field.sample(t.centerPos.x, t.centerPos.y);
    const leftPheromone = field.sample(t.leftPos.x, t.leftPos.y);
    const rightPheromone = field.sample(t.rightPos.x, t.rightPos.y);
    this._lastSense = {
      left: { x: t.leftPos.x, y: t.leftPos.y, v: leftPheromone },
      center: { x: t.centerPos.x, y: t.centerPos.y, v: centerPheromone },
      right: { x: t.rightPos.x, y: t.rightPos.y, v: rightPheromone },
    };
    const total = centerPheromone + leftPheromone + rightPheromone;
    if (total <= PHEROMONE_NOISE_THRESHOLD) return;
    const choice = Math.random() * total;
    let target;
    if (choice < leftPheromone) target = t.leftDir;
    else if (choice < leftPheromone + centerPheromone) target = this.dir;
    else target = t.rightDir;
    this.dir.lerp(target, TURN_LERP_BASE * influence);
    this.dir.normalize();
  }

  /**
   * @returns {{left: {x: number, y: number, v: number}, center: {x: number, y: number, v: number}, right: {x: number, y: number, v: number}} | null}
   *   Last sampled sensor positions and values, or null if the ant has
   *   not yet run a sensor pass.
   */
  getLastSense() {
    return this._lastSense || null;
  }

  applyRandomTurn(_params) {
    const noiseTurn =
      (Math.random() - 0.5) * this.sim.params.randomTurn * 0.628;
    this.dir.rotate(noiseTurn);
  }

  /**
   * Steer away from any obstacle ahead.
   */
  avoidObstacles() {
    if (!this.sim.obstacles.length) return;
    const next = this.sim.tempVectors.nextPos;
    next.set(
      this.pos.x + this.dir.x * OBSTACLE_PICK_RADIUS,
      this.pos.y + this.dir.y * OBSTACLE_PICK_RADIUS
    );
    for (const ob of this.sim.obstacles) {
      const dx = next.x - ob.pos.x;
      const dy = next.y - ob.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < ob.r * ob.r) {
        const away = this.sim.tempVectors.away;
        away.set(this.pos.x - ob.pos.x, this.pos.y - ob.pos.y).normalize();
        this.dir.add(away.mult(0.5)).normalize();
        break;
      }
    }
  }

  move(params) {
    const speed = params.speed * (this.carrying ? CARRYING_SPEED_FACTOR : 1);
    const step = this.sim.tempVectors.step;
    step.set(this.dir.x, this.dir.y).mult(speed);
    this.pos.x += step.x;
    this.pos.y += step.y;
    return speed;
  }

  consumeEnergy(distance) {
    this.energy = Math.max(0, this.energy - distance * ANT_ENERGY_DECAY_PER_PX);
  }

  /**
   * Slowly refill energy while the ant is at the nest. The refill is
   * small per-tick so that ants sitting at the spawn point still lose
   * energy over time (just much more slowly than foraging).
   */
  refillAtNest() {
    if (this.pos.dist(this.sim.nest.pos) >= this.sim.nest.radius) return;
    if (this.energy >= ANT_MAX_ENERGY) return;
    this.energy = Math.min(
      ANT_MAX_ENERGY,
      this.energy + ANT_ENERGY_HOME_REFILL * 0.002
    );
  }

  bounceAtBoundaries() {
    const w = this.sim.width;
    const h = this.sim.height;
    if (this.pos.x < 0 || this.pos.x > w) {
      this.dir.x *= -1;
      this.pos.x = Math.max(0, Math.min(w, this.pos.x));
    }
    if (this.pos.y < 0 || this.pos.y > h) {
      this.dir.y *= -1;
      this.pos.y = Math.max(0, Math.min(h, this.pos.y));
    }
  }
}

/**
 * A walker that ignores pheromones — used to demonstrate visually
 * that ACO outperforms random search. Shares lifecycle/energy with
 * regular ants so the comparison is apples-to-apples.
 */
export class RandomWalker {
  /**
   * @param {import("./simulation.js").Simulation} sim
   */
  constructor(sim) {
    this.sim = sim;
    this.pos = sim.nest.pos.copy();
    this.dir = randomDir();
    this.carrying = 0;
    this.age = 0;
    this.lifespan = randRange(ANT_MIN_LIFESPAN, ANT_MAX_LIFESPAN);
    this.energy = ANT_MAX_ENERGY;
    this.alive = true;
  }

  update() {
    if (!this.alive) return;
    this.age++;
    if (this.age > this.lifespan) {
      this.alive = false;
      this.sim.emit("antDied", { ant: this, cause: "oldAge" });
      return;
    }
    if (this.carrying > 0) this.returnToNest();
    else this.searchForFood();
    this.dir.rotate((Math.random() - 0.5) * 0.9);
    const speed =
      this.sim.params.speed * (this.carrying ? CARRYING_SPEED_FACTOR : 1);
    this.pos.x += this.dir.x * speed;
    this.pos.y += this.dir.y * speed;
    this.energy = Math.max(0, this.energy - speed * ANT_ENERGY_DECAY_PER_PX);
    if (this.pos.dist(this.sim.nest.pos) < this.sim.nest.radius) {
      this.energy = Math.min(
        ANT_MAX_ENERGY,
        this.energy + ANT_ENERGY_HOME_REFILL
      );
      this.carrying = 0;
    }
    this.bounceAtBoundaries();
    if (this.energy <= ANT_ENERGY_DEATH_THRESHOLD) {
      this.alive = false;
      this.sim.emit("antDied", { ant: this, cause: "starvation" });
    }
  }

  returnToNest() {
    const dx = this.sim.nest.pos.x - this.pos.x;
    const dy = this.sim.nest.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    this.dir.x = dx / d;
    this.dir.y = dy / d;
  }

  searchForFood() {
    const food = this.sim.nearestFood(this.pos);
    if (food && this.pos.dist(food.pos) < FOOD_PICKUP_DISTANCE) {
      if (food.take(1) > 0) {
        this.carrying = 1;
        this.energy = Math.min(
          ANT_MAX_ENERGY,
          this.energy + ANT_ENERGY_GAIN_PER_FOOD
        );
        this.sim.emit("foodCollected", { ant: this, food, amount: 1 });
      }
    }
  }

  bounceAtBoundaries() {
    const w = this.sim.width;
    const h = this.sim.height;
    if (this.pos.x < 0 || this.pos.x > w) {
      this.dir.x *= -1;
      this.pos.x = Math.max(0, Math.min(w, this.pos.x));
    }
    if (this.pos.y < 0 || this.pos.y > h) {
      this.dir.y *= -1;
      this.pos.y = Math.max(0, Math.min(h, this.pos.y));
    }
  }
}
