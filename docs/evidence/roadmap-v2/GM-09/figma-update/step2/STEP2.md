# GM-09.2 step 2 — Home and continuation candidate

2026-11-01. Base `8172241`, branch `codex/gm-09-figma-update`; owner Tuấn,
reviewer Trí. The source manifest records this working-tree candidate. No stage,
commit, push, Project status change or approval is performed by the agent.

## Received inputs

Live Project start gate at 2026-11-01T15:10:54Z: READY_TO_CLAIM. Main refactor
`67f332d` was received through merge `8172241`; GM-05 components/Inter and GM-07.1
repository contracts remain pinned. No package, lockfile, schema or API changes.

Figma initially failed through an old connected account. After reconnection,
both connections identify `23521720@gm.uit.edu.vn`; direct MCP returned full
context and screenshots for the authorized Draft:

- [Home 33:3](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=33-3): [reference](figma-home.png).
- [Continue 277:2140](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=277-2140): [reference](figma-continue.png).
- [Expired guest 277:2190](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=277-2190): [reference](figma-expired.png).

References are 412×915 design renders, never runtime UI assets. No file revision
ID was returned. Source file/date/nodes and retained images identify the read.
The team task map remains unchanged; the Draft is an authorized read copy.

## Behavior and integration boundaries

Home keeps its existing header/banner/actions/nav and receives the exact cropped
illustration and 32dp action icons. Content uses the received spacing; large font
scales let action tiles grow. Friends loading/error/empty states are independent
of entry availability. Counts come from successful data, not an assumed zero
during error/loading. No presence or sample friend names are invented.

An in-memory saved receipt is a lookup hint, not proof of a live room. The
existing member-only snapshot read verifies room ID/code, minimum version and
membership before showing a continuation action. Loading/unknown network errors
do not permit a second room intent. Explicit unavailable/terminal rooms release
entry; transient errors offer a read retry. Only LOBBY/ROUND_1/ROUND_2/legacy
VOTING are resumable. No timer/scoring/expiry is calculated from the device clock.

`/continue-session` rechecks the receipt after identity restoration. The native
screen shows server-derived host/code/stage, verified continue, retry and Home.
Back/Home do not leave/cancel/create/join. In the received mock composition,
continue returns to the existing `/room/preview` receipt seam; it does not claim
to restore the exact voting step. Real mode has no active-room discovery/cache
artifact in this composition, so no real saved room is fabricated. GM-25/31 must
supply that upstream seam and real step routing before live restoration can be
accepted. The component accepts a verified producer receipt/user/callback.

Home's focus revision invalidates cached read state immediately and ignores late
responses. The shared UI read hook gains an optional refresh key; existing
consumers keep their default behavior. Auth-lost/blocked states stay disabled
even if an old user object remains. A revoked guest sees the expiry screen:
explicit **Nhập tên** only calls the existing logout/reset seam, never signup.
Failure stays visible/retryable; pending/accepted reset blocks duplicate presses
and Back. The product root opens welcome only after the provider confirms empty.

QA tools are absent from product Home. `/dev/home` is guarded with `__DEV__` and
contains explicit synthetic no-room/active/loading/expired/error, friends and
session fixtures. Selecting **Có phòng để tiếp tục** deliberately resets only
the in-memory mock room to the default fixture so the existing continuation
route can be exercised. It does not change a real session or persistent cache.

## Reproduce

From `mobile`, run `npm start`. Full reload with mock configuration opens the
step 1 welcome; enter a guest name to reach product Home. Test header/nav/CTA
touch areas, friend error independence, keyboard/Back and no QA tools on Home.

For fixed QA states, open the Expo development link ending `/--/dev/home`
(for example `exp://<host>:8081/--/dev/home`; use the actual URL printed by Expo).
Expand **Công cụ kiểm thử** and select a Home fixture. The mock label remains
visible, including simulated session expiry/recovery. **Có phòng để tiếp tục** →
**Quay lại phòng mô phỏng** opens `/continue-session`; wait for verification,
then continue to the existing mock receipt or return Home. A normal create/join
ACK followed by Back to Home exercises the same route with the actual mock
receipt created by that action. Fixture controls on legacy room forms retain
their existing behavior; this step only moves Home controls.

## Acceptance limits

This is one code candidate, not GM-09 Done or visual approval. Device Android/
Expo Go interaction, 412dp comparison, 320/360dp, font200, TalkBack, real system
insets, keyboard/hardware Back and rendered asset geometry remain **Not run**.
No ADB command is available in this session. Automated JSX interactions and
Android export do not replace those checks.

The received design uses muted description/stage colors and an ExtraBold Home
headline. This candidate keeps the received four-weight Inter baseline (700 for
that headline), accessible text tokens and 48dp **Tất cả bạn bè** touch target;
that target increases quick-card heading height. Real/mock banners and honest
unknown/error content also differ from the static example. Dark capability is
preserved, not redesigned. These differences still require Trí review.

See current GM-09 CHECKS/HANDOFF for executed checks and
[manual step 2 commit instructions](COMMIT_STEP2.md).
