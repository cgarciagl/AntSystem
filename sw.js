const CACHE = "hormigas-aco-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./js/main.js",
  "./js/renderer.js",
  "./js/vec2.js",
  "./js/constants.js",
  "./js/simulation.js",
  "./js/entities.js",
  "./js/pheromones.js",
  "./js/gui.js",
  "./js/input.js",
  "./js/event-emitter.js",
  "./js/spatial-grid.js",
  "./js/obstacles.js",
  "./js/presets.js",
  "./js/stats-graph.js",
  "./js/particles.js",
  "./js/palettes.js",
  "./js/persistence.js",
  "./js/recorder.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
