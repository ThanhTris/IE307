# GM-28 — Handoff

## Revision and contract

- Task contract: `ui-figma-final/2026-10-25/GM-28.2` (consumer revision; API producer versions still require target verification).
- Initial base artifact revision: `origin/main` at `8cf8084a021d56fae261da34503ed5a7a45681bd` (2026-10-18); follow-up rebased onto `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc` (2026-11-06).
- Start inputs on that revision: GM-07 API contracts/client, GM-14 Friends screen, GM-25 room repository. GM-21/22/23 integration outputs must be rechecked on target before merge.
- Owner feedback follow-up commit `28bb31e` is pushed to PR #126 (`codex/gm-28-social-inbox-history`). The PR remains draft; review/approval and live API/Android/Figma evidence are still outstanding.
- Additional review revision `2ec9c2a` adds repository/auth epoch checks for pending history and durable-cache reads plus regressions using real SessionManager/ApiClientImpl/LiveRoomRepository compositions. It is pending push; latest mobile suite is 69 suites / 1129 tests Pass.
- Follow-up for Trí's 2026-11-06 recheck is in commits based on reviewed PR head `97007037`, now pushed to PR #126 at head `0827990`: session-epoch ballot protection, version-tolerant outbox reconciliation, logout despite push network failure, shared history TTL/consent invalidation, stale result response guard, ACK-only push token tracking/retry, and retryable secure payload cleanup. Added focused regressions; full mobile check passes 70 suites / 1138 tests. The GM-28 social invite/ACL matrix, Android/native/Figma evidence and PR #157 result-reader coordination remain outstanding.
- The pushed head `0827990` also passed CI run `42268134968`: Supabase startup and GM-18 SQL/HTTP plus GM-21 history/consent integration passed; the prior port-54322 startup collision did not recur. This still does not execute the GM-28 social invite/ACL matrix, Android native persistence/push delivery or Figma visual checks.

## Owner feedback follow-up — PR #126

Local changes address ThanhTris's PR #126 comments on identity-lifetime/history cache races, feature API 401 recovery, the missing live room invite flow, canonical history/result projections, invitation acceptance routing, inbox result references, G01 name search, and consolidating the live routes with G01–G03. These changes are still local and await owner review; no status or approval is implied.

## Artifacts

- `mobile/src/features/friends/services/socialRepository.ts` — session-aware friend identity/list/invite/accept/reject/remove adapter.
- `mobile/src/features/inbox/services/inboxRepository.ts` — server inbox adapter, event deduplication and inbox-row cursor; accepted invitation routes from a refetched canonical room snapshot, and result notifications resolve only through an authorized room/result reference.
- `mobile/src/features/history/services/historyRepository.ts` — server canonical history projection, identity/generation-safe serialized in-memory cache, consent/delete invalidation, and injectable `DurableHistoryStore` interface. SQLite/SecureStore wiring belongs to GM-31.
- `mobile/src/features/shared/services/sessionApi.ts` and `mobile/src/features/rooms/services/roomRepository.ts` — feature API calls go through authenticated session lifecycle; 401 transitions to session recovery and stale identity results are rejected.
- `mobile/src/features/friends/screens/LiveFriendsScreen.tsx`, `mobile/src/features/inbox/screens/LiveInboxScreen.tsx`, `mobile/src/features/history/screens/LiveHistoryScreen.tsx` — live screens; friend search uses the live friend list; no mock fixture fallback.
- `/friends`, `/inbox`, `/history` are the consolidated live routes. Mock preview screens remain reachable from mock-mode routes. Task-number route aliases have been removed.
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

Set `EXPO_PUBLIC_SUPABASE_URL` to a reachable test Supabase endpoint and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its publishable key before starting to enter real mode. Use the app's authenticated session flow, then open `/friends`, `/inbox`, or `/history`. Never use a service-role key in the app. A phone must use a network-reachable HTTPS endpoint, not the computer's loopback URL.

## Behavior and limits

- Friend and room invitation identifiers come only from API DTOs; inbox `eventId` is never substituted for `metadata.invitationId`.
- Accepting a room invitation refetches the canonical room snapshot and routes by its current state; it does not cast a vote or set ready.
- History consent is explicit because the API has no consent-status read endpoint. Group visibility and deletion remain server-enforced. Legacy history is rendered without fabricated ranking/score values.
- History memory-cache writes are identity/generation checked, serialized, and cleared/invalidated after logout, consent change or deletion. Durable persistence is intentionally not initialized from this task's repository.
- `fetchedAt` is device time when the API response is received, not a server timestamp.
- API and Android multi-user cases remain pending real test credentials, endpoint and Android device/build. No production behavior or task completion is claimed by this handoff.
- Android/API multi-user and visual Figma checks still require their device/backend/design evidence. See `CHECKS.md` and `FIGMA_PARITY.md` for current local checks and explicit limits.

### PR #126 canonical result/history close-out — 2026-11-08

