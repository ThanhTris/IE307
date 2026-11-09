# GM-28 Figma parity evidence

## Review record

- Figma source: task UI map and approved task nodes referenced from `tasks/backlog/GM-28.md`.
- App revision: current GM-28 follow-up rebased on `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc`.
- App build/device and screenshot capture: Not run; no Android device/build was available. Local typecheck/lint and Jest checks do not establish visual parity.
- Figma screenshots/design-context export: Not captured in this run. This file records the mapping and verification gap; it does not claim visual parity.

## Frame to route mapping

| Figma state/node | App route/state | Data and expected behavior | Actual/evidence |
|---|---|---|---|
| Friends / search / invitations `330:3076` | `/friends` | Authenticated friend list, local name/friend-code search and invite by friend code | Implemented in source. No Android interaction or screenshot captured. |
| Room invitation / send / reject `330:3077` | `/inbox` | Inbox invitation uses server invitation ID; acceptance refetches canonical room state and routes without ready/vote side effects | Implemented in source. No Android interaction or screenshot captured. |
| Notifications `330:3079` | `/inbox` | Inbox refetches canonical rows; duplicate events are removed by event ID | Adapter has event deduplication/cursor; result references are resolved through an authorized room snapshot. API/device check not run. |
| History / details `330:3081` | `/history` | Read canonical personal/group projection; consent and delete go to server; legacy entries stay explicitly unscored | Implemented in source. API/ACL/delete test not run. |
| Delete history `263:1880` | `/history` | Confirm server delete, invalidate in-flight reads and update authorized cached projection | Implemented in source. No live backend evidence. |
| Search loading/empty/error `801:9510`, `801:9542`, `801:9575` | `/friends` | Search actual friend list by name/code; distinguish empty list and no match; preserve search on fetch error | Search and empty/no-match states implemented in source. Visual comparison not run. |
| Inbox empty/error `801:9627`, `801:9655` | `/inbox` | Empty directs user appropriately; error retains route and offers retry | Loading/error/empty and retry states exist. Visual comparison not run. |
| History initial error/offline cache/no-cache `801:9695`, `801:9846`, `801:9775` | `/history` | Error offers retry; network/timeout may show cache with `fetchedAt`/stale; no cache gives retry state | Full mobile suite passed; visual comparison and device run not done. |

## Open gaps

- Live room invite picker and canonical result route are implemented; live backend authorization and visual states remain unverified.
- 412dp, 360dp, 320dp, 200% font scale, TalkBack, touch-target and Android safe-area visual checks remain Not run.
- Trí must review visual differences and remaining scope before acceptance. No status or approval is implied by this handoff.

## Live AVD comparison — 2026-11-08 (pre-refresh; historical)

- Figma frames were inspected at the approved 412×915 design size. App was opened on `Medium_Phone_API_37.0` (Android 17/API 37, Expo Go 58.0.5) at approximately 412dp. This is an emulator comparison, not evidence from a physical Android device.

| Figma frame | Expected composition | Actual on AVD | Result/evidence |
|---|---|---|---|
| Friends `330:3076` | App logo/top notification affordance, page title and search, invitation section, friend-code/share card; bottom navigation for Home/Friends/History/Profile | App renders a branded top header with friends/bell/profile icons and segmented Friends/Inbox/History tabs; page content differs from the approved hierarchy | **Fail** — `artifacts/2026-11-08-pr126-avd/friends-412-redacted.png` |
| Room invites `330:3077` and notifications `330:3079` | Notification page with “Mới/Trước đó” sections and invitation/result notification rows | App uses the segmented route tabs and an “Thông báo trên thiết bị” panel; rows can be acted on, but page structure does not match the approved frame | **Fail** — `inbox-before-reject-412.png`, `inbox-after-accept-412.png` |
| History `330:3081`, delete `263:1880` | History list/details with approved navigation and consent/delete placement | Consent screen and controls function, but app header/navigation and content placement differ; no saved canonical result was available for visual detail/delete comparison | **Fail / partial functional evidence** — `history-consent-412.png`, `history-consent-result-412.png` |

