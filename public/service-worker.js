const CACHE_NAME = "life-planner-v1";
const OFFLINE_PAGE = "/workouts?view=today";
const APP_SHELL = [
  OFFLINE_PAGE,
  "/open-props-1.7.23.min.css",
  "/styles.css",
  "/dialogs.js",
  "/charts.js",
  "/datastar.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  self.clients.claim();
});

const cacheResponse = async (request, response) => {
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(request, response))
        .catch(
          async () =>
            (await caches.match(request)) ??
            (await caches.match(OFFLINE_PAGE)) ??
            new Response("Life Planner is offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
    );
    return;
  }

  if (["style", "script", "image", "manifest"].includes(request.destination)) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ??
            fetch(request).then((response) => cacheResponse(request, response)),
        ),
    );
  }
});