- A live Android Studio AVD + owned local Auth/REST/worker run now exercised the complete inbox result handoff: invite accepted, room started, full ballot submitted in the app, a canonical terminal result was stored, a matching room-result notification appeared in Inbox, tapping it opened the authorized result, and the saved personal history was deleted and reloaded empty. See `CHECKS.md` and `artifacts/2026-11-08-pr126-avd/live-closeout-manifest.json` for exact evidence and screenshots.
- The result had one acknowledged ballot from a two-member room and three equal score-2/dense-rank-1 dishes. The UI and history matched the persisted winner/top-three projection; this is not evidence of two-member consensus. A third, non-member identity was denied with `403 / NOT_MEMBER`.
- Cross-adapter consent invalidation remains unit-tested; the live run did not revoke consent after deleting its only history row. No durable offline cache was enabled by this task.
- This handoff does not claim full Figma parity, small viewport/200% font, full TalkBack, native/physical device, remote push, NO_CONSENSUS open, group-consent or retention-matrix completion. GM-28 remains subject to Trí’s review and the task’s remaining AC.

## 2026-11-08 PR #126 follow-up

- The review follow-up adds strict raw validation for social/inbox/history projections, session-epoch and stale-response protection, cross-adapter history cache invalidation, authorized canonical room/result refetch, and retry-safe session/API behavior. A handled invite is filtered in memory after the server confirms accept/reject; the upstream inbox contract does not persist a handled/read transition, so the same old row may return after app restart.
- QA used an owned disposable Supabase runtime from migrations through `0040_v4_preference_validation.sql`, with JWT-backed guest identities and synthetic social data. It did not alter the application DB. See the run-specific CHECKS/evidence and cleanup record.
- AVD functional flows exercised friends, room invitations and personal history consent at approximately 412dp. The evidence is Android Studio emulator + Expo Go, not a native development build or a physical phone. Canonical result/history authorization cases requiring a saved terminal result remain untested.
- **Do not treat this handoff as GM-28 acceptance yet.** The mobile/API run exposes a migration-0040 source-hash mismatch in the generic GM-V4 runner; Figma parity fails; narrow viewport/200% Expo Go reload fails; full TalkBack focus/activation and canonical saved-history cases are not run. These are recorded with expected/actual evidence in `CHECKS.md` and `FIGMA_PARITY.md`.
- The QA API and DB ports, run ID, device details, and local source/base revision are in the dated evidence. No secret, JWT, friend code, or identity UUID is included in the sanitized artifacts. No commit, push, PR edit, merge, Project status, or approval was performed.

## Receiving tasks

GM-29 consumes the inbox/repository foundations and owns native permission/token handling. Recheck GM-21/22/23/25 handoffs and merged revisions before merge; GM-31 remains responsible for durable outbox/cache behavior.

## GM-28.1 Inbox read-all

- [Migration 0041](../../../../supabase/migrations/0041_gm28_inbox_read_all.sql) is delivered with PR #126.
  Schema `0.17.0`, contract `food-v1/roadmap-v2/GM-28.1`.
- `POST /rest/v1/rpc/mark_all_partner_inbox_read` requires an authenticated guest or account.
  Send `{"requestId":"<opaque ID>"}`. Success is `{"ok":true,"requestId":"<same ID>","data":null}`.
- The RPC changes only caller-owned unread, unexpired rows at the server cutoff, including later inbox pages.
  It uses the existing 24-hour ACK store. A repeat of the same request returns the stored ACK.
  New rows after the cutoff are processed by a new request. The caller limit is 30 fresh requests per minute.
- The feature repository uses the authenticated API client's existing RPC transport. It checks the success
  envelope before marking rows as read. The inbox also accepts both the existing two-ID result metadata
  and the complete canonical metadata. Accepting/rejecting an invitation is a separate action.
- Start and verify a disposable instance using `npm run qa:start` and `npm run qa:verify` with the same
  unique `--run-id` and free loopback ports. Run the [HTTP cases](../../../../supabase/tests/http/GM-28.http)
  using private guest credentials and the [SQL tests](../../../../supabase/tests/database/GM-28_inbox_read_all.test.sql)
  on that instance. The SQL file rolls back its fixtures. Stop the instance using `npm run qa:stop`
  with the same run ID.
- The existing AVD screenshots are from the earlier local prototype of read-all. See [CHECKS](CHECKS.md)
  for the evidence on the migration in this PR and the remaining Chặng 3A checks.

## PR #126 four review findings follow-up — 2026-11-08

- Legacy room_result inbox rows with exactly roomId and resultId now use the authenticated legacy get_room_snapshot adapter and open the read-only /inbox-result route. Versioned canonical rows continue through the GM-07.B snapshot path; unsupported versions fail closed, with no cross-contract fallback. Repository and component regressions pass. A live legacy API request on the AVD remains Not run.
- The bottom navigation wraps labels inside each equal-width tab so all four tab labels remain visible at 320dp and 360dp with 200% font scale. Page content scrolls independently.
- The development-only /dev/gm28-parity route renders fixed Figma sample fixtures through the same Friends, Inbox and History screens. It never calls the API and is not evidence of backend/API success.
- AVD TalkBack observation reached brand → notifications → Add Friend by focus navigation; Enter opened the dialog without sending. A full spoken-label transcript and full screen traversal are not evidenced.
- See [CHECKS](CHECKS.md), [FIGMA_PARITY](FIGMA_PARITY.md), [follow-up matrix](artifacts/2026-11-08-pr126-four-findings/FOLLOWUP.md), and [manifest](artifacts/2026-11-08-pr126-four-findings/manifest.json). Overall visual parity remains Partial. The AVD is Expo Go on an emulator, not a physical device or native build.
