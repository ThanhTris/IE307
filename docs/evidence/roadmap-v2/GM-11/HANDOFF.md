# GM-11 handoff

- Task / owner / reviewer: GM-11 / Trung / Trí
- Contract: `food-v1/roadmap-v2/GM-11.1`
- Branch / base: `codex/gm-11-14-ui` / `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`
- Implementation commit: `41eb135`. Evidence-only follow-up changes do not alter the checked mobile source; rerun checks if source changes.

## Artifacts and use

| Artifact | Purpose / route | Run command | Next task |
| --- | --- | --- | --- |
| `mobile/src/features/rooms/screens/LobbyScreen.tsx` | Lobby fixture, explicit ready, host/member controls, reset-ready scenario | `cd mobile; npm start`; open `/features`, then GM-11 lobby | GM-25 integration |
| `mobile/src/features/rooms/screens/RoomStatusScreen.tsx` | Room status, cancel/leave confirmations, offline/reconnect/error states | same | GM-25 integration |
| `mobile/src/features/shared/components/MockDemo.tsx` | Explicit mock mode selection and mock disclosure shared by demo routes | same | GM-25 integration |
| `mobile/src/app/gm11/lobby.tsx`, `mobile/src/app/gm11/status.tsx`, `mobile/src/app/features.tsx` | Expo Router entry points / feature hub | `npm start`; route `/features` | GM-25 integration |
| `docs/evidence/roadmap-v2/GM-11/CHECKS.md` | Automated assertions, output and remaining device check | read alongside this handoff | Reviewer |

## Status and known limits

Mock-only. Room code/QR are labeled placeholders; invites do not add or ready another person. Ready/start/reset are local fixture state. No server state or API fallback exists. Automated checks pass as recorded; Expo Go Android visual smoke is Not run and is required for task acceptance. Do not infer Done/Approved from these files.
