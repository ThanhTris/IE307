# PR123 — price range review fix

Review: https://github.com/ThanhTris/IE307/pull/123#issuecomment-6209239517
Published/reviewed PR head:858ef00d506435d59c5a5dfa87f5a8a2a103d6da.
Target fetched for this review:4a8cd642c8d908d9e6d2c75d19c0935a44cba042.
At execution time, tests used that PR head plus the then-uncommitted local fix.
The tested fix is now committed/pushed as91c1dac48d80bcfcfb77b39bf99de793c703bd9e.
PATCH_MANIFEST maps the original tested source bytes to this published revision;
historical logs/HTTP reports are retained without changing their execution metadata.

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

Nine workflow runs for baseline858ef00 were checked before the fix was published;
ci-published-head.json is that historical baseline snapshot. The price fix91c1dac
now has26/26 successful checks, recorded in ../revision-sync-91c1dac/ci-checks.json.
The reviewer's earlier local Docker setup limitation is a separate historical
execution scope; this local rerun completed14 HTTP groups and removed owned guests.
GM34 and actual recognizer/provider/native/license/privacy/quota/cost/accuracy/pilot
are still Pending, fullTaskComplete=false, no automatic Done/merge or review approval.
Trí confirmed the price fix at91c1dac in the follow-up comment linked in
../revision-sync-91c1dac/README.md. This is not full-task acceptance or merge approval.
