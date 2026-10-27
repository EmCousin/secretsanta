# Christmas design

The page uses an evergreen night sky, cranberry actions, gold highlights, cream paper forms, soft snow, and slow Christmas lights. The serif headings and warm lit house reference the atmosphere of family Christmas films. The illustration, favicon, and app icons are original; no movie frames, characters, music, or logos are used.

The house illustration includes Santa's sleigh and reindeer. A small Nativity with Mary, Joseph, and the infant Jesus stands under the Star of Bethlehem. These are decorative background details outside the functional text and forms, with no visible caption. The image has an empty alt attribute because the exchange workflow does not depend on interpreting it.

Snow and lights are pointer-transparent and hidden from assistive technology. They sit behind the content; paper panels keep snow away from inputs and text. Animations are slow, with no flashing or sound. They run automatically, with no in-app toggle or motion storage. `prefers-reduced-motion` disables all effects and is followed when the system setting changes. Old motion preferences are ignored without reading, writing, or deleting browser storage. No-JS content starts with effects paused.

The main form uses familiar native controls, visible focus, and a cream reading surface. Names use compact rows in one column; invitation cards use two columns on desktop and stack on phones. All static art and icons are precached, with the worker version bumped for this release.

## Copy and motion follow-up

The interface uses direct instructions in all 3 languages. Headings name the task, such as “Who's taking part?”, and buttons name their action. The English HTML fallback is checked against the catalogue so the no-JS version does not retain old slogans.

Rounded panels, fields, buttons, windows, and tree shapes replace the harder edges and borders. Shadows are diffused, headings no longer use widely spaced capitals, and reading surfaces retain sufficient contrast.

The scene has separate local SVG layers for Santa's drifting sleigh, chimney smoke, and changing window glow. The Bethlehem star has a slow halo, while snowflakes drift at different speeds and rotations. Cards settle into place and the assignment opens with a brief transition after the user chooses to reveal it. These effects do not delay input, make network requests, or expose recipient details before consent.

Every continuous effect uses the shared `ambient-motion` class. Entry/reveal effects are only enabled while motion is playing. System reduced motion removes all effects, including button transitions, without leaving inputs or invitations trapped in a partly hidden entrance frame. The worker version and complete asset allowlist were updated.

## Mobile language selector

The language picker is a quiet toolbar disclosure with a small flag/globe and the current interface code (EN, FR, or PT-BR). The full translated label and selected preference remain available to assistive technology. Its closed surface is transparent; a subtle background and border appear on hover or opening. It stays at the right of the toolbar on narrow screens and with enlarged text.

A native details/summary disclosure opens a labelled fieldset of native radio controls. The panel is right-aligned and sized independently of the compact trigger, up to 20rem or the viewport minus side gutters. Full language names wrap and scroll internally when vertical space is limited. A small Stimulus controller measures the available height and opens the panel above the trigger when needed. Text is at least 16px, with a 48px minimum trigger and choice rows.

Choice rows use fixed radio and icon columns with vertically centred text. Native radio margins are reset so browser defaults cannot offset the controls. Original local SVG icons show the UK flag for English, France for French, Brazil for Brazilian Portuguese, and a globe for Automatic. The selected icon also appears in the closed picker. With Automatic selected, the compact code reflects the detected interface language. Icons have empty alt text; full language/preference names remain the accessible labels. All four icons are precached for offline use.

The earlier native select fix only checked the closed control and popup opening. The user's screenshot showed the browser-owned popup overflowing the emulated viewport. The in-page panel now has directly testable bounds. Touch checks open it at 320px, 375 × 667px, and 390px in all 3 languages, measure every edge against the viewport, and select every choice. Additional checks cover keyboard navigation, Escape, outside clicks, focus return, landscape, short screens, and doubled root text size. Physical iOS and screen-reader review remain unverified. The worker version was bumped for the revised runtime.

## Simpler first draw

A visible “Start a draw” button sits before the welcome illustration. It focuses the first name without navigating or changing a URL fragment. With an existing draw it focuses the results instead of resetting them. If every name was removed, it focuses the Add button. The CTA remains disabled until organiser initialization succeeds.

The mobile illustration is smaller. Setup starts with compact name rows; gift hints and exchange details stay collapsed. The exchange name retains its translated default inside optional details. Enter moves to the next name or adds a row; IME confirmation and Enter in gift hints keep their normal behaviour. Draw discards only unused trailing rows beyond the first two, never a row with a hint or an exclusion. Removing someone focuses the neighbouring name or Add button. Native validation opens collapsed details before focusing an invalid field.

Local saving is still explicit and optional, below the form/results. Repeated setup headings, the numbered instruction strip, and duplicate footer copy are removed. Essential sharing, redraw, local-storage, and update warnings remain. Completed results replace the setup heading; returning to edit restores it.

Invitation links hide the organiser welcome and open on a compact, personalised invitation with the existing gift icon, a short privacy reminder, and the reveal button. The generic title and metadata stay unchanged. Routing and language changes preserve the invitation fragment, and recipients remain absent until an explicit reveal. Leaving the invitation clears revealed text, including when Stimulus disconnects after its controller attribute is removed. New envelope artwork, sharing-card changes, couple exclusions, and bulk entry are outside this pass.

## Review snapshots

- [Desktop organiser, 1440px](screenshots/desktop.webp)
- [Mobile organiser, 390px](screenshots/mobile.webp)
- [Open French language picker, 375 × 667px](screenshots/language-open.webp)
- [Compact mobile name entry](screenshots/name-entry.webp)
- [Participant invitation, 375 × 667px](screenshots/invitation.webp)

Screenshot tooling temporarily freezes effects for organiser and participant captures; the app itself keeps automatic motion. The open-picker snapshot keeps effects running. Names in the participant snapshot are test fixtures. These review assets are not precached.

## Verification

The design smoke script checks 320px, 375px, 390px, 768px, and 1440px in English, French, and Brazilian Portuguese. It checks overflow, automatic motion after reload, absence of motion controls/storage access, normal reveal behaviour, and live system reduced motion. At mobile widths it checks the open options panel, touch selection, readable text, hit-area size, and language changes. Desktop, mobile, open-picker, and reveal screenshots were inspected.

The optional axe audit runs WCAG A/AA rules against organiser/options, the open language picker, invitation cards, redraw dialog, pre-reveal, and revealed views in all 3 languages. These automated checks do not establish full accessibility conformance. Screen-reader use, physical-device touch behaviour, actual zoom, and native OS interfaces still need manual review.
