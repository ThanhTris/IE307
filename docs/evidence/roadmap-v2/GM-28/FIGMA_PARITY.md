# GM-28 Figma parity evidence

## Review record

- Figma source: task UI map and approved task nodes referenced from `tasks/backlog/GM-28.md`.
- App revision: current GM-28 follow-up rebased on `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc`.
- App build/device and screenshot capture: Not run; no Android device/build was available. Local typecheck/lint and Jest checks do not establish visual parity.
- Figma screenshots/design-context export: Not captured in this run. This file records the mapping and verification gap; it does not claim visual parity.

## Frame to route mapping

| Figma state/node | App route/state | Data and expected behavior | Actual/evidence |
|---|---|---|---|
| Friends / search / invitations `330:3076` | `/friends` (legacy `/gm28/friends` redirects) | Authenticated friend list, local name/friend-code search and invite by friend code | Implemented in source. No Android interaction or screenshot captured. |
| Room invitation / send / reject `330:3077` | `/inbox` (legacy `/gm28/inbox` redirects) | Inbox invitation uses server invitation ID; acceptance refetches canonical room state and routes without ready/vote side effects | Implemented in source. No Android interaction or screenshot captured. |
| Notifications `330:3079` | `/inbox` | Inbox refetches canonical rows; duplicate events are removed by event ID | Adapter has event deduplication/cursor; result references are resolved through an authorized room snapshot. API/device check not run. |
| History / details `330:3081` | `/history` (legacy `/gm28/history` redirects) | Read canonical personal/group projection; consent and delete go to server; legacy entries stay explicitly unscored | Implemented in source. API/ACL/delete test not run. |
| Delete history `263:1880` | `/history` | Confirm server delete, invalidate in-flight reads and update authorized cached projection | Implemented in source. No live backend evidence. |
| Search loading/empty/error `801:9510`, `801:9542`, `801:9575` | `/friends` | Search actual friend list by name/code; distinguish empty list and no match; preserve search on fetch error | Search and empty/no-match states implemented in source. Visual comparison not run. |
| Inbox empty/error `801:9627`, `801:9655` | `/inbox` | Empty directs user appropriately; error retains route and offers retry | Loading/error/empty and retry states exist. Visual comparison not run. |
| History initial error/offline cache/no-cache `801:9695`, `801:9846`, `801:9775` | `/history` | Error offers retry; network/timeout may show cache with `fetchedAt`/stale; no cache gives retry state | Full mobile suite passed; visual comparison and device run not done. |

## Open gaps

- Live room invite picker and canonical result route are implemented; live backend authorization and visual states remain unverified.
- 412dp, 360dp, 320dp, 200% font scale, TalkBack, touch-target and Android safe-area visual checks remain Not run.
- Trí must review visual differences and remaining scope before acceptance. No status or approval is implied by this handoff.
