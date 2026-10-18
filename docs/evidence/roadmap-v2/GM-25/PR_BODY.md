## Problem and change

In real mode, Home previously had no usable path for a user without a session, while `LiveRoomRepository` could create a guest session without updating the provider's identity. This made onboarding and subsequent authenticated discovery inconsistent.

This revision gives onboarding one explicit path: the GM-25 Home route restores once through the provider; when storage is empty, Create/Join opens a guest-name sheet; a guest is created only after confirmation; and the destination route mounts after the provider observes the saved identity. Restore failures, revoked sessions, storage errors, and uncertain signup outcomes are distinct states with deliberate recovery actions. Room create/join no longer silently create a guest. Protected routes wait for an active session, and the GM-25 live lobby only treats `currentUserId` as the viewer. GM-25-specific screen variants preserve the upstream GM-09/GM-11 screen artifacts byte-for-byte.

A follow-up closes another auth gap: when a protected API returns `401/AUTH_REQUIRED`, the repository clears the public identity and blocks further requests instead of continuing to send the rejected token. Home and protected routes offer explicit session recovery; that action refreshes credentials before allowing API calls again. Revoked refresh credentials lead to the existing local-reset state, and responses from requests started under the old identity are discarded.

The changes retain GM-25's existing APIs, DTOs, mock/demo behavior, room lifecycle, and scope. No package, backend RPC, migration, or GM-31 voting changes are included.

## Regression coverage

- Home onboarding with empty storage: explicit name confirmation, one signup, then navigation with the same authenticated identity before discovery/create/join.
- Stored session restore, restore network failure, ambiguous signup, explicit local reset, logout, and provider updates through the token-free session snapshot observer.
- Direct route guards and lobby behavior when the current user is missing or absent from the roster.
- API `AUTH_REQUIRED` hides the current identity, blocks subsequent requests and stale in-flight results, and exposes explicit refresh recovery. A real `SessionManager` regression verifies the rotated token is saved before requests resume.
- Existing GM-25 repository, conflict, polling, taxonomy, eligibility, and retry regressions.

Tests use `SessionManager` with synthetic storage/auth/API responses. They do not establish real GoTrue, deployed RPC, or multi-client behavior.

## Verification on the local revision

- Expo baseline: 5/5 tests; Expo compatibility check reports SDK 57.0.30 and lockfile dependencies up to date, with its offline validation limitation noted in `CHECKS.md`.
- Focused auth/repository/onboarding tests: 5 suites / 116 tests passed, including the unchanged GM-09 and GM-11 screens.
- `npm run check`: 23 suites / 652 tests passed; TypeScript and architecture checks passed; lint has zero errors and four existing warnings.
- Android JavaScript bundle export passed.
- Repository validator passed; Python regression: 550 tests passed, 6 skipped (156.89 seconds); task indexes and diff check passed.

The implementation is based on PR head `11fe8a7eb24f8281111a53dd4243cf39b6f96827` plus the local API-recovery follow-up. Fetch found no new main commits; `origin/main` remains `4a8cd642c8d908d9e6d2c75d19c0935a44cba042` and is an ancestor. This description summarizes the implementation to be delivered on PR #124.

## Acceptance limits

Android device, real backend/auth, deployed migration/RPC verification, and two-client acceptance remain **Not run**. No Android device is available in this environment. The merge readiness gate reports `READY_FOR_MERGE_REVIEW` on this local tree after keeping upstream-delivered artifacts identical to main. Trí (`ThanhTris`) owns final review and acceptance.

See [CHECKS.md](CHECKS.md) for exact commands/results and [HANDOFF.md](HANDOFF.md) for HTTPS or USB `adb reverse` endpoint setup and the device acceptance scenario.
