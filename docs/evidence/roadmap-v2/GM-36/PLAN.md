# GM-36 — Independent OCR/draft plan

2026-10-16. Tâm explicitly requests the independent portion; reviewer ThanhTris/Trí
Pending. Branch codex/gm-36-menu-ocr from main daa917461e68353f6ba015f2f746e805ec19710e.
Live start gate READY_TO_CLAIM; GM04/07 Done and delivered target artifacts match.
No merge/Done: GM34 remains a merge dependency, not an independent-code start gate.
This follows task/ADR009 and the user's request; EXTENSIONS_SPEC's post-GM34 rule
still applies to enabling/integrating the extension, not this isolated draft work.

Inputs: GM04.2/food1.1.0 dictionary/schema/validator; GM07.1 API envelope/errors,
PriceUnit/null semantics. Do not edit these producer artifacts, migrations, app,
packages/lockfiles, source datasets, shared clients or backend feature flags.

Output contract GM36.1 is separate from GM07 public core DTOs. New menu-ocr modules:
strict bounded image/source/processing-consent input, typed provider port, confidence
and Vietnamese price normalization, draft-only safe projection, request handler.
No provider/native dependency is approved. Production entrypoint remains disabled;
no external OCR call, stored image, DB write or publish capability. Spec's on-device
recognition remains the target; fake provider is explicitly test-only. A reviewed
provider/accuracy/license/privacy/quota/cost plan and GM34 are still required later.

HTTP boundary: real Supabase Auth user lookup, operator UUID allowlist (never
user_metadata permission), no guest-by-default processing, bounded streaming input,
server timeout/abort, injected quota lease port. Memory quota is for isolated tests
only, not distributed production enforcement. All outputs draft/unverified; unknown
name/price/currency/unit remain null, no allergen/location/hours/category inference.
Explicit source-rights declaration is input metadata, not evidence/approval.

Tests: unit parser/contract/invalid image/low-confidence/timeout/provider failure/
quota/concurrency/late response/privacy; real Node loopback HTTP using the exact
Web handler + actual GoTrue JWTs (provider remains stub); separate Deno/Edge runtime
and real provider marked Not run. JSON Schema/semantic validation + existing GM08
preflight must reject direct draft import/publish. No synthetic verification claim.
Run strict TypeScript, Python/repository/index/diff checks. Capture source hashes,
HTTP statuses/output assertions, cleanup, limits in CHECKS/HANDOFF and PR template.
No auto commit/push/merge/Project updates or reviewer approval.
