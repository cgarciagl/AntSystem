/**
 * Minimal globals stub for Node tests. The migration to PixiJS dropped
 * p5 globals; only a few mathematical helpers are still needed by the
 * pure logic (mostly Math.*).
 */

globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  addEventListener: () => {},
};
globalThis.navigator = {};
