# GM-05 Figma parity record

Date: 2026-10-29
Branch/base: `codex/gm05-figma-components` / `5c339cf351ca4e37d95d4d0e8211be0ccb8a8af3`
Contract reference: `ui-figma-final/2026-10-25/GM-05.2`

## Design source

The repository handoff identifies the design file [Gì Cũng Được — Màu sắc thương hiệu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=0-1) and its components page [GCD / Components](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=8-2). The component/node mapping is maintained in [`COMPONENT_MAP.md`](../../../design/COMPONENT_MAP.md) and [`UI_FIGMA_TASK_MAP.json`](../../../design/UI_FIGMA_TASK_MAP.json).

## Verification

**Status: Not run.** The current session could not access Figma through the configured MCP/browser host, so I could not retrieve fresh design context or screenshots. No same-viewport comparison, pixel-parity assertion, or designer visual confirmation was performed. The implementation used checked-in handoff information and existing verified references only; that is useful for implementation but is not equivalent to reopening the live design. Android device visual checks are also Not run because `adb` is unavailable.

Next reviewer check: open the Figma file and `/foundation` → `/components` in Expo Go on the same device/viewport; compare each shared component with its mapped node; record viewport/device, font scale, theme, screenshots, findings, and exact revision in this file before asserting visual acceptance.

## Direct Figma access update — 2026-10-29

The downloaded source is present at `design-input/Gì Cũng Được — Màu sắc thương hiệu.fig` (12,590,824 bytes; Chrome download status Done). The live file is open in the user's Chrome at `node-id=617-1671` (GCD / Result Podium · Đồng hạng). Figma's inspection panel reports the note: “Bốn bố cục đồng hạng; dùng dense rank, điểm bằng nhau cùng chiều cao và chỉ gắn nhãn cho món winner.” It reports component bounds 1,576 × 408 px and radius 5 px. This confirms the tie behavior and measurements from the actual file.

I updated `ResultPodium` to use a horizontal scroll container and retain all supplied rank-1/2/3 entries instead of truncating the list to three dishes. This supports three-way ties while preserving server-supplied dense ranks and winner marking. Targeted test `npx jest tests/component/sharedComponents.test.tsx --runInBand`: 21/21 passed; `npm run typecheck`: passed.

Visual parity is still **Not run**: although the live Figma file's layer/property panel was accessible, no same-viewport Expo/device comparison was made. The `.fig` archive contains 13 entries, including its proprietary `canvas.fig` and a thumbnail; I did not claim the binary canvas was parsed as design code. The source files remain local inputs under `design-input/` and are not included in source changes.

## PDF source review — 2026-10-29

Trung saved `design-input/Gì Cũng Được — Màu sắc thương hiệu.pdf` (5,648,112 bytes). Chrome's built-in PDF viewer opened it and reported 33 pages. I visually inspected the Components overview (PDF p. 27) and the following UI references: notification items (p. 28), gesture tutorial (p. 29), room coordination/count/waiting (p. 30), collection state (p. 31), connection/request banners (p. 32), and insufficient dish states (p. 33). Page 27 describes its board as an HTML structural reference, so it is not treated as a pixel-accepted app screenshot. The PDF is local input and is intentionally excluded from the branch.

The gesture tutorial reference shows four actions (tap, swipe left/right, double tap) in dark and light tones. `TutorialGesture` now renders both tone rows with all four labels and retains its explicit button alternative; its component test asserts each action label appears in both rows and the alternate button fires. This is a code/fixture check only. The hand glyphs are native text symbols rather than exported Figma vectors, so exact icon fidelity remains part of visual review.

The PDF provides a substantially more useful visual reference than the `.fig` archive thumbnail, but it does not replace the original editable Figma tree or a same-device comparison. Pixel parity, 412dp/320dp responsive checks, 200% font scale, TalkBack, and dark-theme device validation remain **Not run**.
