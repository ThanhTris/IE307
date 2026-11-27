# Verification Checks — GM-54

- **Task ID**: `GM-54`
- **Issue**: [#190](https://github.com/ThanhTris/IE307/issues/190)
- **Owner**: Trang (`@rosy179`)
- **Reviewer**: Trí (`@ThanhTris`, ADR-013)
- **Contract / Version**: `release-v1/2026-11-23/GM-54.2` (migration `0067_gm54_app_min_version.sql` registers schema version `0.32.0`)
- **Base commit**: `35c60f1` (`origin/main`) on branch `codex/gm-54-android-build-version-places`

## 1. Automated Commands Executed After Final Code Edit

| Check | Scope | Result | Notes |
| --- | --- | --- | --- |
| `npx expo config --type public` (`mobile/`) | Resolved Expo Android config (`version: 1.0.0`, `vn.gicungduoc.mobile`, adaptive icon, `expo-splash-screen` plugin, Android permissions allowlist/blocklist, absent `extra.eas` when `EXPO_PUBLIC_EAS_PROJECT_ID` unset) | Pass | Verified JSON output directly |
| `npm run typecheck` (`mobile/`) | TypeScript strict check across `app.config.ts`, `src/`, `tests/` | Pass | 0 errors |
| `npm run lint` (`mobile/`) | ESLint across all mobile source & test files | Pass | 0 errors |
| `npm run check:architecture` (`mobile/`) | Boundary checks (`shared/`, `features/`, `app/`, no Supabase SDK in features) | Pass | Architecture boundaries OK |
| `npm run check:expo` (`mobile/`) | Lockfile parity (`package.json` vs `package-lock.json` vs `node_modules`) & SDK 58 bundled compatibility (`expo@58.0.25`, `expo-splash-screen@~58.0.15`) | Pass | `Dependencies are up to date` (`expo install --check` offline-mode warning noted by script) |
| `npm run test:expo-baseline` (`mobile/`) | Baseline lockfile guard tests (`scripts/check-expo.test.mjs`) | Pass | 5 / 5 tests passed |
| `node --test tests/*.test.mjs` (`mobile/`) | Brand PNG transparency/dimensions + domain decision & eligibility engine tests | Pass | 390 / 390 tests passed |
| `npx jest --runInBand --runTestsByPath tests/unit/minimumVersion.test.ts tests/unit/releaseConfigSafety.test.ts tests/unit/placesCacheAndHeaders.test.ts tests/component/releaseSafetyAndMap.test.tsx` | GM-54 unit & component test suites (`TC-REL-003`, `TC-REL-004`, `TC-REL-008`, `TC-REL-009`, semver/schema/fail-open, `eas.json` & `app.config.ts` safety, no `NODE_ENV`/`output=embed`, Places Android headers/TTL cache/403 non-caching, unkeyed/keyed Embed API, hidden push prompts, `__DEV__=false` dev route redirect) | Pass | All 4 suites passed after last edit (`releaseSafetyAndMap.test.tsx`: 6 / 6 passed; unit suites: 14 / 14 across GM-54 unit files) |
| `npm test` (`mobile/`) | Full Jest suite (`--runInBand`, 104 test suites total) | Partial (102 passed, 1 skipped, 1 timeout flake -> passed on rerun) | 1560 / 1562 passed; `tests/integration/gm32OutboxLive.test.ts` skipped (no live QA API running); `tests/component/dishSetupRefinement.test.tsx` hit a 1000ms modal `findByText` timeout on full-run CPU load (reran directly: 10 / 10 passed in 33.04s) |
| `npm run bundle:android` (`mobile/`) | Production-like Android Metro/Hermes bundle export (`expo export --platform android --output-dir dist/android`) | Pass | Bundled 3933 modules, 55 assets, Hermes `.hbc` (`7.4MB`); `dist/` cleaned afterward |
| `python scripts/test_cases.py --write` & `tests/test_test_cases.py` | Regenerated `TEST_CASES.md`, `TRACEABILITY.md`, `TEST_REPORT.md` to link `TC-REL-003/004/008/009` automation (`153 with automation, 41 without`) | Pass | 25 / 25 tests passed |
| `python -m unittest discover -s tests -p "test_project_gate.py"` | Project gate & workflow logic | Pass | 38 / 38 tests passed |
| `python -m unittest discover -s tests -p "test_task_readiness.py"` | Task readiness & 1-Task-1-PR ownership gate tests | Pass | 34 / 34 tests passed |
| `python -m unittest discover -s tests -p "test_repository_validator.py"` | Repo validator tests | Pass | 69 / 69 tests passed |
| `python scripts/validate_repository.py` & `python scripts/task_readiness.py --check-docs` & `git diff --check` | Docs, links, JSON, task manifest, dependencies, FR traceability, & whitespace checks | Pass | 0 issues |

## 2. Checks Not Run or Blocked in Local Sandbox

| Check | Status | Reason / Required Action |
| --- | --- | --- |
| `eas init` / `eas config` / `eas build -p android --profile preview` & `--profile production` | Not run | No `eas` CLI session or Expo project credentials in local environment; run by release operator / Trí |
| Signed APK (staging) & AAB (production) install, splash/adaptive icon & Play Store manual upload check (`TC-REL-001`, `TC-REL-002`, `TC-REL-010`, `TC-REL-011`) | Not run | No Android SDK / emulator / physical USB device or signed EAS build in sandbox |
| Live SQL migration (`0067_gm54_app_min_version.sql`), `rls.sql`, & `supabase/tests/http/GM-54.http` | Not run | No running Postgres / Supabase QA instance started locally; execute against QA local and Supabase staging before merge |
| Live Google Places API + Maps Embed API v1 with billing key & SHA-1 Android app restriction | Not run | No Google Cloud billing API key or release upload keystore SHA-1 provisioned locally |
| `python scripts/task_readiness.py --task GM-54 --gate merge --base-ref origin/main --verify-outputs` | Blocked (`BLOCKED_PROJECT_UNVERIFIED`) | Local GitHub credential lacks `read:project` GraphQL scope and Python 3.11 Windows SSL default verify paths require system CA trust; verify live Project #2 status gate in CI or with `read:project` token before merge |
| Figma visual parity audit | Not run | No Figma MCP frame created; see `FIGMA_PARITY.md` |
