# GM-28 — Handoff

## Revision and contract

- Task contract: `food-v1/roadmap-v2/GM-28.1`.
- Base artifact revision: `origin/main` at `8cf8084a021d56fae261da34503ed5a7a45681bd` (2026-10-18).
- Start inputs on that revision: GM-07 API contracts/client, GM-14 Friends screen, GM-25 room repository. GM-21/22/23 integration outputs must be rechecked on target before merge.
- This working revision is not committed or reviewed yet.

## Artifacts

- `mobile/src/features/friends/services/socialRepository.ts` — session-aware friend identity/list/invite/accept/reject/remove adapter.
- `mobile/src/features/inbox/services/inboxRepository.ts` — server inbox adapter, event deduplication and inbox-row cursor; room invitation acceptance returns the server room result.
- `mobile/src/features/history/services/historyRepository.ts` — server-only history fetch, user-scoped in-memory cache, explicit consent/delete mutations and invalidation.
- `mobile/src/features/shared/services/sessionApi.ts` — feature API calls through the authenticated client; rejects results returned after logout or identity change.
- `mobile/src/features/friends/screens/LiveFriendsScreen.tsx`, `mobile/src/features/inbox/screens/LiveInboxScreen.tsx`, `mobile/src/features/history/screens/LiveHistoryScreen.tsx` — live screens; they do not fall back to mock fixtures.
- `mobile/src/app/gm28/` — Expo routes. Home shows Friends/Inbox links only in real mode; direct routes in mock mode show an integration-unavailable message.
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
- Accepting a room invitation navigates to room preview; it does not cast a vote or set ready.
- History consent is explicit because the API has no consent-status read endpoint. Group visibility and deletion remain server-enforced.
- History cache is in memory, keyed by authenticated user, and cleared by logout cleanup. Durable cache/outbox is GM-31.
- `fetchedAt` is device time when the API response is received, not a server timestamp.
- API and Android multi-user cases remain pending real test credentials, endpoint and Android device/build. No production behavior or task completion is claimed by this handoff.

## Receiving tasks

GM-29 consumes the inbox/repository foundations and owns native permission/token handling. Recheck GM-21/22/23/25 handoffs and merged revisions before merge; GM-31 remains responsible for durable outbox/cache behavior.
