// Bump the version whenever any precached runtime file changes. Install the
// whole release before activation; do not replace a running app without consent.
const CACHE_VERSION = '2026-10-28-instant-mobile-1';
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `secretsanta-shell:${encodeURIComponent(SCOPE.pathname)}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './apps/web/app.js',
  './apps/web/styles.css',
  './apps/web/icon.svg',
  './apps/web/fonts/BerkshireSwash-Regular.ttf',
  './apps/web/fonts/OFL.txt',
  './apps/web/art/christmas-scene.svg',
  './apps/web/art/chimney-smoke.svg',
  './apps/web/art/sleigh.svg',
  './apps/web/art/window-lights.svg',
  './apps/web/art/languages/auto.svg',
  './apps/web/art/languages/en.svg',
  './apps/web/art/languages/fr.svg',
  './apps/web/art/languages/pt-BR.svg',
  './apps/web/icons/icon-192.png',
  './apps/web/icons/icon-512.png',
  './apps/web/icons/apple-touch-icon.png',
  './apps/web/vendor/stimulus.js',
  './apps/web/localization.js',
  './apps/web/section-accordion.js',
  './apps/web/storage.js',
  './apps/web/i18n/index.js',
  './apps/web/i18n/en.js',
  './apps/web/i18n/fr.js',
  './apps/web/i18n/pt-BR.js',
  './apps/web/controllers/page_controller.js',
  './apps/web/controllers/exchange_controller.js',
  './apps/web/controllers/invitation_controller.js',
  './apps/web/controllers/share_controller.js',
  './apps/web/controllers/locale_controller.js',
  './apps/web/controllers/pwa_controller.js',
  './apps/web/controllers/festivity_controller.js',
  './packages/core/draw.js',
  './packages/core/invitations.js',
  './packages/core/validation.js',
  './packages/core/utils/random.js',
];
const URLS = ASSETS.map(path => new URL(path, SCOPE).href);
const ALLOWED = new Set(URLS);
const INDEX = new URL('./index.html', SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const existed = await caches.has(CACHE_NAME);
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload', credentials: 'same-origin' })));
    } catch (error) {
      if (!existed) await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin) return;
  const appNavigation = request.mode === 'navigate' && (url.pathname === SCOPE.pathname || url.href.split(/[?#]/)[0] === INDEX);
  if (!appNavigation && (url.search || !ALLOWED.has(url.href))) return;
  const canonical = appNavigation ? INDEX : url.href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Never cache runtime navigations, query variants, invitation data, or any
    // resource outside the explicit static allowlist.
    return await cache.match(canonical) || fetch(appNavigation ? new Request(INDEX) : request);
  })());
});
