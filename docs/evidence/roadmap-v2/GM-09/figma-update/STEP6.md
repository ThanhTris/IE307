# GM-09 step 6 — flow review and accessibility hardening

2026-11-01, follows tutorial `1b86133`. No new API/schema/package/native module.

- Product mock entry uses the new create/join screens. Real mode continues to
  use the received GM-07.1 create/join routes until GM-10/07/25 deliver dish-only
  setup/public preview adapters; routing it into an unsupported new port would
  regress existing integration. Separate real-route tests pin this boundary.
- Legacy CreateRoomScreen/JoinRoomScreen/receipt routes still have live, QA and
  regression consumers. They were not deleted or treated as new Figma flow.
  No obsolete API/domain/migration or regression test was removed to get green.
- Setup mock fixture is never initialized in real mode and is lazy on unrelated
  room routes. Its context/preferences consumers retain their fixture state.
- New join Back can cancel a pending read/scan safely; write/unknown/accepted
  intents stay locked. Ref guards cover immediate write/navigation races and
  code/name edits cannot replace a frozen request. This avoids trapping a user
  in the intentionally pending read fixture while preserving unknown replay.
- Flow Back now exposes disabled state during a write/reset. New title/tab
  labels opt into wrapping instead of ellipsis for large text; existing shared
  component defaults remain unchanged. Validation uses readable foreground plus
  alert semantics. Real legacy frames no longer display mock labels; their
  unknown/accepted navigation remains locked. Mock labels stay explicit.

Final automated validation:

| Check | Result |
| --- | --- |
| Full Jest, host, unchanged runner/timeouts | **36 suites/795 tests Pass**, 114.496s; local `.work/gm09-step6-full-jest.json` under mobile |
| TypeScript / source-tests-scripts ESLint / architecture | Pass, no scoped lint warnings/errors |
| Expo installed compatibility | Pass, tool reports offline validation limitation |
| Android export | Pass; Hermes `entry-f5fadfbd9e28e8da6c9622a08bbbd971.hbc`, 3.5MB |
| Full `npm run lint` | Fail only in ignored local `mobile/.work/gm10Audit.test.tsx`: four stale internal/old-route imports; left untouched and not committed |
| Native visual / font200 / TalkBack / physical gesture / keyboard / Back / Dark | Not run; no ADB in PATH or configured/standard host SDK location |

The source/test suite is green, not the entire local `npm run check` pipeline.
Export/JS tests do not prove native UI acceptance. The final handoff also records
Python's pre-existing Windows symlink privilege limitation. User-authorized
local commits do not imply Trí approval, Project Done, live B rollout or push.
