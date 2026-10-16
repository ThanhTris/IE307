# GM36 independent checks

2026-10-16. Owner Tâm; reviewer Trí (Pending). Branch codex/gm-36-menu-ocr.
Tested base/HEAD daa917461e68353f6ba015f2f746e805ec19710e + working-tree patch.
GM36.1/food1.1.0; exact source/evidence hashes in PATCH_MANIFEST.json.
macOS/Node26.0.0/TypeScript6.0.3/Python3.13.3; pinned CLI2.120.0, actual GoTrue local.
No app package/config/DB schema/core contract/dataset change or production publish.

| Scope / AC | Input → expected assertion | Actual/evidence | Result / limitation |
| --- | --- | --- | --- |
| Strict input/image/source/consent | Base64/MIME/container/dimension/size/bool/unknown keys → reject before provider |36 Node tests, unit-run.txt | Pass; container checks are not full real decoding |
| Draft/confidence/null/price | Vietnamese NFC/ranges/ambiguous values/unknown currency+unit/0 vs null → exact independent golden | Node tests + http/actual-draft.json | Pass for manually supplied provider output; no OCR accuracy claim |
| Auth/operator/privacy | Real GoTrue missing/forged JWT401; valid outsider403 despite metadata/headers; errors no raw provider diagnostic; no image/token in response | http/results.json,12 groups | Pass; Node-hosted Web handler, not Edge gateway |
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
| Remote CI / human review | Current committed/pushed revision | Not run / Pending Trí | Local evidence is not approval/Done |

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
