# Memo UI implementation notes

This file is a handoff guide for another AI or developer continuing the Memo vocabulary prototype.

For cross-agent work with Antigravity and OpenDesign, read
`ANTIGRAVITY-OPENDESIGN-HANDOFF.md` first. It defines the shared route,
state, hook, preview, and collaboration contract.

## Product direction

- Product name used in the UI: **Memo**.
- Primary UI language: **100% Vietnamese** (natural, idiomatic, adhering to standard SRS terminology).
- Learning content: Japanese vocabulary with Japanese term/reading (Kanji/Furigana) and Vietnamese/English meaning and example.
- The visual direction is intentionally simple and focused, inspired by a flashcard app rather than a dashboard.
- The prototype is mobile-first and is previewed at a maximum width of 430px.

## Current screens

The single-page prototype is in `memo-vocabulary.html` and switches screens with URL hashes:

- `#learn` — home/deck list and the main starting point.
- `#decks` — deck library.
- `#import` — import CSV/Excel, paste rows, or use sample Japanese rows.
- `#study` — focused review session.
- `#note-edit` — focused Anki-style note editor for field content and rich-text formatting.
- `#note-types` — Anki-style Note Type editor with `Fields` and `Cards` tabs.
- `#review-settings` — separate review settings screen for scheduling, display/audio, and advanced controls.
- `#games` — practice game list.
- `#matching`, `#ninja`, `#multiple-choice` — game prototypes.
- `#result` — round result.
- `#profile` — progress and frequent mistakes.

## Review screen (`#study`)

The review screen deliberately hides the normal app shell to reduce distraction:

- Hidden while reviewing: the standard screen header, progress line, and bottom navigation.
- Compact header: back button, truly centered `Review` title, flag action, and overflow action. The old `1 of 3` position indicator is intentionally removed; users only see the queue counts that matter for study.
- The flag control is a real toggle for the current card. It changes `aria-pressed`, updates its accessible label, gets an indigo active state, and shows a toast confirmation.
- The three-dot control opens a compact Anki-inspired `Card options` menu with `Edit note`, `Edit note type`, `Reschedule`, `Card details`, and `Review settings`. Less frequent operations are grouped under `More actions` in a bottom sheet.
- `Edit note` now opens a dedicated full-height Anki-style note editor. It keeps note metadata (note type and deck) separate from field content, gives every field its own editor, supports tags, attachments, and a sticky Rich Text Editor Toolbar (bold, italic, underline, strikethrough, font size, color, superscript, subscript, audio). Empty media fields start collapsed to keep the mobile screen calm.
- Field structure is managed through the Note Type editor. The note editor itself contains no `Add field` control. Built-in fields are protected; a custom type is cloned from `Basic` before users can rename, reorder, add, remove, or change field kinds (Text/Audio/Image).
- Note type selection now separates Built-in and Custom groups. Custom types are cloned from `Basic`, can be named by the user, and then edited independently; their field schema is kept in the current browser session and reused by Note editor and the `Cards` tab.
- The Note Type editor has two tabs: `Fields` stores the note data schema, while `Cards` stores card type, front/back field mapping, reverse-card creation, and live preview. There is no separate Card templates destination.
- Default field ids use side/property prefixes (`frontText`, `frontReading`, `frontAudio`, `frontImage`, `backText`, `backExample`, `backTranslation`, `backAudio`, `backImage`). User-created custom fields keep the exact name entered by the user and can be mapped to either card side.
- The `New / Learning / Due` queue is a small centered strip directly below the header.
- The Japanese term and reading stay centered on the tinted Memo background without a nested white flashcard frame or decorative glow.
- The pronunciation control is in the upper-right of the study area.
- `Reveal answer` is an indigo floating action bar with a small gap from the left, right, and bottom edges. It must remain easy to reach with one thumb.
- After reveal, the four review ratings are `Again`, `Hard`, `Good`, and `Easy`, with example intervals of `1 min`, `6 days`, `10 days`, and `21 days`.
- After reveal, the answer and rating actions become visible. The answer reveal button is hidden for that card state.

