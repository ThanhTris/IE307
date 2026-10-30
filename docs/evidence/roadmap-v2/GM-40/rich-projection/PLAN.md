# GM40.2 — adopt delivered GM18.2 projection

Owner Vinh, reviewer Trí. Start READY_TO_START from live Project. Base main
 e3f7058 includes GM20#143; GM40's Data gate remains GM04/06/07/08/18 only.
Received GM18#139/0033/schema0.11.0, dish-catalogue/roadmap-v2/GM-18.2,
import_gm18_catalogue.py and GM07 B/supplement schemas. No SQL/API changes.

Keep source profile1.0.0/dataset1.1.0:39 IDs,18 GM08 IDs,247 observations,
151 evidence rows,216/2/1 mapping, exact bundle/manifest hashes and legacy importer.
Add explicit Data build/stage/validate/readback/activate adapter to the received
rich importer, separate :gm18.2 release; stable projection checksum, schema/template,
meal/term coverage and unknown/price diagnostics. No labels or prices invented.
Source provenance rules and runtime nullable fields are separate documented layers;
no unreviewed relaxation of source1.0.0 or change to received RPC/schema.

Extend owned GM40 QA after its preserved legacy/snapshot checks: rich stage/import/
no-op/conflict/rollback/restore, authenticated get_dish_catalogue/preview_dish_pool
against their received schema,39 exact cards/labels/prices, real meal shortage,
source-null/tie/unknown fixture coverage, locked legacy snapshot/result unchanged.
No app DB reset/migration, credentials in evidence or production activation.

Unit negative admission/staging/checksum tests; two offline builds; full Python,
repository/index/diff and relevant SQL/HTTP regression. Update dictionary, forms,
HTTP examples, CHECKS/HANDOFF, AGENTS pointer and hashes with actual outputs.
Publication resumes the earlier user request to implement issue125 and create a
normal review PR after dependencies. No automatic merge, Project status/Done or
reviewer approval.
