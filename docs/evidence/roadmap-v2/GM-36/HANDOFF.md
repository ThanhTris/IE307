# GM-36 draft pipeline — current handoff

Updated 2026-11-19. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
PR #123 tracks the independent pipeline on main `5bbee5d`. See [CHECKS](CHECKS.md)
for current gate results and tested revisions. Earlier execution records retain their original dates.

## Received inputs and blockers

| Producer | Artifact received on main | Limit |
| --- | --- | --- |
| GM04 | FOOD_DATA_DICTIONARY, food1.1.0 schema and validator | Source/nullable/price units reused |
| GM07 | contracts.ts, B/B-supplement API schema and handoff | No core DTO/client edits |
| GM08 | import_food_data.py and handoff | Unchanged preflight rejects OCR draft |
| GM40 | dish-only dictionary, importer and sealed-manifest QA verifier | Catalogue importer also rejects OCR draft |
| GM34 | Project Done | RELEASE, CHECKS, FIGMA_PARITY and HANDOFF are on main at `5a69b56` |

GM36.1 contract/handler remain separate from core APIs. Runtime stays disabled,
provider unselected, no native/package/schema/migration/data changes. This is the
independent pipeline scope proposed for Trí’s review.

## Dish-only and legacy paths

A permitted source declaration and explicit processing consent are mandatory.
Source declaration is not proof of rights: `sourceRightsVerified=false` always.
Each draft row retains sourceRef, confidence, nullable name/price and PriceUnit.
Taxonomy, meal/cuisine/category/allergen labels are not inferred by OCR. They must
be bound/confirmed later under the catalogue dictionary; injected labels are rejected.
Unknown price/currency/unit stay null; ambiguous 35-45k/35-45.000 đ remain null even
at confidence 0.99. Explicit 35k-45k and 35000-45000 đ retain their exact amounts.

Dish-only does not require a venue/offering/coverage/schedule. GM36.1 retains the
three legacy location fields as null for wire compatibility. A curator corrects
fields and binds reviewed provenance/taxonomy into a separate catalogue bundle,
then uses the ordinary catalogue validation/staging/review flow. No automatic append,
activation, verified status or production publish exists in OCR.

Only if exporting legacy food data: bind venue/offering/coverage/hours/freshness
under the GM04/GM08 legacy contract. These checks are not dish-only prerequisites.
The standalone MenuDraft is rejected by both actual importers before DB access.

## Reproduce the supported independent checks

Node24+, Python with existing `scripts/ci-requirements.txt`, Docker, repository
npm dependencies and the existing mobile TypeScript compiler are required.
Set PYTHON/GM36_PYTHON to a Python executable with repository dependencies.

```sh
node mobile/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --lib ES2022,DOM supabase/functions/menu-ocr/index.ts
node --test tests/gm36-menu-ocr.test.mjs
python3 -m unittest discover -s tests -p 'test_gm36*.py'
PYTHON=python3 npm run qa:start -- --run-id gm36-check
GM36_PYTHON=python3 node scripts/gm36_http_check.mjs --qa-manifest .work/qa/gm36-check/manifest.json
python3 scripts/gm36_contract_check.py --draft .work/gm36-http/actual-draft.json --report .work/gm36-http/contract-results.json
npm run qa:verify -- --run-id gm36-check
npm run qa:stop -- --run-id gm36-check
python3 scripts/validate_repository.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-36 --gate merge --base-ref origin/main --verify-outputs
git diff --check
```

The HTTP runner now requires the explicit producer-owned manifest, verifies its
seal/local state/worker/ownership and Auth/REST/gateway before reading that QA's
private public-key file. It never prints credentials. Cleanup validates namespace,
anonymous IDs and QA ownership transactionally; qa:stop removes the owned runtime.
`.work/gm36-http/` contains only public assertion reports and synthetic draft data;
CI uploads explicit report files, never credentials or the producer workdir.

HTTP runs the actual Web Request/Response handler with real GoTrue JWTs through a
loopback Node server. Recognizer output remains a test double, not real OCR. Auth,
outsider, errors, timeout/quota, confidence/source/null and dish-only/import guards
are asserted; no food/room/history write is made by the OCR handler.

## Remaining acceptance

Full OCR acceptance requires the provider/native/license/privacy/quota/cost/accuracy/rights
decision and a pilot using menus with permission.
See PROVIDER_REVIEW.md. No cloud key/cost is assumed and no provider is called.
The production Deno entrypoint remains off. Deno/Edge deployment and recognition
accuracy are Not run. Android is outside the current pipeline scope per the mobile
API matrix; no screen/camera/native package is introduced to fill that gap. A future
mobile consumer needs its own agreed scope/device upload/auth/fallback checks.

The transient loopback test URL is not a phone endpoint. Future reviewed integration
must supply a reachable TLS endpoint/session and must keep auth/privacy checks.
Rollback: leave the entrypoint off and remove the independent modules/runners;
no database down migration or published data rollback is required.
