# Output checks — GM-25 / roadmap-v2

Status: Automated regression for the two onboarding findings and the API-rejected-token recovery passes on the local follow-up; merge gate is ready for Trí's review; Android/backend acceptance remains pending.
Task: GM-25 — UI–BE: nối Home, context, preferences và lobby
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`)
PR / branch: [#124](https://github.com/ThanhTris/IE307/pull/124) / `continue_task_gm_twenty_five`
Base: `origin/main` `4a8cd642c8d908d9e6d2c75d19c0935a44cba042`
Tested source: local follow-up tree on PR branch `continue_task_gm_twenty_five`, based on PR head `11fe8a7eb24f8281111a53dd4243cf39b6f96827`; upstream-delivered Home/Create/Join/Lobby/GM-16 session files are byte-identical to `origin/main`. The API-recovery follow-up is not pushed yet.
Contract: `food-v1/roadmap-v2/GM-25.1`; Expo SDK `57.0.30`; Node/npm from the Expo baseline.

## Historical result retained

The earlier `7412cf4` report listed 23 Jest suites / 635 tests and 24 CI checks as passing. The subsequent review reproduced two P1 identity/onboarding failures, so those results describe only that old revision and do not establish correctness of this change.

## Reproduce

From `mobile/`:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run test:expo-baseline
npm test -- tests/unit/authSession.test.ts tests/unit/roomRepository.test.ts tests/component/gm25ReviewFeedback.test.tsx tests/component/roomEntryScreens.test.tsx tests/component/gm11Screens.test.tsx
npm run check
npm run bundle:android
```

From the repository root:

```powershell
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

## Results on this local revision

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | **Pass** | Installed from `mobile/package-lock.json`; 1,064 packages. No manifest or lockfile change. |
| `npm run check:expo` | **Pass with environment note** | Expo `57.0.30`; installed dependencies match the lock. Expo reported compatibility validation as unreliable in offline mode before printing dependencies up to date. |
| `npm run test:expo-baseline` | **Pass** | 5/5 baseline tests. |
| Focused auth/repository/onboarding/lobby regressions | **Pass** | 5 suites / 116 tests, including original GM-09/GM-11 screens and GM-25-specific live screens. Auth uses the real `SessionManager` with synthetic storage/auth/API responses. |
| `npm run check` | **Pass** | TypeScript 0 errors; lint 0 errors with 4 pre-existing warnings in `contracts.ts` and `api/index.ts`; 23 Jest suites / 652 tests; architecture boundaries OK. |
| `npm run bundle:android` | **Pass** | Expo exported the Android JavaScript bundle to `mobile/dist/android` (entry `entry-db629a91d35f797c2d152f44565efd7c.hbc`); this is not Android-device or native-permission evidence. |
| `python scripts/validate_repository.py` | **Pass** | Documents, links, JSON, task manifest, dependencies and current FR traceability OK. Validator explicitly does not verify native build/backend execution or human approval. |
| `python -m unittest discover -s tests -p "test_*.py"` | **Pass** | 550 tests, 6 skipped; 156.89s. |
| `python scripts/task_readiness.py --check-docs` | **Pass** | Task indexes match task metadata. |
| `git diff --check` | **Pass after evidence cleanup** | Initial check found trailing spaces in this file's handoff header; removed them and reran clean. |
| Task readiness / merge gate | **READY_TO_CLAIM / READY_FOR_MERGE_REVIEW** | Project approval source returned READY_TO_CLAIM. Gate now accepts the local tree because upstream-delivered GM-09/GM-11/GM-16 artifacts match `origin/main`; it does not certify Android/backend AC or Trí's review. |
| Main ancestry / PR branch | **Pass** | Fetch found no new main commit: `origin/main` remains `4a8cd642c8d908d9e6d2c75d19c0935a44cba042`, an ancestor of the implementation. The tested tree is the update prepared for PR #124. |
| Android + backend integration | **Not run** | Android SDK `adb devices -l` returned an empty device list. No live API endpoint was selected or verified against the migration ledger and deployed RPC definitions. |

## Regression mapping

| Finding | Regression and expected behavior | Result |
| --- | --- | --- |
| Fresh Home had no usable create/join path; signup was unreachable | Provider restores once. Empty storage shows an explicit name sheet; one guest is created only after confirmation, then the chosen route mounts with the same user before discovery/room submission. | **Pass** — `gm25ReviewFeedback.test.tsx`; the synthetic auth call precedes discovery and create uses the restored user name. |
| Restore failure could silently replace identity; repository and provider disagreed | Restore network failure retains stored credentials and blocks entry; ambiguous signup blocks repeated signup until explicit local reset; provider observes create/logout through the same session snapshot. | **Pass** — component regression and `authSession.test.ts`; real GoTrue/network behavior remains **Not run**. |
| Direct routes could request data before identity was known | Create/join session gate does not mount discovery or room requests with empty session. Context/preferences/receipt/lobby use the same gate in their app routes. | **Pass** — direct create/join component guard; full Expo Router integration is not backed by a real live endpoint. |
| Lobby could treat first roster member as current user | Missing or foreign user ID shows an identity/membership error, hides room data/actions, and sends no ready/start writes. | **Pass** — component regression. |
| API returned `401/AUTH_REQUIRED` while repository and Home still exposed the active identity | The rejected response clears the public identity, blocks later repository calls without sending the stale token, ignores in-flight results from the old identity, and shows an explicit recovery action. Recovery explicitly refreshes the session before requests are allowed again; a revoked refresh becomes the existing local-reset state. | **Pass** — `roomRepository.test.ts` with the real `SessionManager` and synthetic API/storage, plus Home recovery-action component test. Live GoTrue/backend behavior remains **Not run**. |

## Acceptance status

| AC | Status | Evidence / limitation |
| --- | --- | --- |
| AC1 Android calls the real API | **Not run** | Automated mocks do not establish Android transport, GoTrue, or deployed RPC behavior. |
| AC2 real mode uses guarded live routes | **Pass (automated) / Not run (Android)** | Provider/session gates and architecture check; no device run. |
| AC3 session, identity, validation, and errors | **Pass (synthetic) / Not run (real auth)** | 116 focused tests plus full mobile check; no backend auth endpoint selected. |
| AC4 multi-client snapshots and ready reset | **Not run (real multi-client)** | Existing conflict/polling UI tests use synthetic API responses. |
| AC5 real eligibility/coverage responses | **Not run (server)** | Mocked empty-pool guard is covered; no live coverage/data assertion. |
| AC6 handoff is reproducible and truthful | **Pass (documentation)** | [HANDOFF.md](HANDOFF.md) separates HTTPS / USB loopback, Metro/backend endpoints, and Not run acceptance. |

No Android device, backend test, or live deployment result is marked Pass here. Do not use this automated evidence to mark GM-25 Done or merge; Trí owns final review and acceptance.
