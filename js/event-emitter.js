/**
 * Lightweight event emitter for decoupling simulation logic from UI.
 *
 * @example
 *   const sim = new Simulation(w, h);
 *   sim.on("foodCollected", ({ amount }) => console.log(amount));
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Register an event handler.
   * @param {string} event Event name.
   * @param {(payload: any) => void} fn Handler.
   * @returns {() => void} Unsubscribe function.
   */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  /**
   * Remove an event handler.
   * @param {string} event Event name.
   * @param {Function} fn Handler to remove.
   */
  off(event, fn) {
    const set = this._listeners.get(event);
    if (set) set.delete(fn);
  }

  /**
   * Emit an event synchronously to all registered handlers.
   * @param {string} event Event name.
   * @param {*} [payload] Optional data passed to handlers.
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}
