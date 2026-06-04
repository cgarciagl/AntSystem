import { Nest, FoodSource, Ant, RandomWalker } from "./entities.js";
import { PheromoneField } from "./pheromones.js";
import { SpatialGrid } from "./spatial-grid.js";
import { Obstacle } from "./obstacles.js";
import { EventEmitter } from "./event-emitter.js";
import { ParticleSystem } from "./particles.js";
import { Vec2, v, dist2, randRange } from "./vec2.js";
import {
  DEFAULT_PARAMS,
  PHEROMONE_CELL_SIZE,
  NEST_RADIUS,
  FOOD_MERGE_DISTANCE,
  FOOD_CLICK_AMOUNT,
  FOOD_REMOVE_RADIUS,
  FOOD_SPAWN_MARGIN,
  MASSIVE_FOOD_SOURCES,
  MASSIVE_FOOD_MIN_AMOUNT,
  MASSIVE_FOOD_MAX_AMOUNT,
  FOOD_GRID_CELL_SIZE,
  FOOD_GRID_QUERY_CELLS,
  TARGET_FRAME_MS,
  degToRad,
} from "./constants.js";
import { PRESETS } from "./presets.js";

/**
 * Top-level simulation: owns the world, the ants, the pheromone fields,
 * and the spatial index of food. Emits events for UI side-effects.
 *
 * Rendering is delegated to an external renderer; the simulation is
 * pure state and can be unit-tested without a DOM.
 *
 * @example
 *   const sim = new Simulation(800, 600);
 *   sim.on("foodCollected", (e) => updateCounter(e.amount));
 */
export class Simulation extends EventEmitter {
  /**
   * @param {number} w World width in pixels.
   * @param {number} h World height in pixels.
   */
  constructor(w, h) {
    super();
    this.width = w;
    this.height = h;
    this.params = this._buildParams();
    this.nest = new Nest(w * 0.5, h * 0.5, NEST_RADIUS);
    this.foodPheromones = new PheromoneField(
      w,
      h,
      PHEROMONE_CELL_SIZE,
      this.params.foodPheromoneColor
    );
    this.homePheromones = new PheromoneField(
      w,
      h,
      PHEROMONE_CELL_SIZE,
      this.params.homePheromoneColor
    );
    this.foodGrid = new SpatialGrid(w, h, FOOD_GRID_CELL_SIZE);
    /** @type {Ant[]} */
    this.ants = [];
    /** @type {RandomWalker[]} */
    this.walkers = [];
    /** @type {FoodSource[]} */
    this.foodSources = [];
    /** @type {Obstacle[]} */
    this.obstacles = [];
    this.particles = new ParticleSystem(400);
    this.followedAnt = null;
    this.paused = false;
    this._stepOnce = false;
    this._dtScale = 1;
    this.draggingNest = false;
    this.dragOffset = null;
    this.tempVectors = this._allocateTempVectors();
    this._stats = {
      foodCollected: 0,
      foodCollectedWalkers: 0,
      totalAnts: 0,
      deaths: 0,
      deathsByOldAge: 0,
      deathsByStarvation: 0,
      meanEnergy: 0,
    };
    this.on("foodCollected", ({ ant, amount }) => {
      if (ant instanceof RandomWalker) {
        this._stats.foodCollectedWalkers += amount;
        return;
      }
      this.recordFoodCollected(amount);
      const color = this.params.carryingColor;
      this.particles.emit(ant.pos.x, ant.pos.y, color, 6, 1.8);
    });
    this.on("antDied", ({ cause }) => {
      if (cause === "oldAge") this._stats.deathsByOldAge++;
      else if (cause === "starvation") this._stats.deathsByStarvation++;
    });
  }

