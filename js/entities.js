export class Nest {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = 24;
  }
  draw() {
    noStroke();
    fill(120, 80, 40);
    circle(this.pos.x, this.pos.y, this.radius * 2);
    fill(255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text("NIDO", this.pos.x, this.pos.y);
  }
}
export class FoodSource {
  constructor(x, y, amount) {
    this.pos = createVector(x, y);
    this.amount = amount;
  }
  take(q) {
    const taken = min(q, this.amount);
    this.amount -= taken;
    return taken;
  }
}
export class Ant {
  constructor(sim) {
    this.sim = sim;
    this.pos = sim.nest.pos.copy();
    this.dir = p5.Vector.random2D();
    this.carrying = 0;
  }
  update() {
    const p = this.sim.params;
    if (this.carrying > 0) {
      const toNest = p5.Vector.sub(this.sim.nest.pos, this.pos).setMag(0.4);
      this.dir.add(toNest).normalize();
      this.sim.pheromones.deposit(this.pos.x, this.pos.y, p.deposit);
      if (p5.Vector.dist(this.pos, this.sim.nest.pos) < this.sim.nest.radius) {
        this.carrying = 0;
      }
    } else {
      this.followPheromones();
      const food = this.sim.nearestFood(this.pos);
      if (food && p5.Vector.dist(this.pos, food.pos) < 10) {
        if (food.take(1) > 0) this.carrying = 1;
      }
    }
    const noiseTurn = (random() - 0.5) * TWO_PI * p.randomTurn * 0.1;
    this.dir.rotate(noiseTurn);
    const speed = p.speed * (this.carrying ? 0.9 : 1);
    this.pos.add(p5.Vector.mult(this.dir, speed));
    if (this.pos.x < 0 || this.pos.x > width) {
      this.dir.x *= -1;
      this.pos.x = constrain(this.pos.x, 0, width);
    }
    if (this.pos.y < 0 || this.pos.y > height) {
      this.dir.y *= -1;
      this.pos.y = constrain(this.pos.y, 0, height);
    }
  }
  followPheromones() {
    const p = this.sim.params;
    const senseR = p.senseRadius;
    const senseAngle = p.senseAngle;
    const leftDir = this.dir.copy().rotate(-senseAngle * 0.5);
    const rightDir = this.dir.copy().rotate(senseAngle * 0.5);
    const centerPos = p5.Vector.add(this.pos, p5.Vector.mult(this.dir, senseR));
    const leftPos = p5.Vector.add(this.pos, p5.Vector.mult(leftDir, senseR));
    const rightPos = p5.Vector.add(this.pos, p5.Vector.mult(rightDir, senseR));
    const cV = this.sim.pheromones.sample(centerPos.x, centerPos.y);
    const lV = this.sim.pheromones.sample(leftPos.x, leftPos.y);
    const rV = this.sim.pheromones.sample(rightPos.x, rightPos.y);
    const influence = p.pheromoneInfluence;
    const sum = cV + lV + rV;
    // Si no hay señal de feromonas, no forzar giro: deja que el ruido gobierne
    if (sum <= 1e-6) return;
    const choice = random(sum);
    let targetDir = this.dir;
    if (choice < lV) targetDir = leftDir;
    else if (choice < lV + cV) targetDir = this.dir;
    else targetDir = rightDir;
    this.dir.lerp(targetDir, 0.15 * influence);
    this.dir.normalize();
  }
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.dir.heading());
    noStroke();
    if (this.carrying > 0) fill(255, 200, 60);
    else fill(200);
    triangle(-3, -2, -3, 2, 4, 0);
    pop();
  }
}
