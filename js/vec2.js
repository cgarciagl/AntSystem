/**
 * Lightweight 2D vector math. Drop-in replacement for p5.Vector for the
 * subset of operations used by the simulation.
 *
 * All mutating methods return `this` to enable chaining.
 */
export class Vec2 {
  /**
   * @param {number} [x=0]
   * @param {number} [y=0]
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** @param {number} x @param {number} y @returns {Vec2} */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /** @returns {Vec2} */
  copy() {
    return new Vec2(this.x, this.y);
  }

  /** @param {Vec2} o @returns {Vec2} */
  add(o) {
    this.x += o.x;
    this.y += o.y;
    return this;
  }

  /** @param {Vec2} o @returns {Vec2} */
  sub(o) {
    this.x -= o.x;
    this.y -= o.y;
    return this;
  }

  /** @param {number} n @returns {Vec2} */
  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /** @returns {number} */
  mag() {
    return Math.hypot(this.x, this.y);
  }

  /** @param {number} n @returns {Vec2} */
  setMag(n) {
    return this.normalize().mult(n);
  }

  /** @returns {Vec2} */
  normalize() {
    const m = this.mag() || 1;
    this.x /= m;
    this.y /= m;
    return this;
  }

  /** @returns {number} Angle in radians, in (-PI, PI]. */
  heading() {
    return Math.atan2(this.y, this.x);
  }

  /** @param {number} a Radians. @returns {Vec2} */
  rotate(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = this.x * c - this.y * s;
    const ny = this.x * s + this.y * c;
    this.x = nx;
    this.y = ny;
    return this;
  }

  /** @param {Vec2} o @param {number} t @returns {Vec2} */
  lerp(o, t) {
    this.x += (o.x - this.x) * t;
    this.y += (o.y - this.y) * t;
    return this;
  }

  /** @param {Vec2} o @returns {number} */
  dist(o) {
    return Math.hypot(o.x - this.x, o.y - this.y);
  }

  /** @param {Vec2} o @returns {number} */
  dot(o) {
    return this.x * o.x + this.y * o.y;
  }
}

/** @param {number} [x] @param {number} [y] @returns {Vec2} */
export const v = (x = 0, y = 0) => new Vec2(x, y);

/** Distance between two points. @param {{x: number, y: number}} a @param {{x: number, y: number}} b @returns {number} */
export const dist2 = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** @returns {Vec2} Random unit vector (uniform on the circle). */
export const randomDir = () => {
  const a = Math.random() * Math.PI * 2;
  return new Vec2(Math.cos(a), Math.sin(a));
};

/** Clamp v to [lo, hi]. @param {number} v @param {number} lo @param {number} hi @returns {number} */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Random float in [lo, hi). @param {number} lo @param {number} hi @returns {number} */
export const randRange = (lo, hi) => lo + Math.random() * (hi - lo);
