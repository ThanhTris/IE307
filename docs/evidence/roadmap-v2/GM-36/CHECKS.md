# GM36 independent checks

2026-10-16. Owner Tâm; reviewer Trí (Pending). Branch codex/gm-36-menu-ocr.
Published PR123 head:858ef00d506435d59c5a5dfa87f5a8a2a103d6da.
Current tests: that HEAD + the uncommitted price-review fix, source hashes in manifest.
Original branch base daa9174; fetched review target origin/main4a8cd64.
GM36.1/food1.1.0; exact source/evidence hashes in PATCH_MANIFEST.json.
macOS/Node26.0.0/TypeScript6.0.3/Python3.13.3; pinned CLI2.120.0, actual GoTrue local.
No app package/config/DB schema/core contract/dataset change or production publish.

| Scope / AC | Input → expected assertion | Actual/evidence | Result / limitation |
| --- | --- | --- | --- |
| Strict input/image/source/consent | Base64/MIME/container/dimension/size/bool/unknown keys → reject before provider |48 Node tests, unit-run.txt | Pass; container checks are not full real decoding |
| Draft/confidence/null/price | Vietnamese NFC/ranges/ambiguous values/unknown currency+unit/0 vs null → exact independent golden | Node tests + http/actual-draft.json | Pass for manually supplied provider output; no OCR accuracy claim |
| Auth/operator/privacy | Real GoTrue missing/forged JWT401; valid outsider403 despite metadata/headers; errors no raw provider diagnostic; no image/token in response | http/results.json,14 groups | Pass; Node-hosted Web handler, not Edge gateway |
| Disabled default | Authenticated default-disabled handler503 with no provider call | HTTP scenario + source entrypoint | Pass; actual Deno entry not executed |
| Timeouts/quota/concurrency | Body408, provider504/abort, late job keeps lease, simultaneous200+429/one provider call; fourth operation429 | Node + HTTP | Pass with test-only memory quota; not distributed production enforcement |
| Provider error/no text/malformed | Unavailable503 / empty422 / malformed502 with no draft | HTTP + unit | Pass using explicit recognizer test double |
| Draft-only import boundary | Exact actual HTTP draft → JSON Schema+semantic validation; original GM08 publish-ready preflight rejects direct import | http/contract-results.json | Pass; no DB/import/publication performed |
| Cross-language contract | Golden valid; fake verified/location/rights/low-confidence known fields/partial price/source spoof rejected |8 Python feature tests, python-unit.txt | Pass; reuse GM04 schema engine and unchanged GM08 code |
| TypeScript | strict noEmit module compile of all reachable OCR modules | typecheck.txt | Pass; no app/native typecheck claim |
| Regression | Existing Python suite + feature tests | python-regression.txt |558 tests,5 pre-existing skips; Pass with skips stated |
| Repo/index/whitespace | Documents/JSON/link/task graph/index/diff | repository-check.txt/docs-check.txt/diff-check.txt | Offline only, not reviewer approval |
| Start gate | Live Project Done GM04/07 + fetched artifacts/HANDOFF | start-gate.txt | READY_TO_CLAIM |
| Merge gate | Live GM34 still Todo | merge-gate.txt | BLOCKED GM34; independent delivery only |
| Real recognizer/provider/source/accuracy/license/quota/cost review | Real permitted-menu/native pilot and Trí decision | PROVIDER_REVIEW.md | Not run/Pending; blocks full task acceptance |
| Deno/Edge, Android, production | Deployed Edge gateway; chosen native recognition/device flow | Not run | Current core edge_runtime remains false; no Android consumer in scope |
| Remote CI / human review | Nine workflow runs for published858ef00 completed successfully | review-fix-2026-10-16/ci-published-head.json | New local fix CI Not run until push; Pending Trí re-review |

The positive PNG is a synthetic1×1 image, and the recognizer rows are manually
written fixtures. No real menu is recognized or sent to an external OCR/AI service.
HTTP authentication is real network/GoTrue; authorization uses a server UUID allowlist,
not user_metadata claims or a decoded token. Loopback transport executes the exact
Web Request/Response handler; it does not claim a running Supabase Edge deployment.

Python unittest chạy558 cases;5 ca skip có sẵn được giữ nguyên. Không thêm
mobile/native package hoặc ghi app UI/build/device Pass từ phần độc lập này.
RLS/race/SQL migrations N/A for this independent stateless food draft handler;
GoTrue guest setup/namespace-verified cleanup is the only test identity DB mutation.
No menu/food/room/history/publish writes occur. No actual credentials/private photos
are in artifacts, and every HTTP test identity is removed after the run.

Keep manual/unknown fields and existing GM08 guards. Source-rights declarations and
confidence cannot substitute source evidence, schedules, freshness or verification.
Before full merge/Done: real GM34 output, approved actual recognizer/provider/native
scope, reviewed safety/accuracy/quota policy and its real tests, then Trí review.

## PR123 review fix — 2026-10-16

[Trí review](https://github.com/ThanhTris/IE307/pull/123#issuecomment-6209239517)
reported35-45k and35-45.000 đ becoming35..45000. Added regression before fixing:
48 tests /40 pass /8 fail at parser and normalized field assertions. After fixing,
48/48 Pass;14 real HTTP/GoTrue groups Pass with explicit confidence0.99 cases.
Ambiguous ranges keep priceMin/Max/currency/unit and fieldSources.price null,
include PRICE_UNKNOWN_OR_AMBIGUOUS. Fully specified ranges and explicit zero remain
supported. No inferred x1000 correction. New red/green evidence is in
review-fix-2026-10-16/; original manifest/HTTP reports retained there as history.

Published initial implementation is858ef00; it is no longer an unpublished patch.
This review fix is still uncommitted/unpushed, and its own remote CI has not run.
Do not attribute older green CI or reviewer environment setup failure to this fix.
Local review-fix HTTP completed all14 groups and cleaned its own synthetic guests.
GM34/provider/native/license/privacy/quota/cost/accuracy/pilot remain Pending.
