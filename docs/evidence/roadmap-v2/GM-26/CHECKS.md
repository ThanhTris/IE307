# Output checks — GM-26 / roadmap-v2

Status: Automated regressions, 5 Figma nodes parity, vote repository RPCs, full mobile test suite (62 suites / 1,059 tests), and PR #156 review fixes (Round 1: F1–F7; Round 2: R1–R8) pass on branch `issue87_figma_ui_gm26`; physical Android device acceptance and remote backend staging verification remain pending.
Task: GM-26 — UI–API ballot, waiting và vòng hai
Owner: Trang (`rosy179`), Reviewer: Trí (`ThanhTris`)
PR / branch: Issue #87 / `issue87_figma_ui_gm26`
Base: `origin/main` `c5b2b07` (post GM-25 PR #155)
Tested source: local branch `issue87_figma_ui_gm26` based on `origin/main`; full UI parity across 5 Figma nodes (`330:3071`, `330:3072`, `330:3073`, `330:3074`, `638:9369`), LiveVoteRepository v4 dispatch (`dish-session-v4/roadmap-v2/GM-07.B-supplement`), Cap 30% elimination enforcement (`max(1, floor(0.30 * N))`), Quorum waiting early termination (`A_r > M/2`), stable idempotency with durable request ID, N=1 candidate support with ALL_REMOVED outcome, and PR #156 review feedback addressing:
- **Round 1 (F1–F7)**: Wire format, dynamic snapshot loading, synchronized countdown, error isolation, real outcome navigation, durable IDs with mismatch rejection, strict envelope guards.
- **Round 2 (R1–R8)**: No render fetch loop (R1), unsubmitted members unlocked in WAITING_1/2 (R2), truthful snapshot mapping without fake prices or fake restaurant names (R3), terminal states prior to round numbers (R4), single-route outcome navigation without result collision (R5), server clock skew calibration for countdown (R6), in-flight intent reuse across retries (R7), and 0 ESLint errors/warnings without disabling rules (R8).
Contract: `ui-figma-final/2026-10-25/GM-26.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`; Expo SDK `57.0.30`; Node/npm from the Expo baseline.

## Reproduce

From `mobile/`:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run test:expo-baseline
npm test -- tests/unit/voteRepository.test.ts tests/component/gm26FigmaParity.test.tsx tests/component/votingScreens.test.tsx
npm run typecheck
npm run lint
npm run check:architecture
npm test
```

From the repository root:

```powershell
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

## Results on this local revision

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | **Pass** | Installed 1,391 locked packages from `mobile/package-lock.json`. No manifest or lockfile changes. |
| `npm run check:expo` | **Pass with environment note** | Expo SDK `57.0.30`; installed dependencies match the lockfile. |
| `npm run test:expo-baseline` | **Pass** | 5/5 baseline tests pass. |
| Focused GM-26 regression & parity suites | **Pass** | 3 suites / 61 tests passing (`voteRepository.test.ts` [25 tests], `gm26FigmaParity.test.tsx` [7 tests], `votingScreens.test.tsx` [29 tests]). Covers all F1–F7 and R1–R8 review audit cases. |
| `npm run typecheck` | **Pass** | 0 TypeScript errors under strict mode (`tsc --noEmit`). |
| `npm run lint` | **Pass** | 0 ESLint errors, 0 warnings across the entire repository (`eslint .`). No `eslint-disable` workarounds. |
| `npm test` (full mobile test suite) | **Pass** | 62 suites / 1,059 tests passing across all features and routes. |
| `npm run check:architecture` | **Pass** | Clean architectural boundaries; no layer violations (`check-architecture.mjs`). |
| `python scripts/validate_repository.py` | **Pass** | Documents, links, JSON, task manifest, dependencies and current FR traceability OK. |
| `python scripts/task_readiness.py --check-docs` | **Pass** | Task indexes match task metadata. |
| `git diff --check` | **Pass** | Clean diff with no whitespace errors, trailing spaces, or conflict markers. |
| Android + backend integration | **Not run** | Android SDK `adb devices -l` returned an empty device list. Remote backend live staging verification pending Trí's review. |

## Review Comment Resolution Matrix (PR #156 Round 2: R1–R8)

| Item | Problem Statement | Resolution in Code | Verification Evidence |
| --- | --- | --- | --- |
| **R1 (P1)** | Snapshot fetch re-rendered on every loop due to inline callback recreation | Callbacks stored in stable refs (`onRoundTwoRef`, `onFinishRef`, etc.) updated via `useEffect`. `VoteScreen` forwards `onRoundTwo: onGoToFinalRound` directly without inline wrapper. | `votingScreens.test.tsx` ("R1: VoteScreen snapshot fetch does not loop on render; exactly 1 fetch on mount, 0 on card actions") |
| **R2 (P1)** | Members who had not submitted were marked ACK and locked in WAITING_1/WAITING_2 because empty array `ownBallot = []` was treated as truthy | Separated room waiting from caller ACK: caller is only ACKed if `snap.ownWaiting || hasCompleteBallot` (where `hasCompleteBallot` requires non-empty array matching pool length). Unsubmitted members remain in `idle` and unlocked. | `votingScreens.test.tsx` ("R2: Member who has not submitted remains in idle state and unlocked when room is in WAITING_1 with empty ownBallot") |
| **R3 (P1)** | `mapSnapshotPoolToPoolDishes` fabricated 50k–70k price ranges, assigned `sourceRef` as restaurant name, defaulted meal slots, and stripped artwork attribution | Clean truthful projection: missing/null prices stay `undefined` and are hidden in cards; `venueName` is only rendered if genuine; artwork `attribution`, `license`, and `usageRights` are preserved. | `voteRepository.test.ts` ("mapSnapshotPoolToPoolDishes adapter (R3 truthfulness)") |
| **R4 (P1)** | Round 1 hook checked `state === 'ROUND_2'` before terminal states (`DECIDED`, `NO_CONSENSUS`), misinterpreting terminal outcomes of R2 on reconnect | Reordered state checks in `applySnapshot`: terminal states (`DECIDED`, `NO_CONSENSUS`) are evaluated first. If room is finished, client transitions directly to result screen without opening Round 2. | `votingScreens.test.tsx` ("R4: Terminal state DECIDED transitions directly to onGoToResult without calling onRoundTwo") |
| **R5 (P1)** | Outcome navigation collision: hook called both `onGoToNoConsensus` and `onFinish`, while `final-round.tsx` routed `onFinish` unconditionally to `/room/result` | In `useRoundTwoVoting`, navigation is strictly mutual: calls `onGoToNoConsensus` OR `onGoToResult`, falling back to `onFinish` only if specific handler is missing. Guarded with `navigatedOutcomeRef`. `final-round.tsx` safely checks `isNoConsensus` before fallback. | `votingScreens.test.tsx` ("R5: Round 2 NO_CONSENSUS navigates to onGoToNoConsensus without duplicate onFinish routing to result") |
| **R6 (P2)** | Countdown used local `Date.now()` without server time offset calibration; failed when client clock was fast or slow | Calibrated server clock offset `clockSkewRef.current = new Date(snap.serverTime).getTime() - Date.now()`. Countdown computes `remaining = (deadline - (Date.now() + clockSkew)) / 1000`. | `votingScreens.test.tsx` ("R6: Server clock skew calibration computes accurate countdown regardless of client time") |
| **R7 (P2)** | Retry reconstructed expected versions and votes from changing component state instead of preserving the exact in-flight intent | Introduced `inFlightIntentRef` storing exact payload, versions, and durable `requestId` + `intentId`. Submissions reuse this in-flight intent until server ACK, ensuring idempotency and version alignment across retries. | `votingScreens.test.tsx` ("R7: Retry preserves in-flight intent, requestId, and expectedVersion across failures") |
| **R8 (P2)** | ESLint failed with 4 errors (`react-hooks/set-state-in-effect`) and 16 warnings | Derived `canHostEarlyFinish` dynamically from state without `useEffect`. Ref assignments moved to `useEffect` per React 19 `react-hooks/refs`. Unused imports removed. 0 errors, 0 warnings. | `npm run lint` exited code 0 with 0 errors and 0 warnings. |

## Figma Parity and Behavioral Mapping

| Figma Node / Scope | Expected Behavior | Implementation & Route | Result |
| --- | --- | --- | --- |
| `330:3071` [07 · Vòng 1 / Chọn món / Gửi phiếu] | Flashcard & danh sách chọn món R1 (WANT/OK/NO). Nút "Gửi phiếu" bị vô hiệu hóa cho đến khi chọn đủ 100% món. Gửi ballot tạo intent bền vững, vào trạng thái pending, khóa tương tác khi nhận ACK. | `VoteScreen.tsx` trên `/room/vote` + `useRoundOneVoting` + `LiveVoteRepository.submitBallot` | **Pass** (`gm26FigmaParity.test.tsx`, `voteRepository.test.ts`) |
| `330:3072` [08 · Chờ vòng 1 / Chốt ngay / Rời phòng] | Trạng thái phòng chờ kết quả sau khi nộp phiếu R1. Hiển thị đếm ngược 60s (bắt đầu từ người đầu tiên vào waiting hợp lệ). Nút "Chốt ngay · Kết thúc chờ sớm" chỉ hiển thị cho Host và chỉ kích hoạt khi đạt quorum `A_r > M/2` (nghiêm ngặt quá nửa roster khóa). Nút rời phòng an toàn. | `VoteScreen.tsx` (waiting modal / section) + `useRoundOneVoting` + `LiveVoteRepository.finalize` | **Pass** (`gm26FigmaParity.test.tsx`, `voteRepository.test.ts`) |
| `330:3073` [09 · Vòng 2 / Pool còn lại / Giới hạn loại] | Hiển thị danh sách ứng viên sống sót $N \ge 1$ (loại trừ các món bị bất kỳ thành viên nào vote NO ở R1). Áp dụng giới hạn loại Cap 30%: $\text{cap} = \max(1, \lfloor 0.30 \times N \rfloor)$. Nút Loại bị khóa khi chạm trần cap; nút "Chọn giữ tất cả" đặt lại toàn bộ. Xác nhận nộp phiếu qua dialog cảnh báo trước khi chốt. | `FinalRoundScreen.tsx` trên `/room/final-round` + `useRoundTwoVoting` + `CandidateKeepRemoveCard.tsx` | **Pass** (`gm26FigmaParity.test.tsx`, `votingScreens.test.tsx`) |
| `330:3074` [10 · Chờ vòng 2 / Xác nhận / Gửi lỗi / Kết nối lại] | Trạng thái phòng chờ R2 và xử lý lỗi / mất mạng / timeout. Cung cấp nút "Thử lại nộp phiếu Vòng 2" giữ nguyên lựa chọn (idempotent request ID bền vững). Host có thể chốt sớm khi đủ quorum `A_r > M/2`. Chuyển sang kết quả hoặc màn kết thúc theo snapshot server. | `FinalRoundScreen.tsx` + `useRoundTwoVoting` + `LiveVoteRepository.enterWaiting` / `finalize` | **Pass** (`gm26FigmaParity.test.tsx`, `voteRepository.test.ts`) |
| `638:9369` [Vòng 2 — Còn 1 món · Đã loại] | Hỗ trợ $N=1$ món duy nhất với trần loại $\text{cap}=1$. Cho phép người dùng chuyển trạng thái sang "✕ ĐÃ LOẠI" và nộp phiếu. Nếu tất cả thành viên loại hết, kết thúc phiên với trạng thái `NO_CONSENSUS / ALL_REMOVED` theo đúng ADR-019 và v4 policy. | `FinalRoundScreen.tsx` + `CandidateKeepRemoveCard.tsx` + `FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT` | **Pass** (`gm26FigmaParity.test.tsx`, `votingScreens.test.tsx`) |

## Acceptance status

| AC | Status | Evidence / limitation |
| --- | --- | --- |
| AC1 Android calls the real API | **Not run** | Automated mocks do not establish Android transport, GoTrue, or deployed RPC behavior. |
| AC2 real mode uses guarded live routes | **Pass (automated) / Not run (Android)** | Live routes `/room/vote` and `/room/final-round` inject `LiveVoteRepository` connected to Supabase RPC `dish_session` v4; physical device run pending. |
| AC3 session, identity, validation, and errors | **Pass (synthetic) / Not run (real auth)** | 25 unit tests in `voteRepository.test.ts` and 7 parity tests pass; durable request ID, stable idempotency cache, `REMOVE_LIMIT` (409), in-flight intent retry, and quorum enforcement verified. |
| AC4 multi-client snapshots and waiting countdown | **Pass (contract & UI) / Not run (multi-client thật)** | 60s countdown begins only on valid waiting entry; clock skew calibration applied; host early finalize strictly requires $A_r > M/2$; reconnect does not alter roster count or extend deadline. |
| AC5 Cap 30% and N=1 candidate support | **Pass (synthetic contract) / Not run (server thật)** | Cap formula $\max(1, \lfloor 0.30 \times N \rfloor)$ enforced client-side and server-side; $N=1$ allows KEEP or REMOVE; zero survivors ends with `EMPTY_INTERSECTION` / `ALL_REMOVED`. |
| AC6 handoff is reproducible and truthful | **Pass (documentation)** | [HANDOFF.md](HANDOFF.md) and [FIGMA_PARITY.md](FIGMA_PARITY.md) provide comprehensive reproducible guidelines, state boundaries, and 2-device testing scenarios. |

No Android device, backend test, or live deployment result is marked Pass here. Do not use this automated evidence to mark GM-26 Done or merge; Trí owns final review and acceptance.
