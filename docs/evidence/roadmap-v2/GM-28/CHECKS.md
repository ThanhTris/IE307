# GM-28 — Checks

## Run record

- Date: 2026-10-18 (Asia/Bangkok).
- Base commit: `8cf8084a021d56fae261da34503ed5a7a45681bd`.
- Task contract: `food-v1/roadmap-v2/GM-28.1`.
- Schema/API source: `mobile/src/data/api/contracts.ts`, `mobile/src/data/api/client.ts`; upstream GM-21/22/23/25 integration must be reverified on target before merge.
- Dataset: N/A for local unit checks; no live dataset was used.
- Build/device: local Windows checkout; no Android device/build evidence. `adb` is unavailable in PATH.

## Assertions

| Check | Result | Input/command | Expected | Actual |
|---|---|---|---|---|
| GM-28 repository adapters | Pass | `cd mobile; npm test -- --runInBand tests/unit/gm28Repositories.test.ts` | Social calls delegate with request IDs; inbox dedupes events and uses inbox-row cursor; room accept sends invitation ID; history cache is user-scoped and cleared | `mobile/tests/unit/gm28Repositories.test.ts` passed during `npm run check` |
| Mobile typecheck | Pass | `cd mobile; npm run typecheck` (via `npm run check`) | TypeScript strict check succeeds | Passed |
| Mobile lint | Pass with existing warnings | `cd mobile; npm run lint` (via `npm run check`) | No lint errors | No errors; warnings remain in existing `data/api/contracts.ts` and `data/api/index.ts` |
| Mobile full test suite | Pass | `cd mobile; npm run check` | All Jest tests and architecture check pass | Typecheck passed; lint had 0 errors (4 pre-existing warnings); 24 suites / 656 tests passed; architecture boundaries OK |
| Repository validator | Pass | `python scripts/validate_repository.py` | Documentation, links, JSON, task manifest and dependency metadata validate | Passed; validator explicitly does not check native/backend execution or human approval |
| Repository regression tests | Pass | `python -m unittest discover -s tests -p "test_*.py"` | Python repository suite passes | 550 tests passed |
| Task docs index | Pass | `python scripts/task_readiness.py --check-docs` | Generated task indexes match metadata | Passed |
| Diff whitespace | Pass | `git diff --check` | No whitespace errors | Passed |
| Real Supabase/API, two identities and server-side state | Not run | Requires configured test backend/accounts and cleanup approval | Invite/accept/reject/unfriend, expiry/outsider/session loss, inbox refetch/dedup, history consent/delete/group ACL/network | No API endpoint or credentials were supplied/used |
| Android calling API | Not run | Requires reachable test endpoint and Android device/development build | Verify endpoint/auth/network/lifecycle and server state against matrix | `adb` is not installed/available; no device assertion |
| Expo mock isolation/navigation | Not run on device | Expo Android launch and route interaction | No mock fallback in real-mode errors; mock direct route explains unavailable integration | Code path is implemented; device behavior not evidenced |

## Evidence boundaries

Unit tests and local type/lint checks prove adapter behavior only. They do not prove API deployment, SQL/RLS behavior, Android navigation, or GM-21/22/23 production integration. No secret, token, vote, GPS, or personal data was recorded. Replace any `Running` entry with the actual final command result before review.
