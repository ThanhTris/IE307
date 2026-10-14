# GM-14 handoff

- Task / owner / reviewer: GM-14 / Trung / Trí
- Contract: `food-v1/roadmap-v2/GM-14.1`
- Branch / base: `codex/gm-11-14-ui` / `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`
- Implementation commit: `41eb135`. Evidence-only follow-up changes do not alter the checked mobile source; rerun checks if source changes.

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/friends/screens/FriendsScreen.tsx` | Friends, invitations and expiry/empty/error fixtures | `cd mobile; npm start`; open `/features`, then GM-14 friends | GM-28 integration |
| `mobile/src/features/inbox/screens/InboxScreen.tsx` | Inbox visible with denied push permission fixture; confirmed invitation action | same | GM-28 / GM-29 |
| `mobile/src/features/history/screens/HistoryScreen.tsx` | Consent toggles, fetchedAt, delete confirmation and synthetic summaries | same | GM-28 / GM-31 |
| `mobile/src/features/shared/components/MockDemo.tsx`, `mobile/src/app/gm14/*`, `mobile/src/app/features.tsx` | Explicit mock picker/disclosure and Expo Router entries | `npm start`; route `/features` | GM-28 integration |
| `docs/evidence/roadmap-v2/GM-14/CHECKS.md` | Automated assertions, output and remaining device check | read alongside this handoff | Reviewer |

## Status and known limits

Screens use mock fixtures and mock API calls only. Denied notification permission is represented in the fixture; no OS permission prompt or remote push is invoked. History consent/deletion is ephemeral local state and fetchedAt is not durable cache. No real account linking is present; P1 is labeled unimplemented. Reject/invite flows need additional direct smoke assertions. Expo Go Android visual smoke is Not run and remains required for task acceptance. No Done/Approved status is implied.

