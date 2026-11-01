# GM-09 step 4 — join preview and confirmation

2026-11-01, follows step 3 `fea0696`. Product mock Home opens
`/room/join-entry`; legacy `/room/join` and its component/API regressions remain
compatible. [Reported input/design gaps](REMAINING_GAPS.md).

New presentation normalizes and validates code/name, explicitly previews a
public-only count/capacity projection, then requires confirmation before join.
It never calls member snapshot before ACK. It rejects mismatched code, invalid
counts/capacity or unknown preview; extra private fields are not rendered or
copied into presentation state. Preview does not reserve a seat: join still
rechecks at the existing repository seam. Caller receives only an ACK receipt.

`JoinRoomPreviewPort` is a UI-only projection boundary, not a change to ApiClient
or wire DTO. The received GM-07.1 client has no previewJoin. Explicit mock
fixtures provide public summary/errors for GM-09 only; a missing live preview
port stays unavailable and never falls back to mock. Capacity20 is a declared UI
fixture, not evidence that the legacy mock/server capacity policy changed.

Pending/accepted/unknown states freeze input and navigation. Unknown retries
reuse the identical frozen payload/request ID; a new explicit intent after a
definite rejection receives a new ID. Changing a warm route code invalidates
confirmation only when safe. Preview cancellation and Back have no mutation;
late responses after unmount do not navigate. QR denied/unavailable/error retain
manual entry; scanned codes only fill input, with no automatic preview/join.
The shared flow frame now avoids the keyboard while preserving scrolling.

Tests cover code errors, full/locked/expired/auth/network, public-field filtering,
malformed projection, request replay/new intent, duplicate lock, warm code,
QR/manual fallback and late response. Route test verifies snapshot first occurs
after explicit join ACK. Initial three-suite run73/73 Pass; final focused rerun
**2 suites/22 tests Pass** (41.586s), local report
`mobile/.work/gm09-step4-recheck-jest.json`. Typecheck, source lint and architecture
Pass. One prior run hit the default5s timeout on the first cold-render test;
the unchanged test passed on rerun, without changing runner/timeouts. Native QR,
Android visual/a11y and real B-preview integration remain Not run/unreceived.
No package, API/schema, database activation, Figma write or approval change.
