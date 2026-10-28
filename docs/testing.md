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
- [ ] The welcome artwork has no caption in any language; the house, Nativity, and star remain visible.
- [ ] On the first mobile screen, use Start a draw to reach the first name. With existing results, verify it returns to those results without redrawing or changing links.
- [ ] Check the actual first input is on-screen after the CTA, not merely focused. Test short mobile viewports, long groups, and a scrolled page. The focus ring should not compete with a second row outline.
- [ ] On desktop, welcome and setup sit side by side. Switching sections closes the previous section with an animation; reduced motion disables it. Long lists and expanded hints scroll within the active section without moving the welcome column. Check short screens and zoom remain usable with document scrolling.
- [ ] Swipe over the beige participant area on a real phone, including when the list is short or expanded: the page must scroll normally. On desktop, wheel over the active panel and continue scrolling past either edge; the page must not be trapped. Check touch, trackpad, mouse and keyboard on actual devices.
- [ ] Open and close sections rapidly on mobile and desktop. Movement should feel responsive, inputs and scrolling should remain usable, and system reduced motion should disable the transition. Check on physical devices as well as in automated tests.
- [ ] Compare the section movement and twinkling lights on a physical phone after the batched-layout change. Confirm normal page scrolling and a live switch to reduced motion during a transition; simulated Chromium timing is not a device performance guarantee.
- [ ] Check the viewport-fixed sky on a physical phone, including scrolling and section switches. Compare responsiveness with the previous release; simulated raster-work reductions do not guarantee smoother device performance.
- [ ] For the instant-mobile experiment, turn off system reduced motion, then compare responsiveness over at least ten section switches. Confirm snow and Santa still move and page scrolling remains normal.
- [ ] An expanded hint is visibly grouped with its own participant, with clear spacing before the next name. Collapsed rows stay compact and name input columns stay aligned.
- [ ] In Rules, add and remove both kinds of directed rule. Check direct contradictions and an impossible combination show an actionable error without adding the rule. Save and restore a draft, draw, and check a forced invitation. Verify editing a completed draw still requires confirmation.
- [ ] Check festive headings/buttons and French/Portuguese accents, online and offline. Form entries must stay easy to read, and the app must remain usable with a serif fallback if its local font is blocked.
- [ ] Enter advances name entry, never draws; verify mobile Next keyboards and East Asian IME confirmation. Remove a middle/last/all participant and check focus. An unused trailing row can be ignored on Draw, but a row with a hint or exclusion must be kept.
- [ ] Confirm Settings has no exchange-name, budget or date inputs. Restore a pre-existing saved exchange with these values and verify its invitations still display them after reveal.
- [ ] Open an invitation in a fresh mobile tab. The organiser hero is absent and the reveal action is easy to reach. Check malformed links, language changes, reload before/after reveal, and back/forward fragment navigation without stale revealed text.
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
- [ ] Check radio, flag, and text alignment, including wrapped labels and enlarged text. Confirm the selected flag (or Automatic globe) appears in the closed picker and all icons load offline. Screen readers should announce language names without flag descriptions.
- [ ] Check the compact toolbar code reflects the active language, including browser detection. The closed trigger stays discreet, while opening it shows full names within the screen.
- [ ] Animations start automatically with no in-app motion control. Toggle system reduced motion while the page is open: all effects should stop/restart without changing names, links, or reveal state. Verify old saved motion settings have no effect and no new motion preference is stored.
- [ ] Open the language picker on each mobile browser, including landscape and enlarged text. Check the open panel stays within the screen, all choices remain reachable, radio arrows work, and Escape/outside taps/Tab dismiss it without trapping focus. Check the disclosure name and radio group with a screen reader.

## Verified in the initial implementation

- Node 24.13.0: 23 passing built-in tests, including all 4096 four-person exclusion configurations. Review follow-ups also check independent solver state, immutable invitation values, and absence of the dummy foundation controller.
- Chromium 155.0.8059.84 on Linux, through Playwright 1.56.1: 9 passing browser scenarios at the root URL and another 9 below `/party/` on a local static host. The mobile scenario uses a 320px viewport. A 390px full-page screenshot was also inspected.
- No third-party runtime requests or JavaScript console errors during the browser scenarios.
- Safari, Firefox, Edge, screen readers, physical phones, and browser-native messaging share sheets have not been verified. Copy/share results were simulated in the permission/success cases. The manual checklist remains open.

## Localisation verification

29 Node checks cover catalogue/interpolation parity, locale negotiation, stable error codes, and calendar-safe date formatting. The browser script now has 23 scenarios, including pt-BR detection, live switching without changing data or revealing assignments, persistent preferences, unsupported-language fallback, blocked preference storage, and the simpler entry flow in all 3 languages. Physical-device and native-speaker review remain recommended.

## Offline verification

The Node suite now has 34 tests, including complete precache coverage, manifest/icon validation, scope isolation, static-only caching, and failed-install cleanup. With the same external Playwright installation:

```sh
PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/pwa-smoke.mjs
```

This starts and closes its own temporary loopback-only static server. Six real service-worker scenarios pass in Chromium: offline reload/save/restore/new draw/new invitation/language switching and local font loading, consent before update with unrelated caches preserved, and an interrupted update leaving the previous release usable. Each is repeated at `/` and `/party/`. It checks that no invitation payload appears in HTTP requests or cache keys. The 23 normal UI browser scenarios also pass with worker registration enabled.

