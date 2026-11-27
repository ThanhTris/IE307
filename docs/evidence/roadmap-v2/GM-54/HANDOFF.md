# Handoff — GM-54

- **Task ID**: `GM-54` — Cấu hình bản build Android, cổng phiên bản và Places
- **Issue**: [#190](https://github.com/ThanhTris/IE307/issues/190)
- **Contract / Spec**: `release-v1/2026-11-23/GM-54.2`
- **Schema Version**: `0.32.0` (`supabase/migrations/0067_gm54_app_min_version.sql`)
- **Owner**: Trang (`@rosy179`) -> **Reviewer**: Trí (`@ThanhTris`, ADR-013)
- **Downstream Consumers**: `GM-58` (Release Candidate QA), `GM-59` (Build Handoff to Lecturer), `GM-62` (Sentry Error Boundary), `GM-63` (Maestro E2E on APK)

## 1. Delivered Artifacts

1. **Android Build & EAS Config**:
   - [`mobile/app.config.ts`](../../../../mobile/app.config.ts): `version: '1.0.0'`, `platforms: ['android']`, `android.package: 'vn.gicungduoc.mobile'`, `android.adaptiveIcon`, `expo-splash-screen` plugin (light `#FFFCF3` / dark `#13161B`), explicit permissions (`CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`), explicit `blockedPermissions` (`RECORD_AUDIO`, `ACCESS_BACKGROUND_LOCATION`), truthful permission prompts, conditional `extra.eas.projectId` (omitted when `EXPO_PUBLIC_EAS_PROJECT_ID` is unset).
   - [`mobile/eas.json`](../../../../mobile/eas.json): Profiles `development` (`developmentClient: true`, APK, `EXPO_PUBLIC_APP_ENV=development`), `preview` (internal APK, `EXPO_PUBLIC_APP_ENV=staging`), `production` (store AAB, `autoIncrement: true`, `EXPO_PUBLIC_APP_ENV=production`), `cli.appVersionSource: "remote"`. No `NODE_ENV`, no secrets, no QA flags.
   - [`mobile/assets/brand/gi-cung-duoc-adaptive-foreground.png`](../../../../mobile/assets/brand/gi-cung-duoc-adaptive-foreground.png) and [`mobile/assets/brand/gi-cung-duoc-splash.png`](../../../../mobile/assets/brand/gi-cung-duoc-splash.png): Generated from `gi-cung-duoc-icon.png` inside 66% safe zone.
   - [`mobile/.env.example`](../../../../mobile/.env.example): Documents optional `EXPO_PUBLIC_APP_ENV` and `EXPO_PUBLIC_ANDROID_CERT_SHA1`.
2. **Minimum Version Gate (Fail-Open)**:
   - [`supabase/migrations/0067_gm54_app_min_version.sql`](../../../../supabase/migrations/0067_gm54_app_min_version.sql): Private config table `gm54_private.app_release_config` (RLS forced, direct access revoked) + read-only public RPC `public.get_app_version_policy(text)` (`security definer set search_path = pg_catalog`, granted to `anon, authenticated, service_role`), seeded `'android'` at `'1.0.0'`.
   - [`supabase/tests/database/GM-54_app_min_version.test.sql`](../../../../supabase/tests/database/GM-54_app_min_version.test.sql): pgTAP SQL test suite (`19` assertions) verifying schema version `0.32.0`, `SECURITY DEFINER` + `search_path = pg_catalog`, `anon`/`authenticated`/`service_role` execute grants vs `gm54_private` denial + forced RLS, normalized platform fallback, null unknown platform response, and live `minimum_version` bump reflection.
   - [`supabase/tests/http/GM-54.http`](../../../../supabase/tests/http/GM-54.http): Anon read & direct-table denial contract requests.
   - [`mobile/src/features/release/services/minimumVersion.ts`](../../../../mobile/src/features/release/services/minimumVersion.ts), [`UpdateRequiredScreen.tsx`](../../../../mobile/src/features/release/screens/UpdateRequiredScreen.tsx), and [`mobile/src/app/_layout.tsx`](../../../../mobile/src/app/_layout.tsx): Numeric semver check + HTTPS store host allowlist + fail-open on network/HTTP/schema errors (`TC-REL-003`, `TC-REL-004`).
3. **Runtime Safety, Push Hiding, & Places / Maps Compliance**:
   - [`mobile/src/shared/lib/appEnv.ts`](../../../../mobile/src/shared/lib/appEnv.ts) + cleanup in `LiveDishResultScreen.tsx` & `placesRepository.ts`: Replaced `process.env.NODE_ENV` checks with `__DEV__` + `EXPO_PUBLIC_APP_ENV`.
   - [`mobile/src/features/inbox/services/expoPushDriver.ts`](../../../../mobile/src/features/inbox/services/expoPushDriver.ts), [`PushSettingsScreen.tsx`](../../../../mobile/src/features/inbox/screens/PushSettingsScreen.tsx), [`mobile/src/app/push-settings.tsx`](../../../../mobile/src/app/push-settings.tsx), and [`PermissionsWelcomeScreen.tsx`](../../../../mobile/src/features/permissions/screens/PermissionsWelcomeScreen.tsx): Hides `"Thiếu cấu hình EAS Project ID"` notices, push setup controls, and unavailable push permission rows when EAS Project ID is unconfigured (`TC-REL-009`), keeping Inbox and in-app `NotificationBanner` active.
   - [`EmbeddedDishMap.tsx`](../../../../mobile/src/features/result/components/EmbeddedDishMap.tsx), [`NearbyPlacesSection.tsx`](../../../../mobile/src/features/result/components/NearbyPlacesSection.tsx), [`DishResultFlow.tsx`](../../../../mobile/src/features/result/screens/DishResultFlow.tsx): Removed `&output=embed`; uses official Maps Embed API v1 only when a key is present and falls back cleanly to `"Mở Google Maps"`.
   - [`placesRepository.ts`](../../../../mobile/src/features/result/services/placesRepository.ts): Adds `X-Android-Package` (`vn.gicungduoc.mobile`), normalized uppercase 40-hex `X-Android-Cert` when configured, and a bounded 15-minute TTL response cache (clearing on `dispose()`, never caching `403`/network errors, preserving winner invariance).
4. **Tests & Generated Suite Docs**:
   - [`mobile/tests/unit/minimumVersion.test.ts`](../../../../mobile/tests/unit/minimumVersion.test.ts)
   - [`mobile/tests/unit/releaseConfigSafety.test.ts`](../../../../mobile/tests/unit/releaseConfigSafety.test.ts)
   - [`mobile/tests/unit/placesCacheAndHeaders.test.ts`](../../../../mobile/tests/unit/placesCacheAndHeaders.test.ts)
   - [`mobile/tests/component/releaseSafetyAndMap.test.tsx`](../../../../mobile/tests/component/releaseSafetyAndMap.test.tsx)
   - [`mobile/tests/component/liveDishResultScreen.test.tsx`](../../../../mobile/tests/component/liveDishResultScreen.test.tsx): Updated unkeyed Places test expectation after removing legacy `output=embed` WebView fallback.
   - [`docs/testing/TEST_CASES.md`](../../../testing/TEST_CASES.md), [`TRACEABILITY.md`](../../../testing/TRACEABILITY.md), [`TEST_REPORT.md`](../../../testing/TEST_REPORT.md): Regenerated via `python scripts/test_cases.py --write` so `TC-REL-003`, `TC-REL-004`, `TC-REL-008`, and `TC-REL-009` register automatic test links (`153` automated / `194` total, matching `tests/test_test_cases.py`).

## 2. Dependency Review Note for Trí (`ThanhTris`)

- **Added**: `expo-splash-screen` (`~58.0.15`, Expo SDK 58 bundled module) to [`mobile/package.json`](../../../../mobile/package.json) and [`mobile/package-lock.json`](../../../../mobile/package-lock.json). This is required because Expo SDK 58 moved the `'expo-splash-screen'` config plugin out of `@expo/prebuild-config`, so declaring `plugins: ['expo-splash-screen', ...]` in `app.config.ts` throws during prebuild/EAS Build unless `expo-splash-screen` is installed.
- **Not added**: `expo-build-properties` was intentionally omitted because Expo SDK 58 defaults `compileSdkVersion = 37` and `targetSdkVersion = 36`, exceeding Google Play's API 35 minimum; if EAS Build later requires overriding Gradle SDK/JDK values, Trí can approve adding `expo-build-properties`.

## 3. Operator Actions Needed Before `GM-58` / `GM-59`

1. Review and approve the `expo-splash-screen@~58.0.15` lockfile change and confirm how to handle the `BLOCKED_ON_BASE` ownership check on [`placesRepository.ts`](../../../../mobile/src/features/result/services/placesRepository.ts) (owned by `GM-30`, modified here for Android package/SHA-1 headers and TTL cache) before merging PR into `main` via `python scripts/task_readiness.py --task GM-54 --gate merge --base-ref origin/main --verify-outputs` (with a `read:project`-scoped token).
2. Run `eas init` inside `mobile/` cleanly once Expo project ownership is confirmed, configure EAS Environment Secrets per profile (`staging` / `production`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, optional `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, `EXPO_PUBLIC_ANDROID_CERT_SHA1` matching Google Cloud Android restriction).
3. Run `npm run qa:start` + `supabase/tests/http/GM-54.http` on a loopback-compatible Linux/macOS QA host (Windows local Supabase stack + pgTAP `GM-54_app_min_version.test.sql` + PostgREST checks already verified), and apply `0067_gm54_app_min_version.sql` to staging / production databases.
4. Trigger `eas build -p android --profile preview` (APK) and `--profile production` (AAB) and capture real APK/AAB SHA-256 + device screenshots for `GM-58` and `GM-59`.
