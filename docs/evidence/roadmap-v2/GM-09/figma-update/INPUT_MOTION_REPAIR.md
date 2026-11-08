# GM-09 — native code cursor and tutorial motion

2026-11-02. Branch `codex/gm-09-figma-update`, base4776244. Owner Tuấn/reviewer Trí.
User supplied two new actual Android screenshots in `.work/gm09-error-screens/`:
the focused room-code field has no caret, and Android's composing text paints
the whole string over the separately rendered character cells.

Start gate: live Project at2026-11-02T06:59:43Z, `READY_TO_CLAIM`. This checks
dependencies only, not task acceptance. Source/screenshot hashes are pinned in
[manifest](INPUT_MOTION_MANIFEST.json); original device images remain ignored.

## Scope decision

[GM-09](../../../../../tasks/backlog/GM-09.md) owns first-use tutorial with its
own sample state, NO/OK/WANT practice, skip/replay/Back and no real room/ballot
side effects. [UI spec](../../../../specs/UI_SPEC.md) UI-01 maps this to GM-09;
UI-06 maps the actual round-one flashcard to GM-12/26. The task does not specify
exact spring/pulse timing. The user's current request authorizes adding visible
gesture feedback to the GM-09 tutorial, and that is the only card changed here.
No production voting screen, contract, domain policy or API integration changes.

Plan executed: inspect native screenshots/source → replace hidden room-code
overlay with real editable cells → add isolated tutorial motion/feedback →
Android/Reduce Motion interaction tests and full regression → export/evidence.

## Room-code entry

Remove the full-width transparent TextInput and duplicate decorative Text
characters. Each of six native TextInputs renders its own value and OS caret;
active cell has a highlighted border/background. Android uses visible-password
input mode for plain Latin room codes, with spellcheck/autocorrect/autofill off,
so a composing/prediction string is not painted across simulated cells.

- Typing/paste normalizes uppercase. Pasting all six characters into any cell
  replaces the complete code once. No automatic preview/join mutation.
- Editing preserves the rest of the code; deletion shifts the contiguous suffix.
  Backspace in the next empty cell deletes the preceding character.
- Focus advances after input. A tap in a later empty cell returns to the first
  empty position; filled cells support selection and replacement. Next/Done
  keyboard actions focus the following cell or dismiss the keyboard.
- Native context-menu paste remains available. Disabled/unknown/accepted join
  state freezes all cells through the existing submission guard.
- Cells stay at least48dp wide and58dp tall. Six columns are used when available
  inner width is at least328dp; narrow layouts or font scale>1.3 wrap to3 × 2.
  This is a responsive accessibility difference from the reference's412dp row.
  Keyboard avoidance/scroll remain provided by HomeFlowFrame.

Existing product join tests now read the six native values. Legacy real/QA join
inputs keep their existing implementation and regression assertions. Five new
component cases cover native caret/focus styling, no duplicate text, paste,
replacement/deletion, Backspace and frozen intent.

## Tutorial card feedback

Use React Native's received Animated/PanResponder APIs; no new package/native
module, font or baseline configuration. The card follows a horizontal gesture
(clamped±120dp and small vertical displacement), tilts up to8degrees and shows
NO/OK feedback. On release at least40dp horizontally it selects the practice
choice, then springs back to center. Short/vertical/cancelled gestures do not
choose. Tutorial progression still requires the explicit Next action.

Double tap within350ms selects WANT, changes the card's persistent selected
background and requests a finite120ms rise/360ms fade green overlay using the
native opacity driver. Repeated double taps can request another pulse. Existing
NO/OK/WANT buttons give equivalent choices; selected choice is announced.

Reduce Motion is read and subscribed through AccessibilityInfo. With it enabled,
gesture choices still work, while drag/tilt/spring/pulse feedback is suppressed;
selected color/text remain visible. Animation/listener cleanup runs on unmount.
Each lesson remounts its sample card, preventing motion/tap state leaking into
the next practice step or undo example. No repository/session object is mounted.

Five new hook cases cover actual Animated position changes during drag, release
choice, short/vertical/cancelled input, reduced-motion behavior and finite WANT
feedback. Existing screen tests also verify the selected WANT announcement and
that tutorial completion/replay calls no create/join/start/submit API.

## Verification and phone retest

Targeted6 suites/39 tests Pass; full38 suites/807 tests Pass in75.217s.
TypeScript, source/tests/scripts ESLint, architecture and locked Expo compatibility
Pass (offline compatibility limitation retained). [Current checks](INPUT_MOTION_CHECKS.json).
Android export contains entry-91143e7847e4b41334bc875b16d69e43.hbc (3.6MB).
Source commits: `3458755` native code cells and `f97a748` tutorial motion.
Full Python regression:657 tests,650 passed/6 skipped/1 existing WinError1314
symlink privilege error,154.086s; no assertion failure. No OS permission change.

No Android/ADB is connected in this environment. Actual OS caret blink, Samsung
IME composition, physical drag/glow smoothness, font scaling/TalkBack/keyboard
and same-phone screenshots after repair remain **Not run**. Event/Animated-node
tests and Hermes export are not device acceptance. No Done/Trí approval or push.

Restart Metro with `npm --prefix mobile start -- --clear`, reopen Expo Go and
scan the QR. From Home enter join, focus/type each cell, paste GCD234, replace
and delete characters, Back and confirm. Verify exactly one character per cell,
a native caret/selection in the focused cell, and no full-string overlay.
Replay tutorial from Cá nhân: drag both directions, release short/long/cancel,
double tap, undo/Back/skip/replay; compare with Reduce Motion enabled/disabled.
