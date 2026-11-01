# GM-09.2 — Figma parity

## Step 2 candidate — 2026-11-01

Base `8172241` + working tree; [handoff and limitations](figma-update/step2/STEP2.md).
Received full design context/screenshots after the UIT account was reconnected.

| Frame | Route / data | Reference | Current verification |
| --- | --- | --- | --- |
| Home 33:3 | `/`; `/dev/home` has fixed mock states | [412×915](figma-update/step2/figma-home.png) | Interaction/asset source checks only; native visual Not run |
| Continue 277:2140 | `/continue-session`; verified member snapshot from receipt | [412×915](figma-update/step2/figma-continue.png) | Read/guard/retry/route tests; native visual Not run |
| Guest expired 277:2190 | `/` with confirmed revoked session; dev expiry fixture | [412×915](figma-update/step2/figma-expired.png) | Explicit reset/duplicate/error tests; native visual Not run |

The new source-cropped illustration is 166×116, CTA icons 32×32 and Back 24×24;
their source slots, callsites, sizes and hashes are documented in
`mobile/assets/brand/home/SOURCE.md`. Existing master/logo/navigation assets keep
their sources. No screenshot of a whole screen is used in UI. Real names/counts
come from received data; online/presence is not inferred. Saved receipts alone
do not open a room. Real durable continuation remains a GM-25/31 integration seam.

Review differences: mock labels, accessible 48dp quick-friends action, flexible
large-font layout, four-weight font baseline (700 instead of the design's
ExtraBold headline), higher-contrast stage/description tokens, honest errors
and no fake Android system bars. No Trí acceptance is recorded. 412dp native
comparison/320/360dp/font200/TalkBack/Dark/keyboard/Back checks remain Not run.

## Historical step 1 candidate

Date: 2026-10-31. Branch `codex/gm-09-figma-update`, base `621acccf777c8a2538012641ce525cba0e6ae3ce` + uncommitted working tree. Reviewer Trí; no approval or Done is recorded. Only welcome/guest entry is implemented by this supplement; Home redesign and later steps remain separate.

## Design received

The user supplied the [editable Draft copy](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=33-2) of the team's design. MCP metadata confirmed the node IDs; `get_design_context` returned full reference code and screenshots for both frames. The original team file in task/spec remains the traceability source; no global task map or Issue was changed to the copy. Figma did not return a file revision ID; date, file key, node and retained screenshots identify this read.

| Frame / state | Route / fixture | Reference | App comparison | Status |
| --- | --- | --- | --- | --- |
| [298:2309 — welcome](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=298-2309) | Fresh mock `/` → `/welcome`; real only after restore confirms `empty/no-session` | [Figma 412×915](figma-update/figma-welcome.png) | Android screenshot not captured | Not run |
| [277:2104 — guest name](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=277-2104) | `/welcome` → Tham gia với tư cách khách; blank/valid/invalid/pending/error/accepted via component fixtures | [Figma 412×915](figma-update/figma-guest-name.png) | Android screenshot not captured | Not run |
| Existing session / recovery / uncertain signup | Existing provider seam; welcome disabled until explicit recovery/reset; restored active session returns Home | Existing GM-25 guards + common `StatusNotice` pattern | Behavioral tests only | Visual Not run |

## Design details used

Welcome: Inter, 44dp mark inside 48dp brand tile, title 22, headline 50/61, subtitle17, rounded panel32, account actions60dp, guest action ≥48dp. Two native-size PNG decorations come from their individual Figma nodes. Guest: cream background, 72dp logo slot containing 44dp mark, brand29, question26, description15, input64/radius16, CTA52. Layout uses flow/scroll and safe-area insets, with absolute positioning restricted to decorative layers. User-entered name starts blank; “Minh” in Figma is sample data, not an automatic identity.

## Differences requiring review / visual checks

- **Contrast:** AGENTS/UI handoff prohibits readable text on decorative brand green `#46C34F`. Welcome hero uses the existing contrast primary token `#238633` instead. Guest description uses the existing foreground token rather than muted `#5E7F6B`. These intentional differences follow the repository's accessibility requirement; they are not claimed to have Trí's visual acceptance.
- Mock mode adds a simulation label. Guest adds an accessible Back action using existing UI conventions. Error/pending/recovery states reuse `StatusNotice`/form error patterns. Account buttons open an explicit capability notice until GM-35 supplies real account routes; the guest path stays available.
- Android supplies actual system bars, so the 9:41/status icon art is not rendered in the app. Compare the **content** at 412dp and record real system-bar insets.
- No Android SDK/ADB/device was available on this host. Same-viewport app screenshots, effective asset geometry, 320/360dp, font200, TalkBack, keyboard/hardware Back and Dark checks are **Not run**. Automated interactions/export cannot close those AC.

See [step 1 handoff/checks](figma-update/STEP1.md). Every discrepancy must be corrected or accepted by Trí on the actual revision before full visual parity/GM-09 completion is claimed.
