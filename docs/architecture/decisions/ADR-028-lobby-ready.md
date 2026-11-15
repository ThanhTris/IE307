# ADR-028 — Lobby "ready" and avoiding recent winners

- Status: **Proposed**, requested by the project owner in chat on 2026-11-14 (to be confirmed by Trí in review).
- Runtime: `0055_lobby_ready.sql` (schema 0.31.0), applied to the local QA database only. Replaces the "no ready" rule of ADR-019 for the lobby.

## Decision
1. A member of a room in `LOBBY` is **ready** or **still choosing their taste**. A new member starts not ready; saving
   preferences (`updatePreferences`) or the new command `setReady` makes them ready. The host is always ready.
   `start` answers `MEMBERS_NOT_READY` (409) while a non-host member is not ready. Snapshot members carry `ready`.
2. At `start`, every member whose room preferences have `avoidRecent = true` contributes the winners of their last 3
   personal history entries (consent-based history only). Those dishes go to the end of the draw: a soft preference,
   they are still drawn when the catalogue is short. Without history the draw is unchanged.

## Evidence
`ADR-028_lobby_ready.test.sql` (5/5), QA e2e `.work/e2e/36-test-ready-avoid.mjs` (ready gate and avoid-recent, all pass),
`31`, `29`, `30`, `35` e2e re-run. Bots (`bot-lib.mjs`) mark themselves ready after joining. Not run: a physical phone.
