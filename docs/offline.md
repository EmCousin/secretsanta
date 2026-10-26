# Offline maintenance

`service-worker.js` lives at the repository root and defaults to the hosting directory's scope. `manifest.webmanifest` uses relative scope, identity, and start URLs. Both work at `/` and below a subpath without rewrite rules.

## Release discipline

1. Update the worker's `ASSETS` list whenever a runtime file is added, renamed, or removed. Include catalogues, images, modules, CSS, and manifest icons. Keep tests and private documents out of it.
2. Bump `CACHE_VERSION` whenever any precached runtime file changes. All files in one cache must belong to the same release.
3. Run `npm test`, the ordinary browser smoke script, and `scripts/pwa-smoke.mjs`.
4. Deploy static files together; serve `service-worker.js` without a long-lived immutable HTTP cache. Do not cache HTML permanently at the host. The registration uses `updateViaCache: 'none'`.
5. Keep existing invitation format decoders. A successful offline update must not break old links.

The initial installation caches the allowlist as a batch. Failed installation does not activate the new release. Old caches are removed only after activation, and only for this app's scope. The worker does not call `skipWaiting()` during install: the user requests activation through the update control, or the browser activates it after old clients close. Existing page state is discarded only after the user confirms a reload.

The worker uses cached release assets rather than mixing freshly fetched HTML with old modules. Ordinary runtime requests are never added to the cache. Query variants and invitation-specific navigations cannot become cache keys. It does not intercept sibling pages or unrelated resources.

The root HTML's CSP allows same-origin connections and workers, needed to prepare static caches; it still blocks remote sources and native form submissions. There is no background sync, push subscription, analytics, or application API.

## Limits

- First offline use on a new device is impossible without an earlier successful online visit.
- Browsers can evict caches or local storage. Saving a draw and keeping private links are separate responsibilities.
- Service workers require HTTPS except on localhost. Installation UI and support vary by browser; verify real Safari/iOS and Android devices before declaring them supported.
- Updates do not silently migrate or restore an unfinished exchange. Save or copy links before accepting a reload.