- Responsive and accessibility attempts: 360dp, 320dp and 200% font scaling encountered an Expo Go reload error (`EventEmitter` undefined), so these viewports are **Fail**, not parity passes. TalkBack service binding, labels and target dimensions were inspected, but complete focus order, spoken labels and activation remain **Not run**. See `CHECKS.md` and `talkback-observation.txt`.
- Result: functional live social/history pieces are present, but the tested composition is not visually at parity with these approved Figma frames. Do not mark Figma parity Pass. The screenshots are app evidence only; no pixel-diff claim is made because a Figma screenshot export was not captured in this run.

## UI composition refresh — 2026-11-08

- Source base: `e5f6e281c7f2b1c5b3e26d4decbde0b80a5be0e6` merged with `origin/main` `8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb`; the GM-28 source changes below are local and uncommitted.
- Device: `Medium_Phone_API_37.0`, Android 17/API 37, Expo Go 58.0.5, 1080×2400 pixels at density 420 (about 412dp), font scale 1.0. The floating gear is Expo Go's development control, not an app component.
- Reference PNGs were exported from the actual task nodes at 412×915/916 and stored beside the AVD captures. Comparison is visual; no pixel-diff threshold was used.

| Figma node | Figma reference | AVD evidence | Comparison |
|---|---|---|---|
| Friends `232:2` / task `330:3076` | [Figma frame](artifacts/2026-11-08-pr126-avd/figma-friends-412.png) | [Header/search/invites](artifacts/2026-11-08-pr126-avd/friends-final-412.png), [friend row and share card](artifacts/2026-11-08-pr126-avd/friends-lower-412.png) | **Partial.** Header, title, search, invite section, friend row, share card and bottom navigation now follow the Figma hierarchy and tokens. Button orientation and friend overflow layout were corrected after live inspection. Fixture data differs from the Figma sample (three pending invitations and one friend); the share code is intentionally omitted from the saved screenshot. |
| Inbox `286:2245` / task `330:3079` | [Figma frame](artifacts/2026-11-08-pr126-avd/figma-inbox-412.png) | [Live inbox](artifacts/2026-11-08-pr126-avd/inbox-final-412.png), [read-all interaction](artifacts/2026-11-08/inbox-read-all-live.png) | **Partial; functional read-all Pass.** Back header, “Mới” section, notification rows, timestamps and invitation actions follow the frame structure. “Đọc tất cả” now calls GM-23.3 and received a real server ACK/readback on the AVD. The neutral invitation title/body still differs from a personalized sender profile, and full layout parity remains incomplete. |
| History `232:226` / task `330:3081` | [Figma frame](artifacts/2026-11-08-pr126-avd/figma-history-412.png) | [Live history page](artifacts/2026-11-08-pr126-avd/history-final-412.png), [populated result card](artifacts/2026-11-08-pr126-avd/history-live-result-card.png) | **Partial; populated data case Pass.** Header, title, filters, management entry and bottom navigation render. A persisted canonical history result was opened and matched the stored winner/score/ranks; this is functional parity evidence, not pixel-perfect parity with a populated Figma frame. |

- AVD manual inspection also confirmed the friend overflow opens the existing unfriend confirmation sheet without sending the mutation. The actual row menu is a 48dp ellipsis with an accessibility label; screenshot: [friend list](artifacts/2026-11-08-pr126-avd/friends-lower-412.png).
- Overall visual parity remains **Fail / not ready for acceptance** because the remaining composition differences and required small-width/200% font and complete TalkBack checks have not all passed on this final UI source. The older pre-refresh screenshots remain historical and are not used to judge the refreshed composition.

## Canonical result/history data case — 2026-11-08

- The AVD now has a real QA result and saved personal-history projection. [Inbox result row](artifacts/2026-11-08-pr126-avd/inbox-live-result-row.png), [opened canonical result](artifacts/2026-11-08-pr126-avd/result-live-final.png), and [history result card](artifacts/2026-11-08-pr126-avd/history-live-result-card.png) replace the earlier “no saved canonical result” limitation for this state only.
- The API projection contained three dishes tied at dense rank 1 with 2 points; the winner was `Phở gà`. Inbox tap opened the matching result, and history rendered the same persisted ranks/scores. This demonstrates functional refetch/data parity, not pixel-perfect parity with a populated Figma history frame.
- The earlier Inbox read-all prototype had AVD functional evidence. PR #126 now delivers the GM-28.1 server operation. Full page visual parity plus final-source 320/360dp, 200% font and TalkBack evidence remain **Partial/Fail/Not run** as recorded above. The result screen is owned by GM-27 and is shown here only as the target reached from the GM-28 Inbox.

