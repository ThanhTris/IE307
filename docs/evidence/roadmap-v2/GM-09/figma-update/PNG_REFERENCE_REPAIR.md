# GM-09 — repair using received PNG references

2026-11-02 local date. Branch `codex/gm-09-figma-update`; base `2b56b4a`.
Owner Tuấn, reviewer Trí. User explicitly supplies local PNG references and
requests UI correction; Figma remains visual guidance with reported small
required additions. No Figma write or API/policy change.

## Inputs and scope

Thirty PNGs were received under `.work/figma-reference/gm-09/`, including
foundations/components and the large scenario/handoff pages. Five screen strips
were split into53 inspection regions at native824 × 1830 pixels (412 × 915dp,
2x export): origin80/352, stride984. The last region of the create strip is
notes, not another app screen. Large pages4–7 can be inspected locally; their
being flattened does not prevent reading them. No new MCP read is needed for
these received images. [Reference manifest](PNG_REFERENCE_MANIFEST.json) pins
all original bytes/dimensions; originals and inspection crops remain ignored.

Plan executed: read local sources/requirements → compare received frame groups
and assets → correct shared brand/entry → separate join states with existing
guards → rebuild isolated tutorial composition → regression/export/evidence.
Start checker: live Project at2026-11-01T17:48:12Z, `READY_TO_CLAIM`.
Credential was passed from existing `gh auth token` only to the checker process,
not printed or written to disk. This is a dependency check, not review approval.

## Changes and reference differences

| Reference | Route / implementation | Correction / limit |
| --- | --- | --- |
| Welcome298:2309, first entry-strip frame | `/welcome`, WelcomeScreen | Leaf-green hero, native text/buttons and existing decorative assets; white on leaf has insufficient contrast, so hero copy uses ink. Account auth remains a capability notice, not a fake login. |
| Guest277:2104, home-strip first frame | `/welcome`, GuestEntryScreen | Center the44px logo correctly; muted helper text. Blank name, validation, explicit session creation, recovery and ACK/back locks retained. |
| Home33:3, home-strip third frame | `/`, HomeScreen | Remove extra CTA label height and header divider; compact friend heading with native48dp action/parent height, vertical margins preserving visual spacing. Existing illustration166 × 116 and32px CTA icons retained. |
| Continue277:2140 / expiry277:2190 | `/continue-session`, expiry screen | Existing received layout retained; shared divider/text palette corrected. Actual room verification remains mandatory before continuation. |
| Create43:106 and scenario page4 | `/room/create-entry` | Centered header/compact spacing only. Full dish-only settings is GM-10; the missing producer is still reported instead of duplicating its form or calling legacy GPS discovery. |
| Join268:1952 / confirm268:2081 | `/room/join-entry` | Six visual code cells over one native input, QR entry card, bottom CTA; confirmation replaces the input screen instead of appending beneath it. Back/alternate code retains draft; confirmation is still the only join mutation. |
| Join invalid/full/expired/network | same route, distinct UI states | Inline invalid-code notice; dedicated full/expired/network states with retry/edit actions and saved code. Stale read/scan responses after cancellation are ignored. Writes/unknown delivery remain locked and retries reuse frozen payload/request ID. |
| QR268:2019 / denied275:2088 | same route | Clear unavailable/denied panel and manual fallback. No fake camera, sample scannable payload or claimed native QR acceptance; native scanner remains GM-30. |
| Tutorial T01–T06,368:16837 | `/tutorial` | Home backdrop with highlighted CTA; local meal/time practice; focused sample cards with received rice/leaf/hand artwork; coach pointers, NO/OK/WANT, double tap, undo, skip/replay/Back. No Home/session reads or room/ballot mutations. |

The join preview producer currently supplies only code/memberCount/capacity.
Meal/time rows shown in the reference are omitted until a safe producer projection
is handed over; no room roster, host name, preferences, pool or ballot is read
before join ACK. CTA is **Xác nhận vào phòng**, since this route currently joins;
it does not falsely promise the unreceived **Chọn khẩu vị** integration.
An optional name field appears only when the caller has not supplied a valid name.
Native long-press paste replaces the reference clipboard shortcut: no unapproved
clipboard dependency was added. Invalid/extra fields in the preview response are
not projected into UI.

Tutorial meal/count/budget are a local example, not a second production settings
writer. T03–T06 dish names/categories/prices are explicitly illustrative text
transcribed from the PNG, not fabricated catalogue/price observations. Tutorial
uses matching native card layout, not the generic emoji/photo fallback card.
All three accessible vote buttons and an explicit Next/Finish remain available;
they add controls beyond the reference gesture-only composition. Headers and
coach copy favor readable contrast. Inter700 is the delivered maximum font
weight; Inter800 was not added through a package/font baseline change.

Dark's old orange primary/pressed tokens are corrected to green, retaining
existing dark surfaces/support. This is not a separately accepted Dark redesign.
Light muted text now uses#53745E. Calculated contrast: body12.38, muted5.08,
primary white4.64, pressed white6.60; Dark body16.40/muted7.07.

**Reference conflict:** the QA component matrix still says N=1 auto-finalizes.
It is historical and conflicts with current AGENTS/ADR policy. No decision
logic was changed: N>=1 still opens actual R2, with cap>=1 and REMOVE/no-REMOVE.
Pages5/6 remain GM-10/11 reference, and page7 is a handoff, not app UI.

## Reproduce and remaining acceptance

Source commits: `0e2fcee` brand/entry/assets, `eef00fc` join states,
`8dffc8a` tutorial, `76e7dbd` privacy-test selector correction, `d5a10cf` native
48dp friend action (replaces the initial hitSlop-only candidate).
[Source manifest](PNG_REPAIR_SOURCE_MANIFEST.json) pins34 files;
[mobile checks](PNG_REPAIR_MOBILE_CHECKS.json) record the final36-suite/797-test
Pass at74.12s on76e7dbd, followed by26 Home tests (3.643s) for the last layout-only
change. Final Android export is entry-8504d0203927af928119ab997b354298.hbc.
The previous broad `/anchorId/` selector sometimes matched both
explanation and serialized JSON. Its correction waits for the actual payload
while retaining the assertions against raw GPS. No GM-24 runtime was changed.

From root: `npm --prefix mobile start -- --clear`, with the received SDK58 Expo Go.
Fresh mock: Welcome → guest name → tutorial → Home. Join fixture code `GCD234`:
**Tiếp tục →** → count-only confirmation → **Xác nhận vào phòng** → existing
receipt route. **Nhập mã khác**/Back returns without joining. Real mode continues
using received legacy create/join integration; API failures do not select mock.
Do not expect the new mock entry to replace missing real producers automatically.

No Android device/ADB or RN web renderer is installed in the current environment.
No package was added to fabricate visual evidence. **Android screenshots at
412/320/360dp, font200%, TalkBack, keyboard, native Back, physical gestures and
same-viewport image comparison remain Not run.** Source inspection, interaction
tests and Hermes export do not prove visual acceptance. GM-09 is not marked Done.

No migration/API/engine changes, dataset admission, Project edits, GitHub push or
Figma write. Local source commits follow the user's earlier per-step instruction.
Original reference exports and generated build artifacts are excluded from the
source handoff.
