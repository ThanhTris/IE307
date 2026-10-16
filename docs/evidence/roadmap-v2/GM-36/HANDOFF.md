# GM36 independent OCR/draft handoff

2026-10-16. Owner Tâm (@HoaiTam); reviewer Trí (@ThanhTris), Pending.
Branch `codex/gm-36-menu-ocr` from target main
`daa917461e68353f6ba015f2f746e805ec19710e`; working-tree patch, no commit/push.
Live start gate READY_TO_CLAIM. Contract GM36.1; input GM04.2/food1.1.0/GM07.1.
Merge/Done remains blocked by GM34 and unreviewed real recognizer/provider/pilot.

## Inputs and outputs

| Producer | Received artifact/version on target | Scope |
| --- | --- | --- |
| GM04 | FOOD_DATA_DICTIONARY, food-v1.schema.json, validator, food1.1.0 | UUID/source/null/price/unit/unknown/verification semantics |
| GM07 | contracts.ts, API envelope/errors, PriceUnit, GM07.1 | Core unchanged; separate OCR DTO, no new client method |
| GM08 | importer/preflight already Done | Reuse offline preflight to prove standalone OCR draft cannot import/publish |
| GM34 | RELEASE/CHECKS/HANDOFF not delivered | Pending final integration/release gate; no substitute artifact |

- `supabase/functions/menu-ocr/index.ts` + contract/normalize/auth/quota/read-json:
  executable Web handler/provider port; mandatory actual Auth + operator allowlist,
  size/read/recognizer deadline, quota port, safe errors and unverified draft output.
- `draft.schema.json`: standalone MenuDraft, never a food bundle; schema/semantic
  CLI reuses existing GM04 validator and GM08 preflight without editing producers.
- `scripts/gm36_http_check.mjs`: real loopback HTTP + actual GoTrue JWT verification;
  recognizer strictly a test double. Creates/deletes only namespace-tagged synthetic
  Auth identities; no food/room/history/consent business writes, no DB reset.
- `tests/fixtures/menu-ocr-v1`: synthetic1×1 PNG and independently specified golden
  rows, explicitly not actual OCR/menu data. Native decoder/accuracy NOT tested.
- `supabase/tests/http/GM-36.http`: request/status/setup/limits; pipeline runner is
  reproducible while actual Edge deployment is intentionally unavailable.
- API semantics/errors/trust/unknown/manual correction in GM36_MENU_OCR_API;
  provider/license/privacy/cost/accuracy checklist in PROVIDER_REVIEW (Pending).
- New CI workflow checks TypeScript/unit/schema and real HTTP/JWT with fake provider;
  no deploy, provider/network OCR or paid service invocation.

## Reproduce from clean clone

Node24+ supports stripping these TypeScript modules; pinned existing TypeScript
is used for strict typechecking. Python3.11+ with repo prerequisites/Docker local.
No Deno install/new application dependency is required for independent tests.

```sh
npm ci
npm ci --prefix mobile --no-audit --no-fund
node mobile/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --lib ES2022,DOM supabase/functions/menu-ocr/index.ts
node --test tests/gm36-menu-ocr.test.mjs
python3 -m unittest discover -s tests -p 'test_gm36_menu_ocr.py'
npm run backend:start
GM36_PYTHON=python3 node scripts/gm36_http_check.mjs
python3 scripts/gm36_contract_check.py --draft docs/evidence/roadmap-v2/GM-36/http/actual-draft.json --report /tmp/gm36-contract.json
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-36 --base-ref origin/main
python3 scripts/task_readiness.py --task GM-36 --gate merge --base-ref origin/main
git diff --check
npm run backend:stop
```

Expected independent checks: strict TypeScript Pass,36 Node tests,8 Python feature
tests,12 HTTP groups, validDraft=true + gm08DirectImportRejected=true.
Merge checker should remain BLOCKED GM34 until that real output is Done/delivered.
A Mac system Python without CA certificates must use a trusted bundled Python for
live gates, never disable TLS. Windows set GM36_PYTHON=python (CI already does).
Runners guard loopback API54321/project gi-cung-duoc-local; no remote deployment.
Token/public key stay in memory, no runtime credentials or menu photos in evidence.

## What is implemented

A correctly authorized test adapter can process bounded input through the real
handler and return exact field projections: high-confidence NFC name/price range,
null uncertain fields/units, source references, confidence/issues, draft state.
No location/coverage/hours/taxonomy/allergens/safety or rights evidence is inferred.
Bad JWT/outsider/unknown input/invalid image fail before recognition. Timeout aborts
and suppresses late response; concurrency slot stays occupied while work continues.
Quota counts actual attempts even on provider errors; memory quota is test-only.
Body limit/deadline and Auth response bounds apply independently of Content-Length.

The production Deno entrypoint is explicitly disabled. `edge_runtime=false` stays
unchanged. Real recognizer, native package, distribution-wide quota, device UI,
Edge runtime/gateway parity and actual-menu pilot remain Not run/Pending. The HTTP
result proves the Web handler/GoTrue boundary, not a deployed Supabase Edge function
or functioning image recognition. Permanent core DTO/config/schema/package/data
inputs are unchanged. No self Approved/Done and no GitHub status writes.

## Manual correction / importer continuation

1. A curator inspects the real permitted menu and corrects unknown/misaligned fields.
2. Establish actual dataSources/sourceRef/license/freshness evidence and real
   dish/branch/offering/coverage/hours/timezone bindings using the existing GM04 template.
3. Keep unknown fields null/unknown. Confidence and a checked declaration are not
   source approval, verification or current opening hours. No allergen inference.
4. Build a real food1.1.0 bundle after human review and use existing GM08 offline
   validate/stage/review flow. MenuDraft itself is always rejected by that importer.
5. After GM34 and Trí's recognizer/native/provider decision, integrate and test the
   selected real path and ordinary publish guards. Do not use synthetic image/rows
   as accuracy/source evidence or change a running room's locked pool.

## Remaining acceptance and consumer scope

Provider/native license/size, quota/cost/privacy/rights evidence, actual Vietnamese
menu accuracy target/pilot, real on-device recognition/correction and reviewed
integration are still required for full GM36. No provider was selected or contacted.
PROVIDER_REVIEW records Pending fields for Trí; no permission is invented.
GM36 currently has no Android screen/camera consumer under MOBILE_API_TEST_MATRIX.
Device tests are Not run/outside this independent pipeline; future mobile OCR needs
a named consumer and upload/auth/timeout/privacy/accuracy cases before its acceptance.
The transient Node test endpoint closes after execution; laptop localhost is not a
phone endpoint. Do not repoint the core app to this stub or bypass Edge JWT checks.

Rollback of this isolated patch: leave entrypoint/core flags off and remove its
new feature modules/runners if rejected. No DB down migration or data deletion is
needed. Remote CI and Trí review apply only after user commit/push, not from local Pass.
