# GM-09.2 — step 1: welcome and guest entry

2026-10-31. Owner Tuấn; reviewer Trí. Branch `codex/gm-09-figma-update`; tested base `621acccf777c8a2538012641ce525cba0e6ae3ce` plus uncommitted working tree, pinned by [source manifest](MANIFEST.json). This is a code candidate for one step, not Done/Approved or full GM-09 acceptance. Baseline evidence stays historical. [Manual commit/push guide](COMMIT_STEP1.md).

## Inputs and scope

- Live Project start gate at `2026-10-31T14:34:19Z`: `READY_TO_CLAIM`, no local/cache fallback. Receive GM-05 shared components/tokens on main (`4210278`) and GM-07 legacy client types (`food-v1/roadmap-v2/GM-07.1`). The UI requirement revision is `ui-figma-final/2026-10-25/GM-09.2`; no wire/schema/runtime rollout is implied.
- User-provided Draft `H2bFJnOVGfxFHHPK3Aqtrq`: metadata and full context/screenshots for welcome `298:2309`, guest `277:2104`; each 412×915. [Parity/reference record](../FIGMA_PARITY.md).
- Thin routes compose a new feature flow and existing session provider. Home remains the existing implementation. Setup/lobby/QR/tutorial/account API are not implemented by this step.

## Behavior and ownership

- Fresh mock `/` opens welcome. Choose guest, enter a name, explicitly continue, then reach Home. `rememberPreviewGuest` stores only a validated in-memory UI name; it does not call guest auth/create/join. Create/join forms receive that name. Scenario controls retain the entered name; app restart clears this local fixture state (durable recovery remains GM-31).
- Real entry uses the existing `ensureSession` callback only after confirmation. Index sends only confirmed `empty/no-session` to welcome; restore errors/expired/uncertain sessions retain their existing recovery behavior. Direct welcome also blocks replacement signup until recovery/reset; active session returns Home. No API failure switches modes.
- Name validation uses the existing 1–24 Unicode-code-point rule. A ref lock prevents repeated submit before React updates, freezes input/Back while pending and after acceptance, and ignores late completion after unmount. Failure retains the name and requires explicit retry. Uncertain real signup stays blocked until explicit session reset, according to GM-25's existing provider.
- Account actions invoke supplied callbacks when available. In this composition they show an honest unavailable-feature sheet; they do not fake login/register or block the core guest flow. Back/account sheet do not create a room/session.
- Shared `FormField` gains optional `hideLabel` and `inputStyle`, because the original component cannot express the received unlabelled 64dp input. Defaults and accessible input label/error behavior remain; no package, lockfile or provider changes.

## Source changes

New: `mobile/src/app/welcome.tsx`, `mobile/src/features/home/screens/WelcomeScreen.tsx`, `GuestEntryScreen.tsx`, two individual decoration PNGs and provenance under `mobile/assets/brand/entry/`, `mobile/tests/component/guestEntryScreen.test.tsx`, `mobile/tests/integration/guestEntryRoute.test.tsx`.

Modified: index redirect, in-memory preview entry/name fixture, create/join initial-name props, shared FormField optional presentation props, route regression fixtures/tests. No old Home, legacy API/engine/migration or historical regression was deleted. No parallel welcome implementation existed on the product route; the existing Home guest sheet remains for compatibility consumers/direct Home harnesses. Real product fresh entry now uses the new welcome route.

## Reproduce

```powershell
Set-Location E:\Workspace\project\IE307\mobile
npm ci
npm run check:expo
npm start
```

Use Expo Go Android. With no real API configuration, full reload starts the fresh in-memory fixture: `/` → `/welcome` → **Tham gia với tư cách khách** → **Tên khách** → **Tiếp tục** → Home. Create/join forms should inherit the entered name, without creating/joining a room until their own explicit confirmation. If already entered, full app reload resets the synthetic entry; component tests can use `resetPreviewEntry` for a fresh fixture. No durable “seen welcome” flag is introduced.

Check empty/whitespace/>24-code-point names, valid Unicode/trim, account sheet, Back then return to the form, keyboard/scroll, and the whole surface of CTA buttons. Real API session tests require the GM-25 environment and remain outside this step's mock acceptance; no HTTP/device Pass is claimed.

## Checks for this working tree

