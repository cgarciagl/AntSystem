/**
 * Tiny time-series line graph for the side panel.
 *
 * Records samples at a fixed interval; renders the last N samples.
 */
export class StatsGraph {
  /**
   * @param {number} w Canvas width in CSS pixels.
   * @param {number} h Canvas height in CSS pixels.
   * @param {number} capacity Number of samples to retain.
   * @param {string} lineColor CSS color string.
   * @param {string} bgColor CSS color string.
   */
  constructor(w, h, capacity = 120, lineColor = "#88c9ff", bgColor = "#222") {
    this.w = w;
    this.h = h;
    this.capacity = capacity;
    this.lineColor = lineColor;
    this.bgColor = bgColor;
    this.fps = [];
    this.food = [];
    this.canvas = null;
  }

  attachCanvas(canvas) {
    this.canvas = canvas;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = canvas.getContext("2d");
  }

  /** @param {number} value Current sample (e.g. frame rate). */
  pushFps(value) {
    this.fps.push(value);
    if (this.fps.length > this.capacity) this.fps.shift();
  }

  /** @param {number} value Current sample (e.g. food sources count). */
  pushFood(value) {
    this.food.push(value);
    if (this.food.length > this.capacity) this.food.shift();
  }

  /**
   * Draw a 2D line graph of the given series.
   * @param {number[]} series
   * @param {number} max
   * @param {string} color
   */
  _drawSeries(series, max, color) {
    if (!this.ctx) return;
    const { ctx, w, h } = this;
    const len = series.length;
    if (len < 2) return;
    const stepX = w / (this.capacity - 1);
    const startX = w - (len - 1) * stepX;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = startX + i * stepX;
      const y = h - (series[i] / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  render(maxFps = 60, maxFood = 50) {
    if (!this.ctx) return;
    const { ctx, w, h, bgColor } = this;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);
    this._drawSeries(this.fps, maxFps, "#88c9ff");
    this._drawSeries(this.food, maxFood, "#3cb43c");
    ctx.fillStyle = "#aaa";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(
      `FPS ${(this.fps[this.fps.length - 1] || 0).toFixed(0)}`,
      4,
      12
    );
    ctx.textAlign = "right";
    ctx.fillText(`Comida ${this.food[this.food.length - 1] || 0}`, w - 4, 12);
  }
}
