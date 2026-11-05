## Summary & Context

This PR implements the Figma UI requirements and integration updates for **Task GM-26** ([Issue #87](https://github.com/ThanhTris/IE307/issues/87)), delivering the complete UI flow and service layer for voting ballot submission (Round 1 & Round 2), 60-second waiting state countdown, strict host quorum early finalization, Round 2 survivor candidate pool with Cap 30% elimination limit, and support for the $N=1$ single survivor candidate edge case.

Reference: Figma file `3Ysh0mOAEkAgA5DgZPSC1j`, revision `ui-figma-final/2026-10-25/GM-26.2`.
Contract: `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Reviewer: @ThanhTris

---

## Key Changes

1. **5 Figma Nodes Parity**:
   - `330:3071` [07 · Vòng 1 / Chọn món / Gửi phiếu]: Flashcard and list voting with WANT / OK / NO. Submit button disabled until 100% of pool dishes are rated. Creates durable intent and locks interaction upon server ACK.
   - `330:3072` [08 · Chờ vòng 1 / Chốt ngay / Rời phòng]: Waiting state with 60s countdown timer starting upon the first acknowledged ballot. Host-only "Chốt ngay · Kết thúc chờ sớm" button strictly gated by quorum $A_r > M/2$ ($\iff A_r \ge \lfloor M/2 \rfloor + 1$). Safe leave room action.
   - `330:3073` [09 · Vòng 2 / Pool còn lại / Giới hạn loại]: Survivor candidates ($N \ge 1$) excluding any dish marked NO by any member. Cap 30% elimination rule ($\text{cap} = \max(1, \lfloor 0.30 \times N \rfloor)$). Automatic disabling of Remove buttons when at cap; "Chọn giữ tất cả" reset; confirmation SheetDialog before final submission.
   - `330:3074` [10 · Chờ vòng 2 / Xác nhận / Gửi lỗi / Kết nối lại]: Round 2 waiting room, retry handling with preserved choices on network failure, host finalize upon quorum, and clean progression to result screen.
   - `638:9369` [Vòng 2 — Còn 1 món · Đã loại]: Support for $N=1$ single survivor with $\text{cap}=1$. Allows user to KEEP or REMOVE. Displays ALL_REMOVED warning dialog when all items are removed, and concludes session with `NO_CONSENSUS / ALL_REMOVED` if all members remove it.

2. **Vote Repository Service (`mobile/src/features/voting/services/voteRepository.ts`)**:
   - Implemented `LiveVoteRepository` calling canonical Supabase RPC `dish_session` v4 with contract `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
   - Durable request ID generator matching `^[A-Za-z0-9_-]{1,128}$`.
   - Stable idempotency caching preventing duplicate submissions across retries.
   - Client and server error mapping: `REMOVE_LIMIT` (409), `NOT_HOST` (403), `NOT_READY` (409), `VOTE_CLOSED` (409).
   - Provided `MockVoteRepository` for isolated component unit testing.

3. **Route Integration**:
   - `mobile/src/app/room/vote.tsx`: Wired `VoteScreen` with `createLiveVoteRepository(api)` in real mode.
   - `mobile/src/app/room/final-round.tsx`: Wired `FinalRoundScreen` with `createLiveVoteRepository(api)` in real mode.
   - Updated hooks `useRoundOneVoting` and `useRoundTwoVoting` to accept optional `VoteRepository`.

4. **Contract & Type Updates**:
   - Added `'REMOVE_LIMIT'` to `ErrorCode` in `common.ts` and error localized copy in `roomEntry.ts`.
   - Added `'WAITING_1' | 'WAITING_2'` to `RoomState` in `rooms.ts` and updated `isRoomState` response guard in `responseGuards.ts`.

5. **PR #156 Review Fixes (F1–F7)**:
   - **F1 (Wire format)**: Strictly maps ballots to `{ roundDishId, choice }` on the wire without legacy `vote` property or extraneous fields.
   - **F2 (Dynamic snapshot)**: Eliminates hardcoded fixtures in real mode; dynamically loads room snapshot, pool, versions, and caller host status via `getSnapshot` with loading/error state and hides QA scenario pickers.
   - **F3 (Waiting synchronization)**: Synchronizes 60s countdown with server `deadline` and `serverTime`; polls snapshot every 2.5s during waiting to detect other member submissions.
   - **F4 (Waiting error isolation)**: Isolates post-ACK `enterWaiting` errors without destroying ballot submission state, offering a dedicated `handleRetryWaiting` button.
   - **F5 (Real outcome navigation)**: Navigates dynamically to real terminal outcomes (`DECIDED`, `NO_CONSENSUS` / `EMPTY_INTERSECTION` / `ALL_REMOVED`) without hardcoding consensus fixtures.
   - **F6 (Durable IDs across retries)**: Reuses `activeRequestId` across retries; rejects reused request IDs that carry mismatched payloads with `REQUEST_ID_REUSED`.
   - **F7 (Strict envelope guards)**: Added strict canonical response guards on all RPC envelopes (`submitAck`, `waitingAck`, `finalizeAck`, `snapshot`); rejects malformed envelopes with `MALFORMED_RESPONSE`.

---

## Verification & Test Results

- `npm run typecheck`: **Pass** (0 TypeScript errors under strict mode).
- `npm run check:architecture`: **Pass** (clean boundaries).
- Focused GM-26 test suites: **Pass** (53/53 tests across 3 suites):
  - `tests/unit/voteRepository.test.ts`: 23/23 pass (including wire format, F6 mismatch rejection, F7 envelope guards).
  - `tests/component/gm26FigmaParity.test.tsx`: 7/7 pass.
  - `tests/component/votingScreens.test.tsx`: 23/23 pass.
- Repository validation (`validate_repository.py` & `task_readiness.py --check-docs`): **Pass**.
- `git diff --check`: **Pass** (clean whitespace, no conflict markers).

---

## Evidence & Limits

- Detailed parity report: [FIGMA_PARITY.md](FIGMA_PARITY.md)
- Output checks: [CHECKS.md](CHECKS.md)
- Handoff & 2-device acceptance scenario: [HANDOFF.md](HANDOFF.md)

*Note per AIDD guidelines*: Physical Android device execution and remote live backend staging verification remain **Not run** pending Trí's (`ThanhTris`) review.
