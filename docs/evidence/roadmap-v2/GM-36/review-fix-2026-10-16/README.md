# PR123 — price range review fix

Review: https://github.com/ThanhTris/IE307/pull/123#issuecomment-6209239517
Published/reviewed PR head:858ef00d506435d59c5a5dfa87f5a8a2a103d6da.
Target fetched for this review:4a8cd642c8d908d9e6d2c75d19c0935a44cba042.
Current tests execute that PR head plus the uncommitted local fix; no new commit
SHA is invented. PATCH_MANIFEST identifies exact tested source bytes. The original
published implementation is already committed/pushed; only this fix is not.

Before fixing, added regression produces48 tests:40 Pass /8 Fail. It reproduces
both parseVndPrice output and normalizeDraft price/source claims for35-45k,
35-45.000 đ and plain/grouped equivalents. After fixing:48/48 Node Pass.
A bare positive endpoint below1000 beside an amount>=1000 is conservatively unknown;
no suffix/multiplier is inherited. Zero remains zero because scaling cannot change it.
Explicit35k-45k /35000-45000 đ and full35000-45k keep35000..45000.

HTTP now runs14 real GoTrue/Web-handler groups, including confidence0.99 ambiguous
ranges retaining priceMin/Max/currency/unit/fieldSources.price=null and
PRICE_UNKNOWN_OR_AMBIGUOUS. Explicit controls keep the known price/source.
The recognizer remains a test double; no actual OCR or Edge runtime is claimed.
Actual HTTP draft schema/semantic checks and unchanged GM08 direct-import rejection
are rerun. TypeScript, Python feature/regression and repository/index/diff checks
are recorded. Core config, providers, packages, schema and datasets are unchanged.

Reproduce:

```sh
node --test tests/gm36-menu-ocr.test.mjs
node mobile/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --lib ES2022,DOM supabase/functions/menu-ocr/index.ts
python3 -m unittest discover -s tests -p 'test_gm36_menu_ocr.py'
npm run backend:start
GM36_PYTHON=python3 node scripts/gm36_http_check.mjs
python3 scripts/gm36_contract_check.py --draft docs/evidence/roadmap-v2/GM-36/http/actual-draft.json --report /tmp/gm36-review-contract.json
npm run backend:stop
```

Nine workflow runs for published858ef00 were checked and were successful;
ci-published-head.json records those IDs. They do not prove CI for this local fix.
The reviewer's earlier local Docker setup limitation is a separate historical
execution scope; this local rerun completed14 HTTP groups and removed owned guests.
GM34 and actual recognizer/provider/native/license/privacy/quota/cost/accuracy/pilot
are still Pending, fullTaskComplete=false, no automatic Done/merge or review approval.
Trí must review the new pushed revision after the user commits and pushes.
