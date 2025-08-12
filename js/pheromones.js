export class PheromoneField {
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(w / cellSize);
    this.rows = Math.ceil(h / cellSize);
    this.field = new Float32Array(this.cols * this.rows);
    this.buffer = new Float32Array(this.cols * this.rows);
  }
  index(x, y) {
    return x + y * this.cols;
  }
  resize(w, h) {
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    this.field = new Float32Array(this.cols * this.rows);
    this.buffer = new Float32Array(this.cols * this.rows);
  }
  deposit(x, y, amount) {
    const cx = Math.floor(constrain(x / this.cellSize, 0, this.cols - 1));
    const cy = Math.floor(constrain(y / this.cellSize, 0, this.rows - 1));
    this.field[this.index(cx, cy)] += amount;
  }
  sample(x, y) {
    if (x < 0 || y < 0 || x > width || y > height) return 0;
    const cx = Math.floor(constrain(x / this.cellSize, 0, this.cols - 1));
    const cy = Math.floor(constrain(y / this.cellSize, 0, this.rows - 1));
    return this.field[this.index(cx, cy)];
  }
  evaporate(delta) {
    const f = this.field,
      b = this.buffer,
      cols = this.cols,
      rows = this.rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = x + y * cols;
        let v = f[i];
        let sum = v,
          count = 1;
        if (x > 0) {
          sum += f[i - 1];
          count++;
        }
        if (x < cols - 1) {
          sum += f[i + 1];
          count++;
        }
        if (y > 0) {
          sum += f[i - cols];
          count++;
        }
        if (y < rows - 1) {
          sum += f[i + cols];
          count++;
        }
        const diffused = sum / count;
        b[i] = diffused * (1 - delta);
      }
    }
    for (let i = 0; i < f.length; i++) f[i] = b[i];
  }
  clearAll() {
    this.field.fill(0);
    this.buffer.fill(0);
  }
  activeCount() {
    let c = 0;
    const f = this.field;
    for (let i = 0; i < f.length; i++) if (f[i] > 0.1) c++;
    return c;
  }
  draw() {
    noStroke();
    const cs = this.cellSize;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const v = this.field[this.index(x, y)];
        if (v > 0.5) {
          const alpha = constrain(v * 4, 10, 180);
          fill(0, 180, 255, alpha);
          rect(x * cs, y * cs, cs, cs);
        }
      }
    }
  }
}