  _buildParams() {
    return {
      antsCount: DEFAULT_PARAMS.antsCount,
      speed: DEFAULT_PARAMS.speed,
      randomTurn: DEFAULT_PARAMS.randomTurn,
      evaporation: DEFAULT_PARAMS.evaporation,
      deposit: DEFAULT_PARAMS.deposit,
      pheromoneInfluence: DEFAULT_PARAMS.pheromoneInfluence,
      senseRadius: DEFAULT_PARAMS.senseRadius,
      senseAngle: degToRad(DEFAULT_PARAMS.senseAngleDeg),
      homeInfluence: DEFAULT_PARAMS.homeInfluence,
      foodRegrowth: DEFAULT_PARAMS.foodRegrowth,
      obstaclesEnabled: DEFAULT_PARAMS.obstaclesEnabled,
      showFoodPheromone: DEFAULT_PARAMS.showFoodPheromone,
      showHomePheromone: DEFAULT_PARAMS.showHomePheromone,
      showTrails: DEFAULT_PARAMS.showTrails,
      foodColor: [...DEFAULT_PARAMS.foodColor],
      foodPheromoneColor: [...DEFAULT_PARAMS.foodPheromoneColor],
      homePheromoneColor: [...DEFAULT_PARAMS.homePheromoneColor],
      antColor: [...DEFAULT_PARAMS.antColor],
      carryingColor: [...DEFAULT_PARAMS.carryingColor],
      backgroundColor: [...DEFAULT_PARAMS.backgroundColor],
    };
  }

  _allocateTempVectors() {
    return {
      leftDir: v(),
      rightDir: v(),
      centerPos: v(),
      leftPos: v(),
      rightPos: v(),
      nextPos: v(),
      away: v(),
      step: v(),
    };
  }

  /**
   * Full reset: clear state and apply the given ant count callback.
   * @param {() => number} getAntsCount
   */
  reset(getAntsCount) {
    this.foodPheromones.clearAll();
    this.homePheromones.clearAll();
    this.foodSources = [];
    this.obstacles = [];
    this.particles.clear();
    this.followedAnt = null;
    this.setAntsCount(getAntsCount());
    this.nest.pos.set(this.width * 0.5, this.height * 0.5);
    this._stats.foodCollected = 0;
    this._stats.foodCollectedWalkers = 0;
    this._stats.deaths = 0;
    this._stats.deathsByOldAge = 0;
    this._stats.deathsByStarvation = 0;
    this._stats.meanEnergy = 0;
    this.walkers = [];
    this.emit("reset");
  }

  /**
   * Reset only the tunable parameters to DEFAULT_PARAMS.
   */
  resetParams() {
    Object.assign(this.params, this._buildParams());
    this.foodPheromones.setColor(this.params.foodPheromoneColor);
    this.homePheromones.setColor(this.params.homePheromoneColor);
    this.emit("paramsReset");
  }

  /**
   * Apply a named preset (see presets.js).
   * @param {string} name
   * @param {() => number} getAntsCount Used because antsCount is a slider value.
   * @returns {boolean} true if the preset was found and applied.
   */
  applyPreset(name, getAntsCount) {
    const preset = PRESETS[name];
    if (!preset) return false;
    Object.assign(this.params, {
      speed: preset.speed,
      randomTurn: preset.randomTurn,
      evaporation: preset.evaporation,
      deposit: preset.deposit,
      pheromoneInfluence: preset.pheromoneInfluence,
      senseRadius: preset.senseRadius,
      senseAngle: degToRad(preset.senseAngleDeg),
      homeInfluence: preset.homeInfluence,
      foodRegrowth: preset.foodRegrowth,
    });
    this.setAntsCount(preset.antsCount ?? getAntsCount());
    this.emit("presetApplied", { name });
    return true;
  }

  /**
   * Set the ant population by adding or trimming.
   * @param {number} target
   */
  setAntsCount(target) {
    if (target > this.ants.length) {
      for (let i = this.ants.length; i < target; i++) {
        this.ants.push(new Ant(this));
      }
    } else if (target < this.ants.length) {
      this.ants.length = target;
    }
    this._stats.totalAnts = this.ants.length;
  }

  /**
   * Set the random-walker population used by the ACO vs random
   * comparison mode. Independent of the regular ant count.
   * @param {number} target
   */
  setWalkersCount(target) {
    if (target > this.walkers.length) {
      for (let i = this.walkers.length; i < target; i++) {
        this.walkers.push(new RandomWalker(this));
      }
    } else if (target < this.walkers.length) {
      this.walkers.length = target;
    }
  }

