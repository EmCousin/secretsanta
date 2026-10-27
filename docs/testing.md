# Testing

## Dependency-free checks

Run `npm test` with Node 22 or newer. No installation is required. The suite covers draw correctness, every four-person exclusion configuration, input limits, URL encoding and v1 compatibility, optional storage, site privacy checks, and JavaScript syntax.

## Optional browser smoke checks

The shipped app and normal tests have no npm dependencies. The optional smoke script uses a separate Playwright installation. For example on Linux, with a system Chromium:

```sh
npm install --prefix /tmp/opencode/secretsanta-browser --no-save --package-lock=false playwright@1.56.1
```

Start `python3 -m http.server 8000 --bind 127.0.0.1` at the repository root in another terminal. Then:

```sh
PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-smoke.mjs
```

`BASE_URL` can select a different static host or subpath. `CHROMIUM_PATH` is optional if Playwright's matching browser is installed. The script creates isolated temporary browser contexts and closes them afterwards. It does not send invitations or deploy the app.

The script checks a 320px layout, drawing, exclusions, explicit reveal, local saving/restoring/deleting, confirmation before editing a finished draw, missing APIs, permission errors, share cancellation, blocked storage, corrupt saved copies, invalid invitations, untrusted text, no JavaScript, and absence of third-party requests. It checks Chromium only; emulated viewport sizes are not real-device testing.

## Manual release checklist

Run on Safari/iOS, Safari/macOS, Chrome/Android, desktop Chrome, Firefox, and Edge before calling those platforms verified. Do not mark a browser tested based on Chromium automation alone.

- [ ] Complete a draw on a narrow phone and desktop, including exclusions and optional gift hints.
- [ ] Use keyboard only. Check tab order, visible focus, native details, inline errors, redraw dialog, and focus after results/reveal. Ensure you can return from the dialog with Escape.
- [ ] Use a screen reader to check labels, status/error announcements, and absence of recipient details before reveal.
- [ ] Check 200% and 400% zoom, long Unicode names, and no horizontal scrolling at 320px.
- [ ] Try impossible exclusions, repeated names, deleting someone with an exclusion, an empty group, and the 50-person limit.
- [ ] Share a link into the intended messaging app. Ensure link previews are generic. Check cancellation and copy fallback on browsers without native sharing.
- [ ] Open the invitation in a different browser/device without prior storage. Reveal, reload, and reveal again.
- [ ] Save an unfinished draft, reload, restore, finish, save invitations, and restore without changing the draw.
- [ ] Block storage and clipboard access. The draw and manual link selection must remain usable.
- [ ] Delete the saved copy. Confirm shared links still work and unrelated origin storage is untouched.
- [ ] Draw again. Confirm old links still work and the warning is clear.
- [ ] Disable JavaScript or block the app module. Controls remain disabled and an explanation remains visible; no personal data is submitted.
- [ ] Host below a subpath. Check local assets and invitations without rewriting or SPA fallback rules.
- [ ] Check the network panel: static same-origin assets only; no fields or invitation fragments in request URLs.
- [ ] Check English, French, and Brazilian Portuguese, browser-language detection, English fallback, and the automatic/manual language selector. Switch languages before and after drawing/revealing; no fields or assignments should change.
- [ ] Open the language picker on each mobile browser, including landscape and enlarged text. Check the open panel stays within the screen, all choices remain reachable, radio arrows work, and Escape/outside taps/Tab dismiss it without trapping focus. Check the disclosure name and radio group with a screen reader.

## Verified in the initial implementation

- Node 24.13.0: 23 passing built-in tests, including all 4096 four-person exclusion configurations. Review follow-ups also check independent solver state, immutable invitation values, and absence of the dummy foundation controller.
- Chromium 155.0.8059.84 on Linux, through Playwright 1.56.1: 9 passing browser scenarios at the root URL and another 9 below `/party/` on a local static host. The mobile scenario uses a 320px viewport. A 390px full-page screenshot was also inspected.
- No third-party runtime requests or JavaScript console errors during the browser scenarios.
- Safari, Firefox, Edge, screen readers, physical phones, and browser-native messaging share sheets have not been verified. Copy/share results were simulated in the permission/success cases. The manual checklist remains open.

