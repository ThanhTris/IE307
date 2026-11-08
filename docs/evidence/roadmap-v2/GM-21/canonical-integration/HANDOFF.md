# GM21.3 canonical history integration handoff — 2026-10-30

Owner Tâm (@HoaiTam), reviewer Trí Pending. User requested implementation30/10.
Branch codex/gm-21-canonical-history, base main/PR143 e3f7058525da14c3b147fc909511cef7c803ee7c.
The earlier blocked preparation and diagnostic were received; actual input versions
and source hashes are pinned in INPUT_STATUS.json and MANIFEST.json. No Project
status/approval or production activation is implied by the local implementation.

## Input and output

- GM06/PR136 supplies0032/GM06.3 canonical storage and retention predicates.
- GM07/PR138 supplies the closed B-supplement schema; GM18/PR139 supplies catalogue
  APIs; GM20/PR143 supplies0035/GM20.4/schema0.12.0, one authority per session and
  persisted result/history/receipt/round-row projections. All start inputs Done.
- Forward0036/schema0.13.0/GM21.3 closes revoke/common-delete/detached-consent gaps.
  Every merged migration and GM07 schema remain unchanged. No second writer,
  public model switch, backfill, new provider, package, UI or ranking rule.
- Reuse GM20 history/result reader. The embedded result equals that writer's
  persisted terminal result: R1 cohort, nullable winner, score/rank versions and
  immutable Top3/cards/price/order. NO_CONSENSUS has no fabricated winner/podium.
  Older B/v2/v3 stay on their pinned readers.
- Revoke/invalid consent purges affected canonical payload, retaining receipt and
  result/ref. Common delete_history supports authenticated canonical audience IDs
  as well as its old behavior. Versioned deleteHistory keeps its capability route.
  Retry/re-enable/reconnect never recreate removed payloads.
- New audience links cannot use detached consent; original retained links stay
  readable. Epoch/consent locks protect cleanup/write/revoke. The consent wrapper
  restores its prior trusted v4 guard on return/error.

## Reproduce on disposable QA

Use the existing root npm lock, Python scripts/ci-requirements.txt, Docker and
received GM03/GM20 lifecycle. A new namespace/config/ports54361/54362, owner marker
and actual guest Auth/REST/worker are created, not the application project.

```sh
npm ci
python -m pip install -r scripts/ci-requirements.txt
python scripts/gm21_canonical_check.py
# Retain only owned QA for manual requests:
python scripts/gm21_canonical_check.py --keep
python scripts/gm21_canonical_check.py --against --keep
python scripts/gm21_canonical_check.py --cleanup
```

Docker Desktop uses the inherited documented GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1
local opt-in if CLI reports wildcard bindings; actual bindings are recorded.
Do not use that opt-in for a shared/remote deployment. Ownership checks remain
mandatory. The runner never resets/migrates the app DB or reads its credentials.
Private control/JWT/environment stays under ignored .work; cleanup verifies labels.

Reports: .work/gm21-canonical/http-results.json, dish-v4-api-results.json,
sql-parity.json and runtime report. Sanitized copies/counts/source hashes are in
this evidence folder. CHECKS.md and TEST_MATRIX.md separate server/device work.
The inherited helper has optional internal suite/callback/report paths; default
GM20 command, guards and assertions remain unchanged and are regression-tested.

## Consumers, limits and recovery

GM28/31 receive [requests](../../../../../supabase/tests/http/GM-21-canonical.http),
the unchanged [schema](../../../../architecture/schemas/dish-session-v4b-supplement.schema.json)
and [mapping](MAPPING.md). No retained participant-name snapshot was supplied:
omit optional participants rather than infer identity consent or use live names.
Supplement history has no cursor; legacy get_history retains50-row keyset paging.
Unsupported supplement fields remain explicit errors. No advanced ranking rule.

Android/logout/cache/transport require consumer GM25/28/31 evidence with a reviewed
reachable endpoint/build/device. No native/Android/FE pass is inferred from local
HTTP, parity, CI configuration or schema checks. Loopback54361 is the QA host,
not a phone endpoint. No production/key/TLS workaround is provided.

0036 down is QA-only: restores prior bodies/removes new triggers/ledger, retains
remaining result/receipt/history data, cannot recover deleted/revoked payload.
A retained/shared deployment needs ledger/definition inspection, reviewed backup/
release plan and Trí approval. Keep new-session creation off until separately
approved. No app migration, automatic commit/push, external comment or Done write.
