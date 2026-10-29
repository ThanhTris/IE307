# GM-05 checks — shared UI components

## Supplement 2026-10-27 — components used by the updated Home

The Home Figma frame now consumes the shared `AppHeader`, `AppButton` with stacked icon support, and `AvatarRow`; GM-05 also exports reusable `BrandBanner` and `AppBottomNavigation` components for its dining illustration and four-tab navigation. Components accept theme/font styles and route callbacks rather than embedding API behavior. The targeted shared-component and Home route/review-feedback suites pass **46/46 tests**; strict typecheck and architecture guard pass. The Android export includes the Figma assets. Updated Home visual verification on emulator is **Not run**.

This supersedes the later 2026-10-27 paragraph that said the Home layout remained GM-09 work: the actual screen composition is GM-09, and this supplement records which shared components it reuses. It does not complete GM-05 or claim pixel parity.

## Supplement 2026-10-27 — shared brand update on PR #137

The current branch updates shared light tokens to the approved Figma palette, replaces the AppHeader ramen mark with the official G logo asset, and applies Figma pressed colors to primary/secondary AppButton states. `sharedComponents.test.tsx` asserts the palette; targeted result is 9/9 tests, typecheck passes, and lint has zero errors (four pre-existing warnings). Android visual verification after this patch is Not run. This records shared-component changes only; GM-05 remains subject to its own task gate/review, and the Home screen composition remains GM-09 scope.

Status: implementation branch, Expo Go visual check confirmed by Trí in chat on 2026-10-12; awaiting final PR review. Tested code commit: `8f6f363` (`fix(gm-05): track the rendered dish image source`).

Base: `origin/main` `9188c736def7e125266f8cce2314b9f1f5c31b81`; contract `food-v1/roadmap-v2/GM-05.1`; input GM-02 shell and GM-04 field contract. PR #105 is not used as GM-05 evidence; its scope is GM-07 API/mock/loading.

| AC / case | Input → expected → actual | Result |
| --- | --- | --- |
| Tokens | Import `designTokens`, light/dark colors, spacing/radius/type; no new dependency | Pass by typecheck and source review |
| Component map | UI spec/prototype elements → 10 reusable components with props/events/limits | Pass; `docs/design/COMPONENT_MAP.md` |
| Controls | AppButton disabled/loading, FormField label/error, Chip selected, accessible labels | Pass; `sharedComponents.test.tsx` |
| Dish card | View props only, tags/price/venue, WANT/OK/NO actions, missing artwork fallback and retry after source/imageUrl changes | Pass; `sharedComponents.test.tsx` covers both source-only and dual-source cases |
| Room/context/social | RoomCode, ContextSummary, AvatarRow, StatusNotice display supplied state | Pass; `sharedComponents.test.tsx` |
| Sheet/dialog | `SheetDialog` modal with Android back handler and explicit close action | Implemented; route interaction not separately asserted |
| Preview route | `/foundation` → `Mở component mẫu GM-05` → `/components`; fixture labelled and Home/card composed | Pass; 3 route tests |
| Accessibility/layout code | touch controls min 48dp including Chip, labels/hints/states, safe-area screen, fallback text | Pass by source review and manual Expo check; device model/screenshot metadata not supplied |
| Full mobile | typecheck, lint, Jest, architecture | Pass after final rerun; 8 suites / 297 tests; output in `MOBILE_CHECK.txt` |
| Expo Go Android visual | Open route on real device, dark/font200/TalkBack/overflow | Pass; Trí confirmed component preview is usable in Expo Go on 2026-10-12. Device model/screenshot not recorded |
| Live dependency gate | `task_readiness --task GM-05 --gate merge --base-ref origin/main` | Previous recorded result `READY_FOR_MERGE_REVIEW`; refresh currently blocked by missing `read:project` credential; see PLAN.md |

Known lint baseline: 4 warnings in existing `contracts.ts`/`index.ts`; no lint errors from GM-05 after removing unused import. No production API/native/data claim is made.

## Supplement 2026-10-29 — GM-05.2 implementation branch

Base/revision: implementation commit `4210278` on `codex/gm05-figma-components`, based on `origin/main` SHA `5c339cf351ca4e37d95d4d0e8211be0ccb8a8af3`. Contract reference: `ui-figma-final/2026-10-25/GM-05.2`.

