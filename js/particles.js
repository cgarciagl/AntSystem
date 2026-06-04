/**
 * Short-lived particle bursts used for visual feedback (e.g. food pickup).
 *
 * Particles are pooled to avoid per-frame allocation. The system
 * internally tracks a `life` in [0, 1] and discards particles when
 * their life drops to 0.
 *
 * @example
 *   const fx = new ParticleSystem(300);
 *   fx.emit(ant.pos.x, ant.pos.y, [255, 200, 60], 8);
 *   // per frame:
 *   fx.update(dtMs);
 *   fx.draw(particlesG);
 */
export class ParticleSystem {
  /**
   * @param {number} [maxParticles=300] Hard cap to prevent unbounded growth.
   */
  constructor(maxParticles = 300) {
    this.max = maxParticles;
    /** @type {Array<{x:number,y:number,vx:number,vy:number,life:number,color:[number,number,number],size:number}>} */
    this.particles = [];
  }

  /**
   * Spawn `count` particles bursting from (x, y) with the given color.
   * Excess particles are silently dropped once the cap is reached.
   * @param {number} x
   * @param {number} y
   * @param {[number, number, number]} color RGB tuple
   * @param {number} [count=8]
   * @param {number} [speed=1.6] Base speed in px / frame.
   */
  emit(x, y, color, count = 8, speed = 1.6) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) return;
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.5 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 1.0,
        color,
        size: 1.2 + Math.random() * 1.6,
      });
    }
  }

  /**
   * Advance particle positions and decay their life.
   * @param {number} dtMs Elapsed time in milliseconds.
   */
  update(dtMs) {
    const decay = dtMs * 0.0025;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  /**
   * Render all live particles onto a PixiJS Graphics layer.
   * @param {import("pixi.js").Graphics} g
   * @param {(rgb: [number, number, number]) => number} rgbToHex
   */
  draw(g, rgbToHex) {
    for (const p of this.particles) {
      g.beginFill(rgbToHex(p.color), p.life * 0.9);
      g.drawCircle(p.x, p.y, p.size);
      g.endFill();
    }
  }

  /** Remove all particles. */
  clear() {
    this.particles.length = 0;
  }
}
