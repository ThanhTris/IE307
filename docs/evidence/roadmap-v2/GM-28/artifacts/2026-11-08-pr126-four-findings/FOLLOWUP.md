# PR #126 four review findings follow-up

Date: 2026-11-08
Task: GM-28
Branch: codex/gm-28-social-inbox-history
Base revision: 95eb87a052d9f92e14e4db23cce591a2f986ec3c
Source status: local, uncommitted changes

## Findings

| Finding | Change | Expected | Actual | Status |
|---|---|---|---|---|
| Legacy result notification called canonical snapshot and received 409 CONTRACT_MISMATCH | Inbox metadata with only roomId/resultId now uses the authenticated legacy get_room_snapshot API and opens a read-only legacy result route. Canonical five-field metadata still uses dish_session(snapshot); unsupported canonical versions fail closed. | A legacy decision-v2 result opens through its pinned legacy snapshot contract; canonical results remain on GM-07.B. | Unit test verified get_room_snapshot was called and the canonical repository snapshot was not. Component test verified navigation to /inbox-result with the same room/result IDs. Canonical transport regression still asserts dish_session(snapshot). | Code, unit and component checks Pass. Live API request on AVD Not run. |
| Bottom navigation clipped labels at narrow widths and 200% font | Navigation items stretch evenly and label text wraps within each tab. | Four tabs remain visible and labeled at 320dp/360dp with 200% font. | Friends was inspected at 320dp and 360dp; History at 320dp. Four tab labels remain visible and content scrolls independently. | AVD visual Pass for the navigation check. |
| TalkBack traversal and activation evidence incomplete | No code change was needed for this finding; the interaction was checked on AVD. | Focus reaches named controls and keyboard activation works without triggering an unintended mutation. | TalkBack focus moved through brand, notifications and Add Friend. Enter opened the Add Friend dialog; no invitation was sent. Full spoken-utterance transcript and exhaustive route traversal were not captured. | Partial; full TalkBack acceptance remains Not run. |
| Figma captures used mismatched data states | Added development-only route /dev/gm28-parity with fixed sample repositories using the real Friends, Inbox and History screens. The route redirects away outside development. | Compare equivalent examples: 2 friends + 1 invite; 2 current inbox invitations + prior result states; 2 decided history rows + 1 no-consensus row. | AVD screenshots show these states at 412dp. The route performs no API calls and fixture actions return NOT_READY. | Semantic data-state alignment Pass. Full visual parity remains Partial. |

## AVD evidence

- Device: Android Studio AVD Medium_Phone_API_37.0, Android 17 / API 37, Expo Go 58.0.5.
- Density: 420 dpi. Reference screenshots: 1080×2400 pixels, approximately 412dp, font scale 1.0.
- Navigation stress screenshots: 320dp and 360dp, font scale 2.0.
- TalkBack was enabled for the focus/activation observation, then disabled. Final emulator configuration was restored to size 1080×2400, density 420, font scale 1.0; the AVD is left displaying the Friends fixture.
- [Friends at 412dp](gm28-friends-figma-fixture-412dp-100pct.png)
- [Inbox at 412dp](gm28-inbox-figma-fixture-412dp-100pct.png)
- [History at 412dp](gm28-history-figma-fixture-412dp-100pct.png)
- [Friends at 360dp / 200%](gm28-friends-360dp-200pct.png)
- [Friends at 320dp / 200%](gm28-friends-320dp-200pct.png)
- [History at 320dp / 200%](gm28-history-320dp-200pct.png)
- [TalkBack Add Friend focus](gm28-talkback-add-friend-320dp-200pct.png)
- [Final restored AVD screen](gm28-restored-412dp-100pct.png)

## API boundary

An owned disposable backend QA runtime passed qa:verify against schema 0.9.2 / GM-07.B and was stopped with its QA resources cleaned up. The AVD did not send a live JWT-authenticated legacy result request during this follow-up. The inbox/historical result finding is verified at unit/component and client transport boundaries, not as a live backend round trip. The Figma comparison route uses fixtures only.

## Automated verification

| Command | Result |
|---|---|
| cd mobile; npm run check | Pass: TypeScript; ESLint with no errors and 4 existing warnings; 72 Jest suites / 1,363 tests; architecture check |
| cd mobile; npm run check:expo | Pass: Expo 58.0.23 dependency versions match lockfile; bundled dependency validation says up to date. Tool warns online validation is unreliable offline. |
| cd mobile; npm run bundle:android | Pass: Android export, 1,722 entry modules |
| python -m unittest discover -s tests -p "test_*.py" | Pass: 664 tests, 2 skipped |
| python scripts/validate_repository.py | Pass |
| python scripts/task_readiness.py --check-docs | Pass |
| git diff --check | Pass; only LF-to-CRLF working-copy notices |

## Remaining limits

- No live AVD-to-API legacy result open was performed; the backend response is not represented by the fixture route.
- TalkBack speech transcript and exhaustive traversal remain Not run.
- Visual parity remains Partial: the Figma data states are aligned, but some component/layout details differ and no pixel-diff was run.
- Evidence is from Expo Go on an Android emulator. It is not physical-device or native-development-build evidence.
- No commit, push, PR update, merge, Project update, or task-status change was made.

## Post-push readiness follow-up — 2026-11-08

- The readiness gate first identified that the short mock invitation labels changed GM-14's InboxScreen artifact. That mock-only change was restored to the upstream content. The live Inbox continues to show the short “Chấp nhận” and “Từ chối” labels requested by the owner.
- The relevant component suite then passed 13/13; TypeScript and ESLint passed.
- Readiness returned READY_FOR_MERGE_REVIEW against origin/main 8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb after the GM-14 artifact was restored.
- GitHub CI on the first pushed revision b19ad9e passed all 19 checks after rerunning GM-18. Its first attempt had a Docker port 54322 bind collision; the rerun completed the SQL and authenticated HTTP steps successfully. This scope-correction commit triggers a separate CI run.
