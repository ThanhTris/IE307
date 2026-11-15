# ADR-028 — Lobby "ready" and avoiding recent winners

- Status: **Accepted by Trí on 2026-11-15 in chat**. PR #167 is explicitly approved as a combined cross-task change; implementation still requires passing verification before merge.
- Runtime: `0055_lobby_ready.sql` (schema 0.31.0), applied to the local QA database only. Replaces the "no ready" rule of ADR-019 for the lobby.

## Decision
1. A member of a room in `LOBBY` is **ready** or **still choosing their taste**. A new member starts not ready; saving
   preferences (`updatePreferences`) or the new command `setReady` makes them ready. The host is always ready.
   `start` answers `MEMBERS_NOT_READY` (409) while a non-host member is not ready. Snapshot members carry `ready`.
2. At `start`, every member whose room preferences have `avoidRecent = true` contributes the winners of their last 3
   personal history entries (consent-based history only). Those dishes go to the end of the draw: a soft preference,
   they are still drawn when the catalogue is short. Without history the draw is unchanged.

## Compatibility clarification — 2026-11-15

Trí explicitly chose the ready gate for **all existing and new rooms still in LOBBY**. This is an intentional change to the active lobby contract, not a fixture-only adjustment. Already-running rounds are not returned to lobby. Legacy behavior must be checked separately; passing updated fixtures alone is not proof of compatibility.

## Evidence
`ADR-028_lobby_ready.test.sql` (5/5), QA e2e `.work/e2e/36-test-ready-avoid.mjs` (ready gate and avoid-recent, all pass),
`31`, `29`, `30`, `35` e2e re-run. Bots (`bot-lib.mjs`) mark themselves ready after joining. Not run: a physical phone.
