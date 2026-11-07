# GM-27 — Canonical result consumer and strict wire validation

Owner: Trang · Reviewer: Trí. Contract: `ui-figma-final/2026-10-25/GM-27.2` and `dish-session-v4/roadmap-v2/GM-07.B-supplement`.

## Scope

- Preserve server-owned winner, scores, order and dense ranks; never calculate scores or break ties on the client.
- Validate raw canonical/legacy result payloads against the B and B-supplement schemas before mapping; reject malformed canonical data without falling back to legacy.
- Cover missing fields, nested structures, enums, types, bounds, arrays, nullable values and terminal-result invariants with schema-oracle fixtures.
- Keep result cache/session handling, `RESULT_NOT_READY` polling, identity changes, Places isolation and GM-28 result navigation covered by regression tests.

## Shared backend preference fix included in this PR

Migration `0040_v4_preference_validation.sql` advances schema to `0.16.1` and fixes the ambiguous `value` reference in `dish_v4_private.valid_preferences(jsonb)`. It preserves the function signature, grants, volatility and fixed `search_path`; it applies to both GM-07.B and B-supplement preference writes. This migration is included in this PR so the client and backend fix can be reviewed and merged together; no separate push to `main` is required first.

## Latest local verification

- GM-07.B disposable Auth/REST QA: **170 cases / 601 schema-envelope validations passed**; the `0039 → 0040` upgrade preserved existing preference data and function security metadata.
- B-supplement and GM-20 canonical HTTP QA: **188 cases / 731 schema-envelope validations passed**. Positive cases saved and read back Cay/spicy preferences; malformed values were rejected without preference/version changes. With the QA-only feature flag off, B-supplement returned `400 / UNSUPPORTED_CONTRACT_VERSION`.
- Android AVD `Medium_Phone_API_37.0` / API 37 / Expo Go 58.0.5: live guest signup, room creation and snapshot reads worked. The Cay preference was persisted by the real QA RPC and remained selected after reload. The screen still showed a “Mô phỏng” label and did not progress to Lobby/result. The AVD run is incomplete; no result-screen screenshot was captured as a durable artifact.
- Mobile: **70/70 suites, 1,305/1,305 tests passed** with a 20-second Jest timeout; focused GM-27 tests **201/201**. Python regression **664 tests, 2 skipped**; repository validator, docs checker and diff check passed. Expo compatibility and Android JS export passed.
- QA worker, Supabase project and network were stopped. The application database was not used. GitHub CI for the updated PR head will run after this push.

Evidence: [CHECKS](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/CHECKS.md), [HANDOFF](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/HANDOFF.md), [FIGMA parity](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md), [latest follow-up](https://github.com/ThanhTris/IE307/blob/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/FOLLOWUP_2026-11-07.md), [QA summaries and source manifest](https://github.com/ThanhTris/IE307/tree/issue88_figma_ui_gm27/docs/evidence/roadmap-v2/GM-27/artifacts/2026-11-07-guard).

## Merge status

**Not yet merge-ready.** GM-27 Chặng 3A still requires a live Android flow through Lobby to the result screen, result/Top 3/tie/NO_CONSENSUS checks, and durable reviewable AVD artifacts. This PR does not claim those checks passed. The misleading simulation label and blocked progression are handed off to GM-25. No production database was changed and no Project status or approval was changed.