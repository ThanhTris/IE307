# GM-31 checks — 2026-11-09

Branch: `codex/gm-31-private-outbox` (PR #158). Owner: Trung. Reviewer: Trí / ThanhTris. Historical checks below were run at `bb662d9` and `031d99f`; current follow-up refactors upstream file ownership boundaries and completes Stage 3A AVD (`Medium_Phone_API_37.0`) + QA backend verification. Keep PR ready for Trí's review. No Project status or approval was changed.

## Local checks & scope alignment — 2026-11-09

- **Strict 1-Task-1-PR file ownership:**
  - `mobile/package.json`, `mobile/package-lock.json`, and `mobile/app.config.ts` (`expo-sqlite@~58.0.15`) are moved to the upstream GM-02 SDK 58 maintenance PR (#161) and untouched in this PR.
  - `mobile/src/features/voting/services/voteRepository.ts` (owned by GM-26), `mobile/tests/unit/voteRepository.test.ts` (GM-26), `mobile/src/data/api/common.ts` (GM-07), and `mobile/src/bootstrap/RoomRepositoryProvider.tsx` (GM-29) are untouched in this PR.
  - Created `mobile/src/features/voting/services/durableVoteRepository.ts` (`acknowledgedRequestIds`, `createDurableVoteRepository`, `DurableLiveVoteRepository`) wrapping `createLiveVoteRepository` and wired into `mobile/src/app/room/vote.tsx` and `mobile/src/app/room/final-round.tsx`.
  - Wired `getDurableOutbox()` into `mobile/src/app/history.tsx` (`createHistoryRepository(live.repository, undefined, getDurableOutbox())`) so G03 `/history` persists and recovers authorized personal history snapshots across process restarts when offline.
  - Wired `void getDurableOutbox().clearIdentity(identityId).catch(() => undefined)` into `clearVoteSession(identityId)` in `mobile/src/features/voting/services/voteSessionState.ts`, and invoked `retryPendingPrivateDeletions()` when `getDurableOutbox()` initializes.
  - Guarded native `ExpoSQLite` resolution with `requireOptionalNativeModule('ExpoSQLite')` in `mobile/src/data/local/outbox.ts` so dev clients without `ExpoSQLite` compiled in fall back cleanly to `SecureStoreMetadataDatabase` without throwing a RedBox error.

## Verification matrix

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Clean install & Expo compatibility | Pass | `npm ci --no-audit --no-fund`; `npm run check:expo` with SDK 58 baseline. |
| Typecheck, lint, architecture | Pass | `npm run typecheck`, `npm run lint` (0 errors), `npm run check:architecture` all exited 0. |
| Focused outbox & voting unit tests | Pass | `npx jest --runInBand tests/unit/gm31Outbox.test.ts tests/unit/voteRepository.test.ts`: 2 suites / 43 tests passed. Covers canonical ballot ACK gated on `ACCEPTED`, late snapshot rejection after identity switch/logout, other-room intent retention, future `expectedVersion` rejection, retry after `SecureStore` read failure across restart, and preservation of another identity's rows. |
| Repository validator, docs checker, diff check | Pass | `python scripts/validate_repository.py`, `python scripts/task_readiness.py --check-docs`, and `git diff --check` all exited 0. |
| Final local merge gate | Pass | `python scripts/task_readiness.py --task GM-31 --gate merge --base-ref origin/main --verify-outputs` returns `READY_FOR_MERGE_REVIEW`. |
| Process restart & session persistence on AVD (Stage 3A) | Pass | Tested on `Medium_Phone_API_37.0` (`emulator-5554`) connected to QA backend (`127.0.0.1:54381`). Executed `adb shell am force-stop vn.gicungduoc.mobile` and relaunched `MainActivity`; authenticated guest session (`TriQA`) and private durable cache restored cleanly ([`avd-restart-session-restored.png`](artifacts/avd-restart-session-restored.png)). |
| Offline session recovery & G03 durable history cache on AVD (Stage 3A) | Pass | Populated `/history` online ([`avd-history-online.png`](artifacts/avd-history-online.png)) and verified consent management sheet ([`avd-history-consent-sheet.png`](artifacts/avd-history-consent-sheet.png)). Disconnected QA backend (`adb reverse --remove tcp:54381`), restarted process, verified offline session/home recovery state ([`avd-home-offline-restore-382-7201.png`](artifacts/avd-home-offline-restore-382-7201.png)), offline `/history` fallback via `DurableOutbox` (`Đang ngoại tuyến · Dữ liệu lưu lúc ...`, [`avd-history-offline-801-9846.png`](artifacts/avd-history-offline-801-9846.png)), and offline error/retry notice ([`avd-friends-offline-error.png`](artifacts/avd-friends-offline-error.png)). |
| Responsive viewports & 200% font scale on AVD | Pass | Verified `412dp` ([`avd-history-offline-801-9846.png`](artifacts/avd-history-offline-801-9846.png)), `360dp` ([`avd-history-offline-360dp.png`](artifacts/avd-history-offline-360dp.png)), and `font_scale 2.0` ([`avd-history-offline-fontscale-200.png`](artifacts/avd-history-offline-fontscale-200.png)) without clipping or overlap. |
| Physical USB Android phone (Stage 3B) | Not run (Deferred to Stage 3B GM-33/GM-34) | Per project owner policy (2026-11-07 Two-Stage Testing), physical USB 2-client force-stop/offline testing is deferred to Stage 3B (`GM-33`/`GM-34`). |
