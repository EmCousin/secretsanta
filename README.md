# Secret Santa

A Secret Santa app for families and friends. Open a link, draw names, and share private invitations. No accounts, application backend, or build step.

## Run locally

Serve the repository root with any static HTTP server. For example, with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. Opening `index.html` through `file://` is unsupported because native JavaScript modules require HTTP. Use HTTPS when hosting so browser sharing, clipboard, and cryptographic APIs work reliably. No dependency installation or build is required.

## Test

With Node 22 or newer:

```sh
npm test
```

Tests use Node's built-in runner. The project has no npm dependencies.

## Structure

- `index.html`: static entry point, also works below a hosting subpath.
- `apps/web`: HTML-connected Stimulus controllers, optional storage, styles, and pinned local Stimulus distribution.
- `packages/core`: plain-JS assignment and invitation logic, independent of the UI.
- `tests`: static-site checks. Domain tests live beside their package.

The root manifest declares npm workspaces for organisation only. Browser imports use relative module URLs, not package resolution. No native clients, bundler, backend, or deployment are configured.

## Specification and delivery

- [Product specification](https://github.com/EmCousin/secretsanta/issues/1)
- [Repository foundation](https://github.com/EmCousin/secretsanta/issues/3)
- [Draw engine and invitation format](https://github.com/EmCousin/secretsanta/issues/4)
- [Organiser and participant experience](https://github.com/EmCousin/secretsanta/issues/2)
- [Remaining reference-app parity](https://github.com/EmCousin/secretsanta/issues/7): forced pairings, bulk entry, and export choices remain open follow-ups.
- [Localisation](https://github.com/EmCousin/secretsanta/issues/9): English, French, and Brazilian Portuguese.
- [Offline/PWA support](https://github.com/EmCousin/secretsanta/issues/11): installable static app with versioned, app-scoped offline caching.
- [Christmas design](https://github.com/EmCousin/secretsanta/issues/10): original snowy-house, Santa, and Nativity artwork, with pausable snow and lights.

Implementation is reviewed through pull requests. Stacked PRs identify their prerequisite and merge order.

## Privacy

The organiser avoids seeing assignments during normal use. Anyone with a participant's invitation can reveal that assignment. This is spoiler protection, not protection against a curious organiser.

Draw details stay in the browser. Invitations will carry their own data in a URL fragment, which is not sent in an HTTP request to the static host. The host still receives ordinary website requests. Messaging providers and anyone holding a link may access its contents. Encoding is not encryption. Old links cannot be remotely revoked.

No analytics, third-party runtime assets, accounts, or application backend are used. Self-hosted Stimulus is distributed under its [upstream MIT licence](apps/web/vendor/LICENSE.md). This project is inspired by [arcanis/secretsanta](https://github.com/arcanis/secretsanta); its application source has not been copied.

## Use

Add people, optional gift hints, and directed exclusions. Run the draw and privately send each person's invitation. The organiser sees giver-labelled cards, not recipients. Participants explicitly reveal their own assignments.

Saving drafts and invitations is optional. Use **Save or restore on this device** to keep one readable local copy. No data is saved automatically. Deleting the copy does not revoke shared links. Editing a completed exchange requires confirmation; a new draw requires sending everyone new links. There are no delivery receipts or remote updates to gift hints and instructions.

JavaScript is required for local drawing and invitation decoding. Without it, controls remain disabled and an explanation remains visible. Optional sharing, clipboard, and storage features have fallbacks. See [testing instructions and the device checklist](docs/testing.md).

## Languages

The app selects the first supported language in the browser's preference list. English and French regional variants map to `en` and `fr`; Portuguese variants map to Brazilian Portuguese (`pt-BR`). Unsupported lists fall back to English. Choose a language explicitly or return to **Automatic (browser)** using the selector. Only explicit language preferences are remembered, and selection still works when storage is blocked.

Catalogues are local JS modules in `apps/web/i18n`, with English fallback per key. Static HTML stays readable in English if JavaScript fails. Switching language updates labels, templates, dates, errors, sharing copy, and statuses without changing the draw or revealing an assignment. User-written names, hints, budgets, and notes are preserved, not translated. Native browser validation and OS sharing sheets use the browser/OS language. Core errors expose stable codes and parameters; diagnostic English messages and v1 invitation payloads remain compatible.

## Static hosting

Publish the repository's files to an HTTPS static host, with the repository root as the document root. There is no build output or server application, and no route rewrites are needed. Relative assets and fragment invitations also work below a subpath. Exclude `.git`, tests, and development documentation from a public deployment if the host would otherwise expose them. Do not deploy a checkout containing personal draw data.

If the host supports response headers, add `Content-Security-Policy: frame-ancestors 'none'` to prevent embedding; that directive cannot be enforced through the HTML meta policy. The meta policy already restricts script/style sources, connections, and form submissions. Deployments must continue serving v1-compatible invitation decoding so previously shared links remain usable. No deployment is configured by this repository.

## Offline use and installation

Open the site online once and wait for **Ready to use offline on this device**. Then drawing, language switching, explicit local saving/restoring, and revealing self-contained invitations work without a connection. A different device must complete its own online first visit. Browsers may evict caches; offline readiness cannot guarantee permanent storage. Sending a link through a messaging service still needs a connection.

Use the browser's Install/Add to Home Screen menu where available; iOS Safari exposes it through Share. Installation is optional and does not create an account. HTTPS or localhost is required for service workers and cryptographic browser APIs. Private browsing or restrictive settings may disable offline caching; the app remains usable online.

The worker caches only a fixed list of static files. It canonicalises app navigations to the cached HTML; it never stores invitation fragments, query variants, forms, or personal results. Saved exchanges remain a separate explicit action. Same-origin requests are allowed by CSP for worker installation; external connections remain blocked.

Updates install a complete new cache before activation. An active page offers an update button and a warning before reload; it does not reload automatically or save your work silently. See [offline maintenance](docs/offline.md) and [tests](docs/testing.md).

## Christmas design

The original local illustration includes a warm Christmas house, Santa's sleigh, and a Nativity scene with Mary, Joseph, the infant Jesus, and the Star of Bethlehem. Evergreen, cranberry, gold, falling snow, and twinkling lights carry through the organiser and participant screens. Desktop welcome and setup sit side by side; expanded fields grow naturally. A locally hosted, pinned Berkshire Swash font adds festive calligraphy to headings and primary buttons, with its upstream licence retained. Form fields keep system fonts for readability. The visual direction evokes a cosy Christmas film without including movie assets.

Animations run automatically, with no in-app toggle or saved motion preference. System reduced-motion settings disable them; the layout and artwork remain complete without animation or JavaScript. No external fonts, media, or audio are loaded. [Design notes and review screenshots](docs/design.md) describe the artwork and accessibility checks.
