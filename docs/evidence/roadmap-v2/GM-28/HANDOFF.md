# GM-28 — Handoff

## Revision and contract

- Task contract: `ui-figma-final/2026-10-25/GM-28.2` (consumer revision; API producer versions still require target verification).
- Initial base artifact revision: `origin/main` at `8cf8084a021d56fae261da34503ed5a7a45681bd` (2026-10-18); follow-up rebased onto `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc` (2026-11-06).
- Start inputs on that revision: GM-07 API contracts/client, GM-14 Friends screen, GM-25 room repository. GM-21/22/23 integration outputs must be rechecked on target before merge.
- Owner feedback follow-up commit `28bb31e` is pushed to PR #126 (`codex/gm-28-social-inbox-history`). The PR remains draft; review/approval and live API/Android/Figma evidence are still outstanding.
- Additional review revision `2ec9c2a` adds repository/auth epoch checks for pending history and durable-cache reads plus regressions using real SessionManager/ApiClientImpl/LiveRoomRepository compositions. It is pending push; latest mobile suite is 69 suites / 1129 tests Pass.

## Owner feedback follow-up — PR #126

Local changes address ThanhTris's PR #126 comments on identity-lifetime/history cache races, feature API 401 recovery, the missing live room invite flow, canonical history/result projections, invitation acceptance routing, inbox result references, G01 name search, and consolidating the live routes with G01–G03. These changes are still local and await owner review; no status or approval is implied.

## Artifacts

- `mobile/src/features/friends/services/socialRepository.ts` — session-aware friend identity/list/invite/accept/reject/remove adapter.
- `mobile/src/features/inbox/services/inboxRepository.ts` — server inbox adapter, event deduplication and inbox-row cursor; accepted invitation routes from a refetched canonical room snapshot, and result notifications resolve only through an authorized room/result reference.
- `mobile/src/features/history/services/historyRepository.ts` — server canonical history projection, identity/generation-safe serialized cache, consent/delete invalidation, and durable authorized snapshot.
- `mobile/src/features/shared/services/sessionApi.ts` and `mobile/src/features/rooms/services/roomRepository.ts` — feature API calls go through authenticated session lifecycle; 401 transitions to session recovery and stale identity results are rejected.
- `mobile/src/features/friends/screens/LiveFriendsScreen.tsx`, `mobile/src/features/inbox/screens/LiveInboxScreen.tsx`, `mobile/src/features/history/screens/LiveHistoryScreen.tsx` — live screens; friend search uses the live friend list; no mock fixture fallback.
- `/friends`, `/inbox`, `/history` are the consolidated routes for the live screens. Legacy `/gm28/*` URLs redirect to them; mock preview screens remain reachable from mock-mode routes.
- `mobile/src/features/rooms/screens/LiveLobbyScreen.tsx` — host can select and invite an actual friend in the current lobby, subject to existing-member and 20-person roster checks.
- `mobile/src/features/result/screens/LiveCanonicalResultScreen.tsx` — result route refetches the current authorized room snapshot and checks canonical terminal result/result ID before rendering.
- Real Home actions route Friends, Inbox and History into these live screens; mock mode continues to use the existing preview routes.
- History uses the identity-scoped last successful snapshot after a network/timeout failure and labels it with its original device `fetchedAt` and stale state. Auth and other server errors do not reveal cached history.
- The GM-25 `mobile/src/features/rooms/services/roomRepository.ts` foundation is consumed unchanged; social/inbox/history API calls are owned by feature adapters.

## Run

From `mobile/`, install the locked baseline and run checks:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run check
npm start -- --clear
```

Set `EXPO_PUBLIC_SUPABASE_URL` to a reachable test Supabase endpoint and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable key before starting to enter real mode. Use the app's authenticated session flow, then open `/gm28/friends`, `/gm28/inbox`, or `/gm28/history`. Never use a service-role key in the app. A phone must use a network-reachable HTTPS endpoint, not the computer's loopback URL.

## Behavior and limits

- Friend and room invitation identifiers come only from API DTOs; inbox `eventId` is never substituted for `metadata.invitationId`.
- Accepting a room invitation refetches the canonical room snapshot and routes by its current state; it does not cast a vote or set ready.
- History consent is explicit because the API has no consent-status read endpoint. Group visibility and deletion remain server-enforced. Legacy history is rendered without fabricated ranking/score values.
- History memory and durable cache writes are identity/generation checked, serialized, and cleared/invalidated after logout, consent change or deletion.
- `fetchedAt` is device time when the API response is received, not a server timestamp.
- API and Android multi-user cases remain pending real test credentials, endpoint and Android device/build. No production behavior or task completion is claimed by this handoff.
- Android/API multi-user and visual Figma checks still require their device/backend/design evidence. See `CHECKS.md` and `FIGMA_PARITY.md` for current local checks and explicit limits.

## Receiving tasks

GM-29 consumes the inbox/repository foundations and owns native permission/token handling. Recheck GM-21/22/23/25 handoffs and merged revisions before merge; GM-31 remains responsible for durable outbox/cache behavior.