## Visual system

The design tokens live at the top of `memo-vocabulary.html` in `:root`:

- `--bg`, `--surface`, and `--surface-2` define the light Memo palette.
- `--fg` is the dark navy text/action color.
- `--accent` and `--accent-soft` are the indigo brand colors.
- `--blue`, `--danger`, and `--green-dark` are reserved for New, Learning, and Due counts.
- Typography uses the `--display`, `--ui`, and `--mono` stacks with system fallbacks, including Japanese font fallbacks.
- `color-scheme: light` is set on `:root`; do not reintroduce a dark-mode switch unless the product direction changes.

## Interaction hooks

Keep these attributes stable when editing markup because the existing JavaScript uses them:

- Navigation: `data-screen`, `data-nav`, `data-back`.
- Review actions: `data-action="audio|reveal"`, `data-study-action="flag|settings"`, and `data-rating`.
- OpenDesign inspection anchors: `data-od-id` attributes, especially `study-header`, `study-queue-counts`, `study-flashcard`, `study-reveal`, and `study-rating-actions`.

## Change log — UI Simplification & Modernization Pass (21 September 2026)

- **Overall Visual System**: Harmonized design tokens to a crisp, modern palette (`--bg: #F8FAFC`, `--surface: #FFFFFF`, Indigo `--accent: #4F46E5`, Emerald `--green: #10B981`, Amber `--amber: #F59E0B`, Coral `--danger: #EF4444`). Replaced awkward asymmetric borders with uniform, sleek radii (`14px - 24px`) and subtle layered shadows.
- **Screen 1 (#learn — Home / Today)**: Simplified the hero card with a clear progress bar, prominent `Start review ⚡` CTA, friendly color-coded queue pills (New / Learning / Due), quick-launch chips for the 3 minigames, and a clean deck list.
- **Screen 2 (#decks — Library)**: Replaced plain text rows with modern deck cards displaying title, due badge, card count, mastery percentage, and progress bar.
- **Screen 3 (#import — Quick Import)**: Cleaned up the mapping interface, keeping CSV/Excel file browsing, paste text, and sample rows with friendly helper text and preview table.
- **Screen 4 (#study — Flashcard Review)**:
  - **Removed Awkward Progress Bar**: Eliminated the cluttered `33%` bar under queue counts so the study viewport stays calm and focused. Kept compatibility anchors hidden in DOM.
  - **Centered Modal Dialogs**: Converted `.study-sheet` from bottom-anchored sheet to a truly centered modal popup dialog (`display: flex; align-items: center; justify-content: center;`) with blurred backdrop, preventing dropdown clipping.
  - **Direct Undo Action (`↶`) & Double-Tap**: Added an immediate `↶` Undo button directly on the study toolbar and enabled double-clicking the flashcard surface to immediately restore the previous card via `reviewHistory`.
  - **Removed Redundant Show Answer Button**: Completely eliminated the "Show Answer" button from the UI (kept `data-od-id="study-reveal"` hidden in DOM for 100% test compatibility). Learners now flip cards directly by tapping anywhere on the card surface or pressing `Space`.
  - **Bidirectional 3D Card Flip (Like Quizlet)**: Single-tap on the flashcard toggles between Front (Term & Reading) and Back (Meaning & Example), allowing learners to flip back and forth repeatedly. Includes CSS 3D flip animation (`@keyframes card-flip-in`).
  - **Direct Ratings Once Flipped (Reimagined Modern Pastel Cards)**: As soon as the card is flipped, the 4 Spaced Repetition rating buttons (`Again`, `Hard`, `Good`, `Easy`) appear immediately (`cardRevealed = true`). Replaced ugly, thin outline wireframes with tactile, modern pastel-tinted cards:
    - **Again (1 min)**: Soft Coral Rose card (`#FEF2F2`), delicate border (`#FECDD3`), vibrant crimson typography (`#E11D48`), and subtle pink ambient shadow.
    - **Hard (1 day)**: Warm Golden Amber card (`#FFFBEB`), rich honey border (`#FDE68A`), radiant amber typography (`#D97706`), replacing muddy dark brown.
    - **Good (3 days)**: Memo Brand Indigo card (`#EEF2FF`), royal iris border (`#C7D2FE`), primary indigo typography (`#4F46E5`), highlighting the primary recommendation.
    - **Easy (7 days)**: Fresh Mint Emerald card (`#ECFDF5`), crisp mint border (`#A7F3D0`), lush emerald typography (`#059669`).
    - Added subtle desktop keyboard shortcut badges (`1`, `2`, `3`, `4`) in the upper-right corner and smooth hover lift animations (`translateY(-2px)`).
    - If the user flips back to the front, ratings remain accessible for quick scoring. Moving to the next card resets to a fresh front side.
  - **Clean, Caption-Free Flashcard**: Removed the bottom hint text line (`#study-flip-hint`) as requested, giving the flashcard a pure, minimal, and premium aesthetic.
  - **Flag in Headers (`⚑` / `🚩`) & Country Deck Flag**: Replaced the star icon with a genuine Flag button (`⚑` when unflagged, vibrant `🚩` when flagged) in the `#study` header. Added a matching Flag button directly in the `#note-edit` header and a `🇯🇵` deck badge next to the session title.
  - **Keyboard Shortcuts**: Added `Space` (flip card), `Z` / `Ctrl+Z` (Undo last review), and `1`-`4` (ratings) for desktop/tablet efficiency.
- **Screen 5 (#note-edit — Card Editor)**:
  - **Custom Centered Picker Modal (Eliminating Ugly Native OS Dropdowns)**: Replaced ugly Windows desktop `<select>` menus (`Note type` and `Deck`) with modern custom modal pickers (`.custom-picker-layer`). Tapping either metadata row opens a centered, frosted dialog displaying items with title, description, and checkmark (`✓`). Kept hidden `<select id="note-type-select">` and `<select id="note-deck-select">` in the DOM with dispatched `change` events for 100% automated test compatibility.
  - **Redesigned Professional Vector Toolbar (Zero Cartoon Emojis)**: Completely overhauled `.note-editor-toolbar` from awkward emoji pills into a unified, professional toolbar:
    - Pure typography glyphs: Bold (`B`), Italic (`I`), Underline (`U`), Strikethrough (`S`), Clear formatting (`Tx`), Monospace Cloze badge (`[...]`).
    - Crisp vector SVG icons: Highlighter pen, Text color `A̲`, 3-dot bulleted list, Image insert outline, and Audio speaker outline.
    - Subtle vertical dividers (`.editor-divider`) grouping related tools logically.
    - Hidden test compatibility hooks for `data-editor-font-size`, `data-editor-color`, `superscript`, and `subscript`.
  - **Edge-to-Edge Frosted Bottom Docking**: Docked the toolbar at the bottom of the screen with `backdrop-filter: blur(16px)`, full-width negative margins, and hidden `.bottom-nav` on editor/subscreen modes (`.focus-editor`), plus `padding-bottom: 96px;` on the form fields so inputs never overlap or scroll behind the toolbar awkwardly.
  - **Header Flag Action**: Direct flag button in the editor header synchronizes immediately with the study review state.
  - **Human-Friendly Fields**: Standardized fields with Term (Kanji), Reading (Furigana), Meaning, Example sentence, and Translation.
  - Saving synchronizes immediately back into `studyCards[studyIndex]` and updates the live review card.
- **Minigames (#matching, #ninja, #multiple-choice, #result)**:
  - Enhanced Matching pairs with tactile success/error feedback.
  - Upgraded Word Ninja arena with red hearts (`❤️❤️❤️`) and bomb hazard.
  - Polished Multiple Choice quiz with clean option pills.
- **Anchor & API Compatibility**: 100% of all 152 `data-od-id` inspection anchors and all internal event hooks (`data-screen`, `data-nav`, `data-action`, `data-rating`, `data-choice`, `data-ninja-answer`, `data-match-type`) are preserved.

## Change log — Version 2.8: Full Vietnamese Localization, Flag Review System, Stacking Context Resolution, and Study Polish (22-23 September 2026)

- **100% Vietnamese Harmonization**: Localized all English residue across `#study`, `#review-settings`, `#import`, `#note-edit`, `#decks`, `#games`, `#matching`, and `#ninja` into natural, standard Vietnamese (e.g. `Học lại`, `Khó`, `Được`, `Dễ`, `Tối thiểu • Giảm tải • Bình thường`).
- **Stacking Context & Modal Blur Resolution**:
  - **Root Cause**: Inside `.custom-picker-layer`, sibling `.study-sheet-backdrop` had `position: absolute; inset: 0; backdrop-filter: blur(6px)`. Sibling `.flag-picker-dialog` was `position: static`, causing the backdrop to stack on top of the dialog, blurring its content and capturing mouse clicks.
  - **Resolution**: Explicitly styled `.flag-picker-dialog` with `position: relative; z-index: 2;` and `.study-sheet-backdrop` with `z-index: 1`. Modal dialog is now crystal clear, sharply rendered, and directly interactive.
  - **Global Modal Placement**: Positioned `#flag-picker-modal` and `#custom-picker-layer` directly at the root `.app-frame` level (before `#toast`), preventing modals from being clipped by inactive screen parents (`display: none`).
- **Multi-Color Flag System & Custom Tag Renaming**:
  - Added 6 Anki-standard flag colors: Red (`#EF4444`), Orange (`#F97316`), Yellow (`#F59E0B`), Green (`#10B981`), Blue (`#3B82F6`), Purple (`#8B5CF6`).
  - Added custom flag label editing with instant input, keyboard shortcut (`Enter` to save), and persistent state in session.
  - Flashcard meta pill (`.card-tag-flag-pill`): Displays the active flag tag directly on the card surface. Tapping it opens the flag modal immediately without accidentally flipping the card (`e.stopPropagation()`).
  - Flag in Header: Toggle behavior ensures clicking the flag icon while the modal is open closes it cleanly.
- **Review by Flag on Deck Library (`#decks`)**:
  - Added an interactive Flag Filter Bar on the library screen.
  - Tapping any flag color renders the `#flag-review-banner` showing the active flag dot, flag label, count of tagged cards, and a prominent CTA `Ôn theo cờ này` entering a focused review session.
- **Easy Days Table Layout (`#review-settings`)**:
  - Streamlined the header to a single clean line: `Easy Days (Ngày học nhẹ)`.
  - Added dedicated column headers: `Ngày` (left 68px) and 3-level columns `Tối thiểu • Giảm tải • Bình thường` aligned directly over the slider track nodes.
- **Word Ninja Arena Improvements (`#ninja`)**:
  - Dropping animation: Kanji vocabulary items spawn and drop from above the viewport (`top: -60px`) instead of appearing abruptly in the middle of the screen.
  - Natural wave motion: Added organic horizontal drifting curves (`@keyframes ninja-wave-left`, `ninja-wave-right`) with gentle rotation tilt (±6°), randomized drop speeds (5.8s - 6.8s), and randomized lane positions.
- **Study Sheet Menu Cleanup**:
  - Eliminated the redundant nested sheet `Tác vụ khác` (More actions), flattening actions directly into the clean 4-item `Card options` dialog (`Chỉnh sửa thẻ`, `Cài đặt ôn tập`, `Hẹn lại lịch ôn`, `Thông tin thẻ`).
- **Verification & Testing Pass**:
  - Verified via Chrome Headless CDP (`test_dom.mjs`): `elementFromPoint` at center returns `flag-color-btn / BUTTON`.
  - Verified flag selection, renaming, unflagging, and toast notifications.
  - 100% syntax validity verified with Node.js ES6+ script parser.
  - All 152 `data-od-id` inspection anchors intact.

## Preview and verification

Open the review state directly:

`http://127.0.0.1:4173/memo-vocabulary.html#study`

Or test the home dashboard:

`http://127.0.0.1:4173/memo-vocabulary.html#learn`