## Localisation verification

29 Node checks cover catalogue/interpolation parity, locale negotiation, stable error codes, and calendar-safe date formatting. The browser script now has 12 scenarios, including pt-BR detection, live switching without changing data or revealing assignments, persistent preferences, unsupported-language fallback, and blocked preference storage. Physical-device and native-speaker review remain recommended.

## Offline verification

The Node suite now has 34 tests, including complete precache coverage, manifest/icon validation, scope isolation, static-only caching, and failed-install cleanup. With the same external Playwright installation:

```sh
PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/pwa-smoke.mjs
```

This starts and closes its own temporary loopback-only static server. Six real service-worker scenarios pass in Chromium: offline reload/save/restore/new draw/new invitation/language switching, consent before update with unrelated caches preserved, and an interrupted update leaving the previous release usable. Each is repeated at `/` and `/party/`. It checks that no invitation payload appears in HTTP requests or cache keys. The 12 normal UI browser scenarios also pass with worker registration enabled.

Manual follow-ups: first-install failure UI, actual OS installation menus, iOS standalone mode, browser cache eviction, multiple long-lived tabs, and device-native sharing still need real-device verification.

## Christmas design verification

```sh
BASE_URL=http://localhost:8000/ PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/design-smoke.mjs
```

17 scenarios pass: every combination of en/fr/pt-BR with 320/375/390/768/1440px layouts, plus a keyboard/constrained-picker scenario and system reduced motion. They cover overflow, pause persistence, translated motion controls, and ordinary reveal behaviour. Mobile cases use touch emulation, including the reported 375 × 667px viewport. The script saves screenshots in `/tmp/opencode` by default; `SCREENSHOT_DIR` selects another existing directory. Selected review snapshots are in `docs/screenshots`.

For the optional accessibility checks, add only external tooling:

```sh
npm install --prefix /tmp/opencode/secretsanta-browser --no-save --package-lock=false playwright@1.56.1 @axe-core/playwright@4.11.0
BASE_URL=http://localhost:8000/ PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs AXE_MODULE=/tmp/opencode/secretsanta-browser/node_modules/@axe-core/playwright/dist/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/accessibility-smoke.mjs
```

18 axe WCAG A/AA scenarios pass: 6 UI states in each language, including expanded form options, the open language picker, results, modal confirmation, invitation guard, and revealed assignment. No automated violations were reported. Screen-reader review and physical devices remain required manual follow-ups. The 35 Node tests, 12 UI scenarios, and 6 real-worker scenarios also pass with the Christmas art included in offline caching.

The copy/motion follow-up adds an English HTML/catalogue synchronisation check. The design scenarios verify that the sleigh, smoke, windows, star, and snowflakes really have running animation timelines; pausing stops every ambient timeline, including its clock. They also test live reduced-motion changes and verify that paused/reduced entry effects never leave invitation cards hidden. Updated desktop/mobile screenshots were inspected, and the added illustration layers are included in the offline coverage check.

The mobile-picker follow-up checks 16px text, 48px minimum rows, fluid sizing, and centre-point hit testing. The original native-popup test did not check the popup's bounds. The replacement uses native details and radios in an in-page panel: tests tap it open, check every panel edge against the viewport, verify no internal horizontal overflow, and tap Automatic/English/French/Portuguese. Separate checks use native radio arrow navigation, Enter/Escape, Tab, and outside clicks. They also cover 667 × 375px landscape, a 375 × 280px short viewport, and doubled root text size at 320px, including reaching the last choice by scrolling the panel. A screenshot records the open French picker at 375 × 667px. Actual Safari/iOS, browser zoom, and screen readers still require manual checks.
