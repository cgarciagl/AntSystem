import { Vec2, dist2 } from "./vec2.js";

/**
 * Static circular obstacle that ants must navigate around.
 * Pure data; rendering is delegated to the renderer.
 */
export class Obstacle {
  /**
   * @param {number} x Center x in world coordinates.
   * @param {number} y Center y in world coordinates.
   * @param {number} r Radius in pixels.
   */
  constructor(x, y, r) {
    this.pos = new Vec2(x, y);
    this.r = r;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  contains(x, y) {
    return dist2(this.pos, { x, y }) < this.r;
  }
}
