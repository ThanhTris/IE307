# GM-11 handoff

- Task / owner / reviewer: GM-11 / Trung / Trí
- Contract: `food-v1/roadmap-v2/GM-11.1`
- Branch / target: `codex/gm-11-14-ui` integrates `main` at `ad393b8`; merge commit `fe29883`.
- Tested revision: `7a46b6d6a71e89e414ab238ce9c23a241b2f0e4a`; `cd mobile; npm run check` passed (16 suites / 477 tests). This includes the PR #120 P2 fix for role switching during a pending write/refetch. Current-main Android bundle was not rerun.
- Review request: [owner comment on GM-11](https://github.com/ThanhTris/IE307/issues/72#issuecomment-6193239256).

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/rooms/screens/LobbyScreen.tsx` | Lobby fixture; host/member identity maps by userId/hostUserId; ready/leave refetch same API adapter | `cd mobile; npm start`; open `/features`, then GM-11 lobby | GM-25 integration |
| `mobile/src/features/rooms/screens/RoomStatusScreen.tsx` | Room status, cancel/leave confirmations, offline/reconnect/error states | same | GM-25 integration |
| `mobile/src/features/shared/components/MockDemo.tsx` | Explicit mock mode selection and mock disclosure shared by demo routes | same | GM-25 integration |
| `mobile/src/app/gm11/lobby.tsx`, `mobile/src/app/gm11/status.tsx`, `mobile/src/app/features.tsx` | Expo Router entry points / feature hub | `npm start`; route `/features` | GM-25 integration |
| `docs/evidence/roadmap-v2/GM-11/CHECKS.md` | Automated assertions, output and remaining device check | read alongside this handoff | Reviewer |

## Status and known limits

Mock-only. Room code/QR are labeled placeholders; invites do not add or ready another person. Host/member selector changes the mock client identity without recreating the client; actions update the repository and the UI reloads its snapshot. During a write and its refetch, role, mock-mode, navigation, and home controls are locked; release is in `finally` so errors cannot leave the screen busy. Context reset/start/cancel controls are host-only by `hostUserId`. Expo Go Android visual/accessibility smoke and fresh merge readiness remain unverified; GitHub Project query was rejected during the latest gate attempt. This handoff does not imply Done/Approved.

## Supplement 2026-11-04 — no-ready lobby and 20-person roster

- Branch: `codex/gm11-figma-update`, based on `origin/main` at `7c22db8`.
- Removed obsolete ready/reset-ready presentation and ready-derived presence; host controls remain host-only and members can leave. Added deterministic 1/2/3/20 mock roster preview, full-roster invite disable, and Android Back confirmation for host cancel/member leave.
- Replaced stale tests that asserted the old `/8` and Ready policy with tests for the current no-ready/20-member behavior. Legacy API/request-ID coverage remains separate.
- Automated verification: `cd mobile; npm run check` — typecheck, lint, 56 suites / 948 tests, and architecture guard passed.
- `FIGMA_PARITY.md` records missing paired Figma/app screenshots and device checks. No lifecycle/API/backend/Android/TalkBack acceptance is claimed. This handoff does not imply Done/Approved.

## Owner review follow-up — mock identity and host/member actions

The mock role selector represents a real identity switch on the same `MockApiClient`. When a room snapshot loads, the preview selects the host by `hostUserId` and synchronizes that identity to the adapter. Switching roles selects by member `userId`; start/context/cancel are host-only, and member leave is applied by the selected adapter identity then checked against a refetched snapshot. The 1/3/20 roster size remains a clearly labeled presentation fixture.

Current product policy has no Ready/reset-ready action, so the old Ready-specific reproduction is superseded; it is not reintroduced as a testable operation. `tests/component/lobbyAndStatusScreens.test.tsx` now verifies host identity, member identity, host-only controls, leave/refetch, no-ready start, and presentation roster sizes. Device/Expo Go visual evidence remains Not run; coordinate that check with Trí before acceptance.