Manual follow-ups: first-install failure UI, actual OS installation menus, iOS standalone mode, browser cache eviction, multiple long-lived tabs, and device-native sharing still need real-device verification.

## Christmas design verification

```sh
BASE_URL=http://localhost:8000/ PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/design-smoke.mjs
```

18 scenarios pass: every combination of en/fr/pt-BR with 320/375/390/768/1440px layouts, plus keyboard/constrained-picker, legacy motion storage, and system reduced-motion scenarios. They cover overflow, automatic animation after reload, absence of motion controls/storage access, and ordinary reveal behaviour. Mobile cases use touch emulation, including the reported 375 × 667px viewport. The script saves screenshots in `/tmp/opencode` by default; `SCREENSHOT_DIR` selects another existing directory. Selected review snapshots are in `docs/screenshots`.

For the optional accessibility checks, add only external tooling:

```sh
npm install --prefix /tmp/opencode/secretsanta-browser --no-save --package-lock=false playwright@1.56.1 @axe-core/playwright@4.11.0
BASE_URL=http://localhost:8000/ PLAYWRIGHT_MODULE=/tmp/opencode/secretsanta-browser/node_modules/playwright/index.mjs AXE_MODULE=/tmp/opencode/secretsanta-browser/node_modules/@axe-core/playwright/dist/index.mjs CHROMIUM_PATH=/usr/bin/chromium node scripts/accessibility-smoke.mjs
```

21 axe WCAG A/AA scenarios pass: 7 UI states in each language, including participant and settings sections, the open language picker, results, modal confirmation, invitation guard, and revealed assignment. No automated violations were reported. Screen-reader review and physical devices remain required manual follow-ups. The 36 Node tests, 24 UI scenarios, and 6 real-worker scenarios also pass with the Christmas art and font included in offline caching.

The copy/motion follow-up adds an English HTML/catalogue synchronisation check. The design scenarios verify that the sleigh, smoke, windows, star, and snowflakes have running animation timelines by default. They test live reduced-motion changes and verify that entry effects never leave invitation cards hidden. A legacy paused setting is seeded while storage methods are instrumented: it must have no effect, and motion must never read, write, or delete storage. Updated desktop/mobile screenshots were inspected, and the illustration layers are included in the offline coverage check.

The mobile-picker follow-up checks 16px text, a 48px minimum trigger/rows, compact trigger width, and centre-point hit testing. The original native-popup test did not check the popup's bounds. The replacement uses native details and radios in an in-page panel: tests tap it open, check every panel edge against the viewport, verify no internal horizontal overflow, and tap Automatic/English/French/Portuguese. The panel stays wider than the discreet trigger, and the compact code follows the active language. Separate checks use native radio arrow navigation, Enter/Escape, Tab, and outside clicks. They also cover 667 × 375px landscape, a 375 × 280px short viewport, and doubled root text size at 320px, including reaching the last choice by scrolling the panel. A screenshot records the open French picker at 375 × 667px. Actual Safari/iOS, browser zoom, and screen readers still require manual checks.

Alignment checks measure the vertical centres of each native radio, local flag/globe icon, and text label (within 1px), and verify the columns line up across all choices. They include wrapped text and doubled root text size. Tests also check icon loading, selected-icon updates, and unchanged accessible radio names. The worker scenarios verify every language icon loads after an offline reload.

## Simpler-entry verification

The 23 UI scenarios include first-screen CTA visibility at 375 × 667px in en/fr/pt-BR, focus and visible input bounds without navigation, compact rows, Enter/empty Enter, synthetic IME confirmation, hint newlines, neighbour focus, safe trailing-row removal, a 50-person limit, removing all names, and native validation of collapsed fields. They verify the CTA preserves completed invitation links and no draw is saved automatically. Invitation cases check first-screen reveal visibility, hidden organiser welcome, generic metadata, no recipient before reveal or after reload, language switching, and clearing revealed text when leaving the route. Physical mobile keyboards and real IME behaviour remain manual checks.

Six desktop cases verify side-by-side layout and a viewport-contained workspace at 1366 × 768px and 1440 × 900px in every language. They compare column coordinates when hints expand, exercise larger groups and internally scrolling results, and verify the input focus ring. Accordion checks cover rapid switching, keyboard navigation and reduced motion. A short 375 × 400px mobile case checks scrolling to the first input while preserving the URL and typed names.

The Rules follow-up adds exhaustive three-person forced/excluded matching tests, saved-copy compatibility, a browser save/restore/draw scenario and axe checks for the Rules panel in each language. Current checks: 39 Node tests, 25 browser scenarios, 18 design scenarios, 24 axe scenarios and 6 real-worker scenarios. Manual device, screen-reader and native-speaker checks remain outstanding.

The design suite has 18 scenarios and the axe suite remains 18. Updated snapshots show the desktop workspace, mobile welcome, compact entry, and direct participant entrance. A new Node check pins the local font's binary hash and licence; browser checks load accented text, and real-worker scenarios load it offline. The font licence and binary are allowlisted, with a bumped cache release. No runtime build step or remote font dependency was added.
