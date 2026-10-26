# Project rules

- Read [the product specification](https://github.com/EmCousin/secretsanta/issues/1) before changing behaviour. Work through linked issues and focused PRs.
- Keep the runtime static: HTML, CSS, native JS modules, and self-hosted Stimulus. No build step, backend, accounts, analytics, CDNs, or remote fonts.
- The root `index.html` is the static entry point. Browser behaviour belongs in `apps/web`; framework-independent logic belongs in `packages/core`.
- HTML owns the structure. Use native controls, details, validation, labels, and visible focus. Stimulus controllers add small behaviours, never framework-specific draw logic.
- JS is required for drawing and decoding. Prevent native submissions of personal data even if initialization fails. Enable JS-only controls only after successful initialization.
- Draws stay on the device. Invitations use versioned URL fragments. Encoding is not encryption. An organiser holding everyone's links can deliberately reveal assignments.
- Never log assignments, include recipient names in titles/metadata, or insert untrusted text with `innerHTML`.
- Local saving is explicit and optional. Do not clear unrelated origin storage. Old invitations cannot be revoked by a redraw or deletion.
- Vendor updates must pin a version and retain the upstream licence. No production dependency fetches.
- Run `npm test` before opening a PR. No install is required. Add regression tests for domain changes and update the browser checklist for UI changes.
- Leave PRs unmerged unless the user asks to merge. State dependencies and merge order for stacked PRs.