| Check | Actual | Result |
| --- | --- | --- |
| Start gate | Live Project `READY_TO_CLAIM` at the time above | Pass for readiness only |
| Strict TypeScript | `npm run typecheck`, exit0 after the final type correction | Pass |
| Source/tests/scripts lint | `npx eslint src tests scripts`: no errors, 4 existing API warnings | Pass with warnings |
| Architecture guard | `npm run check:architecture`: boundaries OK | Pass |
| Expo locked compatibility | Installed packages match lockfile and bundled SDK58 map; offline-validation caveat printed | Pass within locked/offline scope |
| Six related Jest suites | 113/114 tests; welcome/guest, routes, room entry, shared components and unit suites pass. GM-25 stored-session restore case times out | Fail overall; baseline failure retained |
| Final guest/route rerun | 3 suites / 40 tests pass: component flow, mock product routes and real-session seam route guards | Pass (automated only) |
| Android bundle | Final export passes: 1,412 modules, 42 assets, Hermes3.4MB, `entry-444918431b5ad6fb9df7db5ff77715a2.hbc`; first sandbox attempt could not write Hermes temp output, rerun with temp access succeeds | Pass (export only) |
| Asset source/slot inspection | Two non-empty clipped PNGs have measured334×390 /207×240 dimensions; screen slots preserve those dimensions at x78/x205. Existing logo is44×44. SHA-256 in asset ledger/manifest | Pass for file/source inspection; rendered geometry Not run |
| Repository docs/indexes | Validator and `task_readiness.py --check-docs` exit0; no task metadata changed | Pass (offline docs only) |
| Python regression | Default3.15 run: 613 cases, 167 failures/36 errors/6 skipped with missing `jsonschema`/`tzdata`. Stable3.14 + isolated dependencies:657 tests,3 errors,6 skipped | Fail overall; environment details below |
| Expo Go / visual / a11y | No device/ADB on this host; no app screenshot | Not run |

The same GM-25 timeout was reproduced before application edits (preflight recorded 76/77 tests across four entry suites on this base). The current failed case is `GM-25 Review Feedback Regression Suite › P1: stored session is restored by provider and enables both entry routes without signup`, with the default5000ms timeout. Do not loosen timeouts/runner or claim the overall suite is green. Local full lint also sees an unrelated ignored `mobile/.work/gm10Audit.test.tsx` unresolved internal Expo Router import, as recorded in preflight; that local QA file was not changed/deleted.

Final targeted command from `mobile`:

```powershell
npm test -- --runTestsByPath tests/component/guestEntryScreen.test.tsx tests/integration/guestEntryRoute.test.tsx tests/integration/routes.test.tsx
```

Final JSON report was written locally to `.work/gm09-step1-final-entry-jest.json`:40 tests,3 suites, no failures. This includes name validation/Unicode, explicit mutation seam, duplicate and accepted locks, retry/retained name, late response after unmount, Back, recovery/reset errors, stored active identity bypass and recovery issues staying on the original Home route. The earlier six-suite run separately retains its reported baseline failure; the final targeted pass does not replace that result.

### Python environment limits

CI specifies Python3.12; this host exposes3.15.0 and3.14.7 and initially lacks both `jsonschema` and `tzdata`. No system environment/dependency file was changed. For the second run, the pinned `scripts/ci-requirements.txt` dependency plus `tzdata` were installed into ignored `.work/gm09-python-deps`; `PYTHONPATH` was set only for the command and restored. Full output is local `.work/gm09-step1-python314.log`.

The3.14 full run has two cp1252 `UnicodeDecodeError` cases and one `WinError1314` symlink-privilege error. The two encoding cases were rerun explicitly with command-scoped `PYTHONUTF8=1` and both passed:

- `test_catalogue_projection.ProjectionAdoptionTests.test_stage_keeps_full_source_and_rich_projection`
- `test_gm06_canonical_migrations.CanonicalMigrationIdentityTests.test_canonical_schema_identity_is_not_used_by_runtime_migrations`

`test_stage_refuses_symlink_output` requires an OS capability unavailable here. No test was skipped/modified and no Windows security setting was changed to work around it. The full suite remains reported as failed; the two targeted passes do not constitute a full green rerun. These cases exercise Data/SQL tooling, not native UI. Reproduce the full suite in its supported CI environment before claiming repository-wide regression acceptance.

## Remaining acceptance

Android/Expo Go interaction, rendered geometry for every asset, 412dp same-state comparison plus 320/360dp, font200, TalkBack, Dark, keyboard and hardware Back need real evidence. Trí must review the contrast differences and other deviations in FIGMA_PARITY. This step does not close Home redesign, GM-10 dish-only forms or any later step. The agent has not staged, committed, pushed, changed Project or recorded approval.
