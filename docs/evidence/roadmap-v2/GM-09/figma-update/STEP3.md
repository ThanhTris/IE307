# GM-09 step 3 — create entry / setup seam

2026-11-01, base `e5f92d2`, owner Tuấn/reviewer Trí. The user authorizes local
step commits, no push. [Current requirements/gaps](REMAINING_GAPS.md).

Product Home now opens `/room/create-entry`. The native entry uses received
Inter/tokens/header/card/button patterns, displays the current guest name and
accepts an optional readonly setup summary/callback from the setup owner. It
does not implement GM-10 controls, request GPS/discovery, invent an anchor,
create a room or change legacy DTOs. Missing dish-only setup is explicitly
unavailable; pending callback locks duplicate navigation/Back, failure retains
the summary and offers retry. Real mode retains the active-session guard.

Received GM-10.1 still requires public location/radius. `/room/create` and its
legacy component/API tests remain as compatibility/QA paths; `/dev/home` still
opens that legacy harness. This is not a second new setup form or proof that
the dish-only host flow is integrated. GM-10 must deliver its updated form and
GM-25 its creation seam before the product entry can enable that callback.

Room layout now enables the existing setup fixture only on `/room/context` and
`/room/preferences`, instead of making hidden legacy discovery/create calls
when entering unrelated room screens. The fixture keeps its existing defaults
for other callers and retains state across those setup routes.

Verification: typecheck, source/tests/scripts ESLint and architecture guard Pass;
focused Jest **4 suites/55 tests Pass** (88.383s), local report
`mobile/.work/gm09-step3-jest.json`. Tests cover unavailable
setup, pending/retry/Back, no location/create/join on entry, product navigation,
and existing GM-10 setup consumers. Android visual/a11y checks remain Not run.
Figma create context was rate-limited; no claim of newly verified frame parity,
Task Done or Trí approval. No API/schema/package or application DB change.