| Check | Input / expected | Actual | Result |
| --- | --- | --- | --- |
| Shared component unit/integration suite | Added UI states and callbacks; expected assertions pass | `npm run check`: 27 suites, 714 tests passed; TypeScript and architecture guard passed | Pass |
| Lint | No lint errors | 0 errors, 4 existing warnings in `src/data/api/contracts.ts` and `src/data/api/index.ts` | Pass with warnings |
| Expo baseline | Installed packages match lockfile | `npm run check:expo`: Expo 58.0.19; dependencies up to date, offline compatibility validation caveat | Pass with caveat |
| Android export | Export application JS/assets | `npm run bundle:android`: exported `dist/android`, Android bundle 3.4 MB | Pass (bundle only) |
| Repository validator | Repository docs/manifests valid | `python scripts/validate_repository.py`: OK | Pass |
| Task docs index | Generated indexes match metadata | `python scripts/task_readiness.py --check-docs`: match | Pass |
| Python regression | Full repo `unittest` discovery | 606 tests: 167 failures, 35 errors, 6 skipped; common cause `tzdata` missing on Windows (`Asia/Ho_Chi_Minh`) with cascading fixture failures | Fail / environment blocker |
| Whitespace | `git diff --check` | No whitespace errors (Git reported a CRLF-to-LF normalization warning for the map document) | Pass |
| Live GM-05 task gate | Query current GitHub Project #2 | `BLOCKED_PROJECT_UNVERIFIED`: GitHub rejected Project query | Not verified |
| Figma parity | Inspect current Figma/PDF reference and compare app/device at matching viewport | Local 33-page PDF opened; overview p. 27 and states p. 29–33 inspected. No matching Expo/device screenshot comparison | Not run (device comparison) |
| Android accessibility/responsive | Expo Go Android, TalkBack, font scale 200%, 320/360/412dp and dark theme | `adb` unavailable; no device evidence | Not run |

Component-specific added tests exercise Inter token family names, header variants/callbacks, absent price and hidden member presence, count bounds, unknown preference, waiting progress, tied rank display, loading/empty/retry/stale/shortage states, and all eight gesture/tone labels plus an accessible tutorial button alternative. They assert rendered props/events, not visual fidelity. For Figma parity status and exact design references see [`FIGMA_PARITY.md`](FIGMA_PARITY.md).

| Podium tie overflow, added after opening the local Figma source | Four dishes, three share rank 1 and equal score; expected all dishes retained and the winner label attached only to the supplied winner | Targeted component suite 21/21 passed; horizontal list is scrollable, all 3 rank-1 labels and tied dishes render | Pass (component contract); visual layout Not run |
| Direct design source | Local `.fig`/PDF and Figma node `617:1671` | `.fig`: 12,590,824 bytes. PDF: 5,648,112 bytes, 33 pages; opened and visually inspected pages 27–33. Figma inspection describes dense ranking, equal-score/equal-height ties, winner-only badge; bounds 1576×408px | Pass (source/reference read) |
| Tutorial interaction variants | PDF p. 29; tap/swipe left/swipe right/double tap, dark/light rows; button fallback | `TutorialGesture` renders eight labeled tiles and button alternative; covered by full mobile suite (27 suites, 714 tests passed) | Pass (component assertions only; vector/icon visual fidelity Not run) |

## Final local rerun — 2026-10-29

This run supersedes the earlier Python environment-blocked result above. Git Project state was fetched live through `gh` CLI after the Python checker first picked a different Windows credential; the temporary `GH_TOKEN` was held only in the invoking PowerShell process and removed after each gate check.

| Check | Input / expected | Actual | Result |
| --- | --- | --- | --- |
| Python repository regression | Python 3.11 / Windows; project CI requirement `scripts/ci-requirements.txt` plus tzdata available | `python -m unittest discover -s tests -p "test_*.py"`: 642 tests, 6 skipped, OK; environment had tzdata 2026.6 and jsonschema 4.26.0 installed to the user site, not the repo | Pass |
| Live start gate | GM-02, GM-04 Done; GM-05 claimable | Project #2: GM-02 Done, GM-04 Done, GM-05 Needs Update / assignee Trung. Checker: `READY_TO_CLAIM` | Pass (claim allowed) |
| Live merge gate | Refresh `origin/main`; verify delivered start dependency revisions | `origin/main` `5c339cf351ca4e37d95d4d0e8211be0ccb8a8af3`; checker: `READY_FOR_MERGE_REVIEW` | Pass (review gate only) |
| Final mobile suite | TypeScript, lint, all Jest suites and architecture guard after 52dp button change | `npm run check`: 27 suites / 714 tests passed; lint 0 errors, 4 existing warnings; architecture guard passed | Pass |
| Final focused rerun | Typecheck and changed shared component suite after GM-05.2 preview label update | `npm run typecheck` passed; `npx jest tests/component/sharedComponents.test.tsx --runInBand`: 21/21 passed | Pass |
| Expo baseline and Android export | Installed dependencies match lockfile; Android JS bundle exports | `npm run check:expo`: dependencies up to date (offline validation caveat); `npm run bundle:android`: 3.4 MB bundle `entry-e19ad743113e9a1d40ea8e3fced32e89.hbc` | Pass (export only) |
| Repository checks | Validator, generated doc indexes, whitespace | `python scripts/validate_repository.py`: OK; `python scripts/task_readiness.py --check-docs`: match; `git diff --check`: clean | Pass |
| Figma PDF source | Local design PDF and components/state frames | Opened in Chrome; 33 pages. Inspected components board p. 27 and tutorial/room/collection/request/shortage states p. 29–33 | Pass (reference inspection) |
| Final app/device visual criteria | Expo Go Android same viewport, 320/360/412dp, 200% font, TalkBack, light/dark | Trung reports a manual Android check in chat on 2026-10-29. Device/build/revision, route/scenarios, expected vs actual, assertions, and screenshots/logs are not attached; this environment has no Android SDK/device/adb to reproduce it | User-reported; not independently verifiable. Keep AC Not run until reproducible evidence is supplied; blocks GM-05 Done |