  /**
   * Add a food source at (x, y). Stacks onto a nearby source if one
   * already exists within FOOD_MERGE_DISTANCE.
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   */
  addFood(x, y, amount) {
    for (const source of this.foodSources) {
      if (dist2({ x, y }, source.pos) < FOOD_MERGE_DISTANCE) {
        source.add(amount);
        return;
      }
    }
    this.foodSources.push(new FoodSource(x, y, amount));
  }

  /**
   * Remove all food sources within `radius` of (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} [radius]
   */
  removeFoodAt(x, y, radius = FOOD_REMOVE_RADIUS) {
    this.foodSources = this.foodSources.filter(
      (source) => dist2({ x, y }, source.pos) > radius
    );
  }

  /**
   * Spawn N food clusters with random positions and amounts.
   * @param {number} [count]
   * @param {number} [minAmount]
   * @param {number} [maxAmount]
   */
  spawnFoodClusters(
    count = MASSIVE_FOOD_SOURCES,
    minAmount = MASSIVE_FOOD_MIN_AMOUNT,
    maxAmount = MASSIVE_FOOD_MAX_AMOUNT
  ) {
    for (let i = 0; i < count; i++) {
      const x = randRange(FOOD_SPAWN_MARGIN, this.width - FOOD_SPAWN_MARGIN);
      const y = randRange(FOOD_SPAWN_MARGIN, this.height - FOOD_SPAWN_MARGIN);
      this.addFood(x, y, randRange(minAmount, maxAmount));
    }
  }

  /**
   * Add an obstacle at (x, y) with the given radius.
   * @param {number} x
   * @param {number} y
   * @param {number} [radius=40]
   */
  addObstacle(x, y, radius = 40) {
    this.obstacles.push(new Obstacle(x, y, radius));
    this.emit("obstacleAdded", {
      obstacle: this.obstacles[this.obstacles.length - 1],
    });
  }

  /**
   * Resize the world (called from windowResized).
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.foodPheromones.resize(w, h);
    this.homePheromones.resize(w, h);
    this.foodGrid.resize(w, h);
  }

  /**
   * Find the closest non-empty food source using the spatial grid.
   * @param {{x: number, y: number}} pos
   * @returns {FoodSource|null}
   */
  nearestFood(pos) {
    let closest = null;
    let closestDistance = Infinity;
    const candidates = this.foodGrid.queryNeighbors(
      pos.x,
      pos.y,
      FOOD_GRID_QUERY_CELLS
    );
    for (const source of candidates) {
      if (source.amount <= 0) continue;
      const distance = dist2(pos, source.pos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = source;
      }
    }
    if (closest) return closest;
    for (const source of this.foodSources) {
      if (source.amount <= 0) continue;
      const distance = dist2(pos, source.pos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = source;
      }
    }
    return closest;
  }

  isOverNest(x, y) {
    return dist2({ x, y }, this.nest.pos) < this.nest.radius;
  }

  isOverObstacle(x, y) {
    for (const ob of this.obstacles) {
      if (ob.contains(x, y)) return ob;
    }
    return null;
  }

  /**
   * Find the ant closest to (x, y) and mark it as followed. Returns the
   * ant that was selected (or null if no ant is within `radius`).
   * @param {number} x
   * @param {number} y
   * @param {number} [radius=40]
   * @returns {Ant|null}
   */
  followNearestAnt(x, y, radius = 40) {
    let best = null;
    let bestD2 = radius * radius;
    for (const ant of this.ants) {
      if (!ant.alive) continue;
      const d2 = dist2({ x, y }, ant.pos);
      if (d2 < bestD2) {
        bestD2 = d2;
        best = ant;
      }
    }
    this.followedAnt = best;
    if (best) this.emit("followed", { ant: best });
    return best;
  }

  /** Clear the followed ant (Escape key, etc.). */
  unfollowAnt() {
    if (!this.followedAnt) return;
    this.followedAnt = null;
    this.emit("unfollowed");
  }

