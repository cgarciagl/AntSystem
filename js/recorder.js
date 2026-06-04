/**
 * Snapshot-based replay system.
 *
 * A recording is an ordered array of "frames". Each frame stores the
 * minimum data needed to render a faithful snapshot of the simulation
 * state at that tick: ant positions/headings, food positions/amounts,
 * and obstacle positions/radii.
 *
 * We deliberately do NOT record pheromone fields (size dominates) or
 * particles (ephemeral). The replay shows ant trajectories and food
 * dynamics, which is what people care about.
 *
 * Capacity: 600 frames (10 seconds at 60 fps) before the oldest is
 * dropped. Caps memory at ~5 MB even with 2000 ants.
 */

const FRAME_CAPACITY = 600;

/**
 * @typedef {{x: number, y: number, h: number, c: number, e: number}} AntSnap
 * @typedef {{x: number, y: number, a: number}} FoodSnap
 * @typedef {{x: number, y: number, r: number}} ObstacleSnap
 * @typedef {{t: number, ants: AntSnap[], food: FoodSnap[], obstacles: ObstacleSnap[]}} Frame
 */

/**
 * @returns {{ frames: Frame[], push: (sim: import("./simulation.js").Simulation) => void, clear: () => void, count: () => number }}
 */
export function createRecorder() {
  /** @type {Frame[]} */
  const frames = [];

  return {
    get frames() {
      return frames;
    },
    count() {
      return frames.length;
    },
    clear() {
      frames.length = 0;
    },
    push(sim) {
      if (frames.length >= FRAME_CAPACITY) {
        frames.shift();
      }
      /** @type {Frame} */
      const frame = {
        t: performance.now(),
        ants: new Array(sim.ants.length),
        food: sim.foodSources.map((f) => ({
          x: f.pos.x,
          y: f.pos.y,
          a: f.amount,
        })),
        obstacles: sim.obstacles.map((o) => ({
          x: o.pos.x,
          y: o.pos.y,
          r: o.r,
        })),
      };
      for (let i = 0; i < sim.ants.length; i++) {
        const a = sim.ants[i];
        frame.ants[i] = {
          x: a.pos.x,
          y: a.pos.y,
          h: a.dir.heading(),
          c: a.carrying,
          e: a.energy,
        };
      }
      frames.push(frame);
    },
  };
}

/**
 * Playback controller. Given a sequence of recorded frames, replays
 * them at the original recorded wall-clock interval.
 *
 * The simulation is paused during playback; this controller just feeds
 * frame data to a callback that re-renders ants/food/obstacles.
 *
 * @param {Frame[]} frames
 * @param {(frame: Frame) => void} onFrame
 * @returns {{ play: () => void, pause: () => void, stop: () => void, isPlaying: () => boolean, currentIndex: () => number }}
 */
export function createPlayback(frames, onFrame) {
  let index = 0;
  let timer = null;
  let playing = false;

  const stop = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    playing = false;
  };

  const tick = () => {
    if (!playing) return;
    const frame = frames[index];
    if (frame) onFrame(frame);
    if (index + 1 < frames.length) {
      const next = frames[index + 1];
      const delay = Math.max(1, next.t - frame.t);
      index++;
      timer = setTimeout(tick, delay);
    } else {
      playing = false;
      timer = null;
    }
  };

  return {
    play() {
      if (playing || frames.length === 0) return;
      playing = true;
      tick();
    },
    pause() {
      stop();
    },
    stop() {
      stop();
      index = 0;
    },
    isPlaying() {
      return playing;
    },
    currentIndex() {
      return index;
    },
  };
}
