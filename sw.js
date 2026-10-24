// Offline support: the whole app is cached on install and served from the cache.
// Bump VERSION with every release so installed apps pick up the new files.
const VERSION = 'v3';
const CACHE = `feed-my-horse-${VERSION}`;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/calendar.js',
  'js/schedule.js',
  'js/store.js',
  'js/texts.js',
  ...['box_empty', 'box_full', 'morning', 'day', 'night', 'options', 'close_button',
    'clock_face', 'clock_hour_hand', 'clock_minute_hand',
    'language_english', 'language_french', 'language_german', 'language_hungarian',
    'icon-180', 'icon-192', 'icon-512'].map(name => `img/${name}.png`),
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin)
    return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true })
    .then(cached => cached ?? fetch(event.request)));
});
