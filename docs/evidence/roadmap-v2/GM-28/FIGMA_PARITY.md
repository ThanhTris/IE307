# GM-28 Figma parity evidence

## Review record

- Figma source: task UI map and approved task nodes referenced from `tasks/backlog/GM-28.md`.
- App revision: current GM-28 follow-up rebased on `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc`.
- App build/device and screenshot capture: Not run. `npm ci` failed with `ENOTEMPTY`; no Android device/build was available.
- Figma screenshots/design-context export: Not captured in this run. This file records the mapping and verification gap; it does not claim visual parity.

## Frame to route mapping

| Figma state/node | App route/state | Data and expected behavior | Actual/evidence |
|---|---|---|---|
| Friends / search / invitations `330:3076` | `/gm28/friends` | Authenticated social identity, friend list and invite by friend code; retry does not send a mutation | Route and live repository exist. No Android interaction or screenshot captured. |
| Room invitation / send / reject `330:3077` | `/gm28/inbox` | Inbox invitation uses server invitation ID; accept navigates to room preview; no ready/vote side effect | Inbox adapter and screen exist. No Android interaction or screenshot captured. |
| Notifications `330:3079` | `/gm28/inbox` | Inbox refetches canonical server rows; duplicate events are removed by event ID | Adapter has event deduplication and inbox-row cursor. API/device check not run. |
| History / details `330:3081` | `/gm28/history` | Read canonical personal/group projection; consent and delete go to server | Screen/repository exist. API/ACL/delete test not run. |
| Delete history `263:1880` | `/gm28/history` | Confirm server delete and refetch authorized projection | Confirmation and server delete path exist. No live backend evidence. |
| Search loading/empty/error `801:9510`, `801:9542`, `801:9575` | `/gm28/friends` | Keep query on error; retry must not create duplicate invite | Existing screen does not implement the designed name-search flow; this state remains a scope gap. |
| Inbox empty/error `801:9627`, `801:9655` | `/gm28/inbox` | Empty directs user appropriately; error retains route and offers retry | Loading/error/empty and retry states exist. Visual comparison not run. |
| History initial error/offline cache/no-cache `801:9695`, `801:9846`, `801:9775` | `/gm28/history` | Error offers retry; network/timeout may show cache with `fetchedAt`/stale; no cache gives retry state | Offline fallback code added; test not executed due dependency install failure. No screenshot. |

## Open gaps

- Friends name-search/loading/empty/error interaction from G01 is not implemented; current screen invites by code and lists friends.
- 412dp, 360dp, 320dp, 200% font scale, TalkBack, touch-target and Android safe-area visual checks remain Not run.
- Trí must review visual differences and remaining scope before acceptance. No status or approval is implied by this handoff.
