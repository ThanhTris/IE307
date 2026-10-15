# GM-11 handoff

- Task / owner / reviewer: GM-11 / Trung / Trí
- Contract: `food-v1/roadmap-v2/GM-11.1`
- Branch / target: `codex/gm-11-14-ui` integrates `main` at `ad393b8`; merge commit `fe29883`.
- Tested integrated revision: `fe29883`; `cd mobile; npm run check` passed (16 suites / 476 tests). Current-main Android bundle was not rerun.
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

Mock-only. Room code/QR are labeled placeholders; invites do not add or ready another person. Host/member selector changes the mock client identity without recreating the client; actions update the repository and the UI reloads its snapshot. Context reset/start/cancel controls are host-only by `hostUserId`. Expo Go Android visual/accessibility smoke and fresh merge readiness remain unverified; GitHub Project query was rejected during the latest gate attempt. This handoff does not imply Done/Approved.
