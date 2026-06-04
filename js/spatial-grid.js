/**
 * Uniform spatial grid for O(1)-ish neighbor queries.
 *
 * Each item must expose a `pos: { x: number, y: number }`.
 *
 * @example
 *   const grid = new SpatialGrid(800, 600, 80);
 *   grid.insert(food);
 *   const nearby = grid.queryNeighbors(antX, antY, 2);
 */
export class SpatialGrid {
  /**
   * @param {number} w World width in pixels.
   * @param {number} h World height in pixels.
   * @param {number} cellSize Grid cell edge in pixels.
   */
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(w / cellSize));
    this.rows = Math.max(1, Math.ceil(h / cellSize));
    /** @type {Array<Array<{pos: {x: number, y: number}}>>} */
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }

  /**
   * @param {number} cx Cell x.
   * @param {number} cy Cell y.
   * @returns {number} Linear index.
   */
  key(cx, cy) {
    return cx + cy * this.cols;
  }

  /** Remove all items from all cells. */
  clear() {
    for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0;
  }

  /**
   * Insert an item. Items outside the grid are silently dropped.
   * @param {{pos: {x: number, y: number}}} item
   */
  insert(item) {
    const cx = Math.floor(item.pos.x / this.cellSize);
    const cy = Math.floor(item.pos.y / this.cellSize);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.cells[this.key(cx, cy)].push(item);
  }

  /**
   * Return all items in cells within `cellRadius` of (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} cellRadius Radius in grid cells (1 = 3x3 neighborhood).
   * @returns {Array}
   */
  queryNeighbors(x, y, cellRadius) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const out = [];
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
        const cell = this.cells[this.key(nx, ny)];
        if (cell.length) out.push(...cell);
      }
    }
    return out;
  }

  /**
   * Resize the grid (clears all items).
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.cols = Math.max(1, Math.ceil(w / this.cellSize));
    this.rows = Math.max(1, Math.ceil(h / this.cellSize));
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }
}
