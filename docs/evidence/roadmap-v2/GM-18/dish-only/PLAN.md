# GM-18 dish-only supplement — 2026-10-29

Owner Tâm, reviewer Trí Pending. User requests implementation. Branch
codex/gm-18-dish-catalogue, base main40feb9b (PR138/GM07 Done). Start gate
READY_TO_CLAIM; GM06/07/08/17 inputs Done and artifacts on target.

Scope: additive authenticated get_dish_catalogue/preview_dish_pool RPCs with an
explicit GM18.2 contract, exact10–20 count/shortage and meal-only eligibility;
new opt-in rich projection/loader using existing validated GM40 source and the
same immutable dish_v3_private.catalogues authority. Keep legacy offering APIs,
v2/v3/v4 routing and stored room/result projections unchanged. New release suffix
pins projection revision, never overwrites existing GM40 IDs/hash/cards. No new
provider/package, client/UI, production publish or app DB migrate/reset.

Projection uses source taxonomy ID/code/label/version and nullable flavor/temp;
latest valid source checkedAt maps to observedAt (no clock refresh), newest null
amount or timestamp tie hides price; no currency/unit conversion. Existing B wire
has stricter price metadata: unrepresentable observations remain unknown on B,
with selected nullable metadata in GM18's explicit projection. No made-up fields.

Preference ranking is advanced and UNSUPPORTED here, as already advertised by v4;
validated own preferences are neutral and do not filter or lower the pool count.
Account defaults/per-room snapshot remain the existing v4 authority and are tested
through its real RPC. No unreviewed aggregation, recent penalty or ballot changes.

Test plan: pure projection tests; fresh all-migration PostgreSQL+real HTTP in a new
internal network with new QA credentials; actual39-dish draft import/readback,
10..20 and shortage/invalid/unknown/auth/rate/privacy cases, real v4 create/start/
result locking with enriched cards; legacy functions/migrations/source hashes and
existing GM18 parity regression; new RPC grants/down; full Python/repo/index/diff.
Fixtures separate from real draft and neither is verified/production. Capture
actual expected/actual/versions/hashes and cleanup. Final Trí review/Done Pending;
no automatic commit/push or external comment.
