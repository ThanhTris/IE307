# GM-09 step 5 — isolated tutorial

2026-11-01, follows step 4 `fde3757`. Tutorial `/tutorial` has its own sample
state: create/setup demonstration, NO (left), OK (right), WANT (double tap),
undo-before-submit, completion, skip, Back and replay. Every gesture has a shared
button alternative. Wrong practice choices do not advance the required lesson.

Only the local tutorial vote changes. No repository/client instance is created
or passed; the card uses an existing mock dish name, omits price/image claims,
and labels itself as a sample. No create/join/start/submit/finalize, active room,
draft, outbox or real ballot is changed. Native PanResponder handles horizontal
swipes; double tap uses native timestamps when provided. Undo is local only.

First-use mock routing is in-memory: after guest entry, unseen tutorial can be
skipped to Home. This is not durable onboarding/account storage (GM-31). Existing
real session/auth restoration is untouched. Home → Cá nhân → Xem lại hướng dẫn
provides replay without changing the active room. Marking the UI flag preserves
all other preview state. App restart resets it; no new storage is installed.

Received full T01 context/screenshot `368:16838` before Starter quota was reached:
[Figma reference](figma-tutorial-first.png). Other tutorial frames remain
unverified. Under the user's Figma-as-reference instruction, shared cards,
buttons, banner, fonts and coach-style sections are reused in a scrolling layout
instead of hardcoded screen-coordinate spotlights; decorative pointer artwork
is not used. Six lesson progress, Back, skip and replay are reported additions
needed by GM-09. Shared TutorialGesture's two-theme gallery is unsuitable as an
interactive lesson; existing DishCard/AppButton supply the actual interactions.

Initial targeted route/tutorial regression: **4 suites/32 tests Pass**, 66.519s.
Final typecheck/source lint Pass; focused tutorial/route run on the host:
**2 suites/4 tests Pass**, with unchanged5s limits and configuration (local
`mobile/.work/gm09-step5-host-jest.json`). Sandbox cold rendering exceeded5s
on the first test; splitting independent choice/completion tests retained
coverage but still reproduced cold timeout. Running the same tests on the host
passed without weakening assertions/timeouts. Tests assert correct choice gates, timestamped double tap, undo,
skip/Back/replay, no room mutations and active-room/name preservation. Android
visual, physical swipe, font200 and TalkBack remain Not run; no visual/Task
approval is claimed. No package/native/API/schema or Figma write.
