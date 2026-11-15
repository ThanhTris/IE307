# ADR-027 — Rejoining a room during round 1

- Status: **Accepted by Trí on 2026-11-15 in chat**. PR #167 is explicitly approved as a combined cross-task change; implementation still requires passing verification before merge.
- Runtime: `0054_room_rejoin_round_one.sql` (schema 0.30.0), applied to the local QA database only.

## Context
A member whose connection dropped could not get back: joining with the room code answered `ROOM_LOCKED` for every state
except the lobby, even for someone already in the room, and Home never showed the saved room. The result was still
announced to that person.

## Decision
1. An **active member** of a room in `ROUND_1` / `WAITING_1` (not expired) gets the usual join receipt back from `join`
   and `previewJoin` reports `joinable: true`. Nothing is added or changed (roster, preferences, ballots).
2. From `ROUND_2` on, and for anyone who is not a member, the answer stays `ROOM_LOCKED`.
3. The app remembers the last room id per account (SecureStore) and offers "Quay lại phòng" on Home, on the join screen
   and on the continue screen while the room is in the lobby or round 1. In round 2 it only says the room can no longer
   be entered; the person still receives the result.

## Evidence
`ADR-027_room_rejoin.test.sql` (4/4), QA e2e `.work/e2e/35-test-rejoin.mjs` (10/10; the stranger check is skipped when no
third test account exists), Jest `lastRoomStore.test.ts`. Not run: a physical phone, SQL/domain parity CI.