## Historical Inbox read-all prototype interaction — 2026-11-08

- Frame: Inbox / Notifications `286:2245` (approved reference listed above). The AVD rendered the “Đọc tất cả” action, and its press was verified end-to-end against the disposable GM-23.3 API.
- Expected behavior: mark every current unread, unexpired item for the authenticated caller as read, including items outside the 50-row display page, and show completion only after the server ACK.
- Actual behavior: the app displayed one unread invite; after tapping, it showed the server confirmation and a server-side readback returned one read and zero unread. Evidence: [app screenshot](artifacts/2026-11-08/inbox-read-all-live.png), [manifest and hashes](artifacts/2026-11-08-inbox-read-all/manifest.json).
- This is a functional interaction result. A new side-by-side Figma export comparison was not performed for this supplement; the earlier finding that overall layout parity is Partial/Fail remains. The user-visible floating gear in the screenshot is Expo Go's development menu, not part of the product UI.

## PR #126 four review findings follow-up — 2026-11-08

- Deterministic sample data is now aligned with the approved Friends, Inbox and History examples so captures compare equivalent states. The development-only /dev/gm28-parity route injects fixed repositories into the actual live-screen components; it does not call Auth, REST, or mutate data.
- Android Studio AVD: Medium_Phone_API_37.0, Android 17/API 37, Expo Go 58.0.5, 1080×2400 at density 420 (about 412dp), font scale 1.0 for reference-state captures.

| Approved Figma frame | Aligned sample state | AVD capture | Finding |
|---|---|---|---|
| Friends 330:3076 | 2 friends (Linh, Nam), 1 incoming request (An Nguyễn) | [Friends 412dp](artifacts/2026-11-08-pr126-four-findings/gm28-friends-figma-fixture-412dp-100pct.png) | Sample data alignment is clear. Visual composition remains Partial. |
| Inbox 330:3079 | 2 incoming invitations plus prior decided and no-consensus result notifications | [Inbox 412dp](artifacts/2026-11-08-pr126-four-findings/gm28-inbox-figma-fixture-412dp-100pct.png) | Sample data alignment is clear. Button labels follow the current product request (“Chấp nhận” / “Từ chối”); other layout/text differences remain. |
| History 330:3081 | 2 decided entries with scores and participant projections, plus 1 no-consensus entry | [History 412dp](artifacts/2026-11-08-pr126-four-findings/gm28-history-figma-fixture-412dp-100pct.png) | Sample data alignment is clear. Visual composition remains Partial. |

- Responsive captures: [Friends 360dp/200%](artifacts/2026-11-08-pr126-four-findings/gm28-friends-360dp-200pct.png), [Friends 320dp/200%](artifacts/2026-11-08-pr126-four-findings/gm28-friends-320dp-200pct.png), and [History 320dp/200%](artifacts/2026-11-08-pr126-four-findings/gm28-history-320dp-200pct.png). The four bottom tabs and wrapped labels remain visible; content scrolls above the fixed navigation.
- Accessibility observation: [TalkBack at 320dp/200%](artifacts/2026-11-08-pr126-four-findings/gm28-talkback-add-friend-320dp-200pct.png) shows focus and activation of the Add Friend action. It does not include a full utterance transcript or exhaustive focus traversal.
- Bottom navigation changes make all four tab labels fit. History metadata now shows a relative date and consent-projected participant names where present, with member count as fallback. This improves data/text parity but does not establish pixel parity.
- Overall status remains **Partial**, not Pass: sample data is fixture-only; component details still differ from Figma; no pixel-diff was run; full TalkBack narration remains unverified. These screenshots do not establish API/runtime behavior. The emulator was restored to 1080×2400, font scale 1.0, density 420 and TalkBack off; it is displaying the Friends fixture for inspection.