  tryGrabNest(x, y) {
    if (!this.isOverNest(x, y)) return false;
    this.draggingNest = true;
    this.dragOffset = new Vec2(x - this.nest.pos.x, y - this.nest.pos.y);
    return true;
  }

  dragNestTo(x, y) {
    if (!this.draggingNest) return;
    this.nest.pos.set(x - this.dragOffset.x, y - this.dragOffset.y);
  }

  releaseNest() {
    this.draggingNest = false;
  }

  /**
   * Top-level pointer handler.
   * @param {number} x
   * @param {number} y
   * @param {boolean} ctrl
   * @param {boolean} shift
   * @returns {"nest-drag"|"food-add"|"food-remove"|"obstacle-add"|"obstacle-remove"|"none"}
   */
  handlePointerDown(x, y, ctrl, shift) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "none";
    if (x < 0 || y < 0 || x > this.width || y > this.height) return "none";
    if (this.tryGrabNest(x, y)) return "nest-drag";
    if (shift && this.params.obstaclesEnabled) {
      this.addObstacle(x, y);
      return "obstacle-add";
    }
    if (ctrl) {
      const ob = this.isOverObstacle(x, y);
      if (ob) {
        this.obstacles = this.obstacles.filter((o) => o !== ob);
        return "obstacle-remove";
      }
      this.removeFoodAt(x, y);
      return "food-remove";
    }
    this.addFood(x, y, FOOD_CLICK_AMOUNT);
    return "food-add";
  }

  handlePointerMove(x, y) {
    this.dragNestTo(x, y);
  }

  handleDoubleClick() {
    this.foodPheromones.clearAll();
    this.homePheromones.clearAll();
  }

  /** Toggle pause state. */
  togglePause() {
    this.paused = !this.paused;
    this.emit("pauseChanged", { paused: this.paused });
  }

  /** Advance exactly one frame (no-op when already running). */
  step() {
    if (!this.paused) this.togglePause();
    this._stepOnce = true;
  }

  /**
   * Advance the simulation by one frame.
   */
  update() {
    if (this.paused && !this._stepOnce) return;
    this._stepOnce = false;
    const dt = this._lastDt || 16.667;
    this._dtScale = Math.max(0.1, dt / TARGET_FRAME_MS);
    const persistence = Math.pow(this.params.evaporation, this._dtScale);
    this.foodPheromones.evaporate(1 - persistence);
    this.homePheromones.evaporate(1 - persistence);
    this.foodGrid.clear();
    for (const source of this.foodSources) {
      source.regrow(this.params.foodRegrowth, dt);
      this.foodGrid.insert(source);
    }
    const before = this.ants.length;
    let energySum = 0;
    let aliveCount = 0;
    for (const ant of this.ants) {
      ant.update();
      if (ant.alive) {
        energySum += ant.energy;
        aliveCount++;
      }
    }
    const deaths = before - aliveCount;
    if (deaths > 0) this._stats.deaths += deaths;
    this.ants = this.ants.filter((a) => a.alive);
    if (this.followedAnt && !this.followedAnt.alive) this.unfollowAnt();
    if (this.walkers.length > 0) {
      for (const w of this.walkers) w.update();
      this.walkers = this.walkers.filter((w) => w.alive);
    }
    this.foodSources = this.foodSources.filter((s) => s.amount > 0);
    this._stats.totalAnts = this.ants.length;
    this._stats.meanEnergy = aliveCount > 0 ? energySum / aliveCount : 0;
    this.particles.update(dt);
  }

  /**
   * Set the last deltaTime in ms; called by the renderer each frame
   * before update().
   * @param {number} ms
   */
  setDeltaTime(ms) {
    this._lastDt = ms;
  }

  /**
   * Notify the simulation that an ant collected food. Updates stats.
   * @param {number} amount
   */
  recordFoodCollected(amount) {
    this._stats.foodCollected += amount;
  }

  /** @returns {{ foodCollected: number, totalAnts: number, deaths: number, deathsByOldAge: number, deathsByStarvation: number, meanEnergy: number }} */
  getStats() {
    return { ...this._stats };
  }
}
