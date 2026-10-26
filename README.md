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
- [Remaining reference-app parity](https://github.com/EmCousin/secretsanta/issues/7): forced pairings, bulk entry, export choices, and French localisation remain open follow-ups. This initial app is English only.

Implementation is reviewed through pull requests. Stacked PRs identify their prerequisite and merge order.

## Privacy

The organiser avoids seeing assignments during normal use. Anyone with a participant's invitation can reveal that assignment. This is spoiler protection, not protection against a curious organiser.

Draw details stay in the browser. Invitations will carry their own data in a URL fragment, which is not sent in an HTTP request to the static host. The host still receives ordinary website requests. Messaging providers and anyone holding a link may access its contents. Encoding is not encryption. Old links cannot be remotely revoked.

No analytics, third-party runtime assets, accounts, or application backend are used. Self-hosted Stimulus is distributed under its [upstream MIT licence](apps/web/vendor/LICENSE.md). This project is inspired by [arcanis/secretsanta](https://github.com/arcanis/secretsanta); its application source has not been copied.

## Use

Add people, optional gift hints, and directed exclusions. Run the draw and privately send each person's invitation. The organiser sees giver-labelled cards, not recipients. Participants explicitly reveal their own assignments.

Saving drafts and invitations is optional. Use **Save or restore on this device** to keep one readable local copy. No data is saved automatically. Deleting the copy does not revoke shared links. Editing a completed exchange requires confirmation; a new draw requires sending everyone new links. There are no delivery receipts or remote updates to gift hints and instructions.

JavaScript is required for local drawing and invitation decoding. Without it, controls remain disabled and an explanation remains visible. Optional sharing, clipboard, and storage features have fallbacks. See [testing instructions and the device checklist](docs/testing.md).

## Static hosting

Publish the repository's files to an HTTPS static host, with the repository root as the document root. There is no build output or server application, and no route rewrites are needed. Relative assets and fragment invitations also work below a subpath. Exclude `.git`, tests, and development documentation from a public deployment if the host would otherwise expose them. Do not deploy a checkout containing personal draw data.

If the host supports response headers, add `Content-Security-Policy: frame-ancestors 'none'` to prevent embedding; that directive cannot be enforced through the HTML meta policy. The meta policy already restricts script/style sources, connections, and form submissions. Deployments must continue serving v1-compatible invitation decoding so previously shared links remain usable. No deployment is configured by this repository.
