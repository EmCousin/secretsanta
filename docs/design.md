# Christmas design

The page uses an evergreen night sky, cranberry actions, gold highlights, cream paper forms, soft snow, and slow Christmas lights. The serif headings and warm lit house reference the atmosphere of family Christmas films. The illustration, favicon, and app icons are original; no movie frames, characters, music, or logos are used.

The house illustration includes Santa's sleigh and reindeer. A small Nativity with Mary, Joseph, and the infant Jesus stands under the Star of Bethlehem. These are decorative background details outside the functional text and forms. The visible caption names the star in each supported language. The image has an empty alt attribute because the exchange workflow does not depend on interpreting it.

Snow and lights are pointer-transparent and hidden from assistive technology. They sit behind the content; paper panels keep snow away from inputs and text. Animations are slow, with no flashing or sound. The pause/play control is translated and remembers only an explicit preference. `prefers-reduced-motion` disables both effects regardless of saved preferences. No-JS content starts with effects paused.

The main form uses familiar native controls, visible focus, clear step hints, and a cream reading surface. Narrow layouts stack cards; desktop layouts use two columns for people and invitations. All static art and icons are precached, with the worker version bumped for this release.

## Review snapshots

- [Desktop organiser, 1440px](screenshots/desktop.webp)
- [Mobile organiser, 390px](screenshots/mobile.webp)

Snapshots show effects paused for inspection and contain no personal draw data. They are review assets, not runtime assets. They are not precached.

## Verification

The design smoke script checks 320px, 390px, 768px, and 1440px in English, French, and Brazilian Portuguese. It checks overflow, pausing and persistence, normal reveal behaviour, and system reduced motion. Desktop, mobile, and reveal screenshots were inspected.

The optional axe audit runs WCAG A/AA rules against organiser/options, invitation cards, redraw dialog, pre-reveal, and revealed views in all 3 languages. These automated checks do not establish full accessibility conformance. Screen-reader use, physical-device touch behaviour, actual zoom, and native OS interfaces still need manual review.
