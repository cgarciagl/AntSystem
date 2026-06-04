import {
  PHEROMONE_ACTIVE_THRESHOLD,
  PHEROMONE_DRAW_THRESHOLD,
  PHEROMONE_DRAW_ALPHA_MIN,
  PHEROMONE_DRAW_ALPHA_MAX,
  PHEROMONE_DRAW_BRIGHTNESS,
} from "./constants.js";
import { clamp } from "./vec2.js";

/**
 * 2D scalar field of pheromone values stored in a Float32Array.
 *
 * The decay step performs a 4-neighbor diffusion + multiplicative decay
 * in a single pass to halve memory bandwidth. Rendering is the renderer's
 * responsibility; this class only owns the numeric field.
 */
export class PheromoneField {
  /**
   * @param {number} w World width in pixels.
   * @param {number} h World height in pixels.
   * @param {number} cellSize Cell edge in pixels.
   * @param {[number, number, number]} [color] RGB tuple used for drawing.
   */
  constructor(w, h, cellSize, color = [0, 180, 255]) {
    this.cellSize = cellSize;
    this.worldW = w;
    this.worldH = h;
    this.cols = Math.max(1, Math.ceil(w / cellSize));
    this.rows = Math.max(1, Math.ceil(h / cellSize));
    this.field = new Float32Array(this.cols * this.rows);
    this.buffer = new Float32Array(this.cols * this.rows);
    this.color = color;
  }

  /**
   * @param {number} x Cell x.
   * @param {number} y Cell y.
   * @returns {number} Linear index into field/buffer.
   */
  index(x, y) {
    return x + y * this.cols;
  }

  /**
   * Resize the field (clears all values).
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.worldW = w;
    this.worldH = h;
    this.cols = Math.max(1, Math.ceil(w / this.cellSize));
    this.rows = Math.max(1, Math.ceil(h / this.cellSize));
    this.field = new Float32Array(this.cols * this.rows);
    this.buffer = new Float32Array(this.cols * this.rows);
  }

  /**
   * Add `amount` pheromone to the cell containing (x, y).
   * Out-of-range points are clamped to the nearest cell.
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   */
  deposit(x, y, amount) {
    const cx = Math.floor(clamp(x / this.cellSize, 0, this.cols - 1));
    const cy = Math.floor(clamp(y / this.cellSize, 0, this.rows - 1));
    this.field[this.index(cx, cy)] += amount;
  }

  /**
   * Add `amount` pheromone to a square cluster of (2r+1)×(2r+1)
   * cells centered on (x, y). Used for point sources (e.g. food
   * pickup) so a single deposit creates a visible cloud instead of
   * being diluted to invisibility by the diffusion step.
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   * @param {number} [radius=1] Cluster radius in cells.
   */
  depositCluster(x, y, amount, radius = 1) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = cy + dy;
      if (ny < 0 || ny >= this.rows) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx;
        if (nx < 0 || nx >= this.cols) continue;
        this.field[this.index(nx, ny)] += amount;
      }
    }
  }

  /**
   * Sample the value at (x, y). Returns 0 for points outside the world.
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  sample(x, y) {
    if (x < 0 || y < 0 || x > this.worldW || y > this.worldH) return 0;
    const cx = Math.floor(clamp(x / this.cellSize, 0, this.cols - 1));
    const cy = Math.floor(clamp(y / this.cellSize, 0, this.rows - 1));
    return this.field[this.index(cx, cy)];
  }

  /**
   * Diffuse the field across its 4 neighbors and apply multiplicative decay.
   * @param {number} delta Fraction of the value removed by decay (0 = none).
   */
  evaporate(delta) {
    const field = this.field;
    const buffer = this.buffer;
    const cols = this.cols;
    const rows = this.rows;
    const persistence = 1 - delta;
    for (let y = 0; y < rows; y++) {
      const rowBase = y * cols;
      for (let x = 0; x < cols; x++) {
        const i = x + rowBase;
        let sum = field[i];
        let neighbors = 1;
        if (x > 0) {
          sum += field[i - 1];
          neighbors++;
        }
        if (x < cols - 1) {
          sum += field[i + 1];
          neighbors++;
        }
        if (y > 0) {
          sum += field[i - cols];
          neighbors++;
        }
        if (y < rows - 1) {
          sum += field[i + cols];
          neighbors++;
        }
        buffer[i] = (sum / neighbors) * persistence;
      }
    }
    for (let i = 0; i < field.length; i++) field[i] = buffer[i];
  }

  /** Zero the field. */
  clearAll() {
    this.field.fill(0);
    this.buffer.fill(0);
  }

  /**
   * @returns {number} Count of cells whose value exceeds the active threshold.
   */
  activeCount() {
    const field = this.field;
    let count = 0;
    for (let i = 0; i < field.length; i++) {
      if (field[i] > PHEROMONE_ACTIVE_THRESHOLD) count++;
    }
    return count;
  }

  /**
   * Set the field color (used by draw).
   * @param {[number, number, number]} color RGB tuple.
   */
  setColor(color) {
    this.color = color;
  }

  /**
   * Compute the draw alpha for a given value.
   * @param {number} value
   * @returns {number} 0 if below threshold, otherwise scaled alpha in [min, max].
   */
  static alphaFor(value) {
    if (value <= PHEROMONE_DRAW_THRESHOLD) return 0;
    return clamp(
      value * PHEROMONE_DRAW_BRIGHTNESS,
      PHEROMONE_DRAW_ALPHA_MIN,
      PHEROMONE_DRAW_ALPHA_MAX
    );
  }
}
