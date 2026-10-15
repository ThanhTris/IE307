# GM-14 handoff

- Task / owner / reviewer: GM-14 / Trung / Trí
- Contract: `food-v1/roadmap-v2/GM-14.1`
- Branch / target: `codex/gm-11-14-ui` integrates `main` at `ad393b8`; merge commit `fe29883`.
- Tested integrated revision: `fe29883`; `cd mobile; npm run check` passed (16 suites / 476 tests). Current-main Android bundle was not rerun. Inbox reference mapping is feature-local and does not alter GM-07 `mock.ts`.
- Review request: [owner comment on GM-14](https://github.com/ThanhTris/IE307/issues/75#issuecomment-6193240420).

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/friends/screens/FriendsScreen.tsx` | Friends, invitations and expiry/empty/error fixtures | `cd mobile; npm start`; open `/features`, then GM-14 friends | GM-28 integration |
| `mobile/src/features/inbox/screens/InboxScreen.tsx` | Inbox uses typed metadata invitationId separately from inbox/event IDs; invalid/expired references disable actions | same | GM-28 / GM-29 |
| `mobile/src/features/history/screens/HistoryScreen.tsx` | Consent toggles, fetchedAt, delete confirmation and synthetic summaries | same | GM-28 / GM-31 |
| `mobile/src/features/shared/components/MockDemo.tsx`, `mobile/src/app/gm14/*`, `mobile/src/app/features.tsx` | Explicit mock picker/disclosure and Expo Router entries | `npm start`; route `/features` | GM-28 integration |
| `docs/evidence/roadmap-v2/GM-14/CHECKS.md` | Automated assertions, output and remaining device check | read alongside this handoff | Reviewer |

## Status and known limits

Screens use mock fixtures and mock API calls only. Friend/room inbox accept and reject pass the explicit `metadata.invitationId` (not `eventId`); the default GM-07 room fixture is associated through a separate GM-14 mapping keyed by inbox item ID. Missing/expired reference is blocked; a strict test double rejects event IDs. Direct friends reject and outgoing-invite tests are included. Denied notification permission is represented in the fixture; no OS permission prompt or remote push is invoked. History consent/deletion is ephemeral local state and fetchedAt is not durable cache. No real account linking is present; P1 is labeled unimplemented. Expo Go Android visual/accessibility smoke and fresh merge readiness remain unverified; GitHub Project query was rejected during the latest gate attempt. No Done/Approved status is implied.
