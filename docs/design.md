# Christmas design

The page uses an evergreen night sky, cranberry actions, gold highlights, cream paper forms, soft snow, and slow Christmas lights. The serif headings and warm lit house reference the atmosphere of family Christmas films. The illustration, favicon, and app icons are original; no movie frames, characters, music, or logos are used.

The house illustration includes Santa's sleigh and reindeer. A small Nativity with Mary, Joseph, and the infant Jesus stands under the Star of Bethlehem. These are decorative background details outside the functional text and forms. The visible caption names the star in each supported language. The image has an empty alt attribute because the exchange workflow does not depend on interpreting it.

Snow and lights are pointer-transparent and hidden from assistive technology. They sit behind the content; paper panels keep snow away from inputs and text. Animations are slow, with no flashing or sound. The pause/play control is translated and remembers only an explicit preference. `prefers-reduced-motion` disables both effects regardless of saved preferences. No-JS content starts with effects paused.

The main form uses familiar native controls, visible focus, clear step hints, and a cream reading surface. Narrow layouts stack cards; desktop layouts use two columns for people and invitations. All static art and icons are precached, with the worker version bumped for this release.

## Copy and motion follow-up

The interface now uses direct instructions in all 3 languages. Headings name the task, such as “Who's taking part?”, and the steps say “Add names”, “Draw names”, and “Send the links”. The English HTML fallback is checked against the catalogue so the no-JS version does not retain old slogans.

Rounded panels, fields, buttons, windows, and tree shapes replace the harder edges and borders. Shadows are diffused, headings no longer use widely spaced capitals, and reading surfaces retain sufficient contrast.

The scene has separate local SVG layers for Santa's drifting sleigh, chimney smoke, and changing window glow. The Bethlehem star has a slow halo, while snowflakes drift at different speeds and rotations. Cards settle into place and the assignment opens with a brief transition after the user chooses to reveal it. These effects do not delay input, make network requests, or expose recipient details before consent.

Every continuous effect uses the shared `ambient-motion` class. Pausing freezes their timelines. Entry/reveal effects are only enabled while motion is playing, so pausing never leaves an input or invitation trapped in a partly hidden entrance frame. System reduced motion removes all effects, including button transitions. The worker version and complete asset allowlist were updated.

## Mobile language selector

The language picker occupies a full-width toolbar row on narrow screens. A native details/summary disclosure opens a labelled fieldset of native radio controls. The open panel matches the trigger width, wraps long labels, and scrolls internally when vertical space is limited. A small Stimulus controller measures the available height and opens the panel above the trigger when needed. Text is at least 16px and choice rows are at least 48px high.

Choice rows use fixed radio and icon columns with vertically centred text. Native radio margins are reset so browser defaults cannot offset the controls. The mobile label sits above the trigger to leave room for flags and enlarged text. Original local SVG icons show the UK flag for English, France for French, Brazil for Brazilian Portuguese, and a globe for Automatic. The selected icon also appears in the closed picker. Icons have empty alt text; language names remain the accessible labels. All four icons are precached for offline use.

The earlier native select fix only checked the closed control and popup opening. The user's screenshot showed the browser-owned popup overflowing the emulated viewport. The in-page panel now has directly testable bounds. Touch checks open it at 320px, 375 × 667px, and 390px in all 3 languages, measure every edge against the viewport, and select every choice. Additional checks cover keyboard navigation, Escape, outside clicks, focus return, landscape, short screens, and doubled root text size. Physical iOS and screen-reader review remain unverified. The worker version was bumped for the revised runtime.

## Review snapshots

- [Desktop organiser, 1440px](screenshots/desktop.webp)
- [Mobile organiser, 390px](screenshots/mobile.webp)
- [Open French language picker, 375 × 667px](screenshots/language-open.webp)

Organiser snapshots show effects paused; the open-picker snapshot keeps effects running. None contains personal draw data. These review assets are not precached.

## Verification

The design smoke script checks 320px, 375px, 390px, 768px, and 1440px in English, French, and Brazilian Portuguese. It checks overflow, pausing and persistence, normal reveal behaviour, and system reduced motion. At mobile widths it checks the open options panel, touch selection, readable text, hit-area size, and language changes. Desktop, mobile, open-picker, and reveal screenshots were inspected.

The optional axe audit runs WCAG A/AA rules against organiser/options, the open language picker, invitation cards, redraw dialog, pre-reveal, and revealed views in all 3 languages. These automated checks do not establish full accessibility conformance. Screen-reader use, physical-device touch behaviour, actual zoom, and native OS interfaces still need manual review.
