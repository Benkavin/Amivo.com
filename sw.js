/* amivo service worker: shows the morning and evening notifications and opens the app when one is tapped. */
const CACHE = "amivo-v2";
const SHELL = ["./", "index.html", "series.json", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first, so a new version of the site shows up right away; the cache is only an offline fallback.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});

// The sender may send JSON ({ title, body, url, tag }) or plain text.
self.addEventListener("push", event => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  }
  const evening = data.kind === "evening" || data.type === "evening";
  const title = data.title || (evening ? "Good evening" : "Good morning");
  const options = {
    body: data.body || data.message || data.prompt || "A little encouragement for you today.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || (evening ? "amivo-evening" : "amivo-morning"),
    data: { url: data.url || (evening ? "./#journal" : "./") }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          return client.navigate(target).then(c => (c || client).focus()).catch(() => client.focus());
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
