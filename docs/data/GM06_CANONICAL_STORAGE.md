# GM06.2 — Canonical result/history storage supplement

Owner Tâm; final reviewer Trí, Pending. Storage identity `GM06.2-canonical-storage`,
schema ledger0.9.0, migration0027. Target baseline a31f403 (2026-10-25).
Product rules: ADR-019/020 and UI_BE_DATA_SYNC_HANDOFF_2026-10-25.
GM07.B is still proposed. This is a private SQL producer interface, **not a v4 API
or policy release**. No transport/DTO consumer, score calculation or v4 room is
created. No existing migration/seed/core DTO or v2/v3 decision function is edited.

## Ownership and storage mapping

All new objects are in `gm06_canonical`, outside exposed REST schemas. Eight tables
have ENABLE+FORCE RLS and no grants for anon/authenticated/service_role/publisher.
No public RPC exposes them, including raw preferences, participant IDs or R1 flags.
GM17/18/19/20/21 must add reviewed caller authorization, versioned commands and DTOs;
being a room host never grants access to another person's raw choices.

| Object / field | Stored meaning / constraint | Producer / consumer |
| --- | --- | --- |
| results.result_id | PK + shared gm17_private.result_refs identity; BEFORE INSERT reserves registry ID, rejects collision, no legacy public.results row | GM20 persists; GM21/23 reference |
| results.room_ref_id | UNIQUE retained room_refs FK, not operational room CASCADE | GM19/20; survives room cleanup |
| catalogue_id/catalogue_sha | Existing dish_v3_private.catalogues FK + exact source hash; locked dish UUID/name must belong to that immutable release | GM40 supplies release/expanded projection; GM18 locks cards |
| storage/policy/score/ranking versions | GM06.2 / dish-decision-v4/ADR-019-30PCT-MIN1 / want2-ok1-round1-v1 / score-desc-dense-rank-v1 | Explicit future-version integration only |
| locked_pool |10–20 unique canonical dishId/roundDishId cards, closed display fields, nullable description/artwork/temperature/flavor/price; IDs/labels/meal slots retained | GM18/19 supply lock; GM20 preserves |
| top_dishes | Ordered1–3 `{dishId,score,rank,isWinner}` entries referencing locked_pool; descending integer scores, dense ties, exactly one winner at rank1 | GM15/20 calculate eligible scores, cutoff/subset and winner; storage validates persisted shape/invariants |
| status/reason/terminal_round/winner_dish_id | DECIDED R1 UNANIMOUS_WANT or R2 ACCEPTABLE_FINAL; NO_CONSENSUS R1 EMPTY_INTERSECTION or R2 ALL_REMOVED, winner NULL and empty podium | GM20; no fake dish/winner |
| member_count/member_fingerprint |2–20; immutable SHA256(resultId + colon + comma-joined lexically sorted lowercase UUIDs); deferred count/fingerprint check prevents changing the authorized roster | Trusted GM20 transaction, never client input |
| scored_r1_count |1..member_count; score <=2*count; matches result_members.r1_accepted count at insertion | GM20 supplies ACKed complete R1 cohort; does not use R2 submittedCount |
| meal_slot/planned_meal_at/finalized_at | Meal context, nullable intended meal time and distinct finite actual finalization time | GM19/20; GM21 reads stored values |
| retain_until | Greater than finalized_at, at most30 days; no automatic extension | GM17/21 retention policy |
| result_members | Normalized result/user FK to auth.users; private r1_accepted; immutable UPDATE, deferred initial roster/cohort checks; account deletion cascades identity links | Trusted producer only; no per-person contribution exposed |
| histories | References same result, never recomputes cards/points; personal owner or group owner=NULL; finite expiry <=result/consent retention enforced | GM21 private writer/DTO integration Pending |
| history_audience | Normalized result/member/consent FKs; personal one owner, group exact2–20 stored members, every consent active for same scope/room or global and granted before finalization | GM17/21 authorize; no automatic opt-in |
| history_receipts | UNIQUE NULLS NOT DISTINCT(result,scope,owner); retained after delete/revoke; same recording cannot be inserted again until result TTL purge | Anti-resurrection storage, concurrent insert serialized by UNIQUE |
| account_preferences | Per-user defaults, explicit arrays/null/budget/avoid_recent; version increases exactly1; no ranking side effects | GM18 + GM17 owner-only API |
| room_preferences | Independent per-member copy with source_account_version, editable only while member in LOBBY; account edits do not rewrite it; room/member cleanup cascades copy only | GM18/19 snapshot and own-caller API |
| price_observations | Existing catalogue + dish UUID membership, nullable amount/currency/unit/source/serving_size/observed_at; immutable observations, separate from locked terminal card | GM40 importer adapter Pending; GM18 selects before lock |

Member fingerprints and receipt owner UUIDs are private bounded retention metadata;
no raw ballot, seed, GPS, source document, password/token or per-user score is stored.
Stored podium is not proof of correct voting/eligibility/tie cutoff: those require
GM15/20 parity and actual producer transactions. `result_members` insertion checks
must complete in the same transaction as the result; do not commit an empty roster.
Parent write_xid is set by trusted triggers; new member/audience inserts are rejected
outside the parent transaction, preventing replay from reattaching deleted children.
Deleting identity links for privacy cannot authorize replacement UUIDs: fingerprint
checks reject a substitute roster. Remaining history visibility fails closed when
required audience/consent links disappear.

## Cards, nullable price and contract boundaries

Closed card keys: roundDishId,dishId,name,description,mealSlots,cuisineIds,
cuisineLabels,categoryIds,categoryLabels,temperature,flavor,artwork,priceReference.
Flavor reuses GM07.B's four nested present/intensity objects and GM04 consistency.
Budget uses `{maximum,currency,unit}`. Artwork uses uri/altText/attribution; GM40 must
verify display rights before supplying it. Storage shape checks do not grant rights
or invent taxonomy labels, photos, source evidence or meal coverage.

Stored `priceReference` has amount/currency/unit/sourceRef/servingSize nullable and
finite timezone-qualified observedAt. No conversion to per-person units. Its
observedAt/nullable metadata follow the newer owner requirement, while proposed
schema B still uses checkedAt/non-null fields. GM07 must resolve the wire mapping
before integration; **do not change B or silently treat this storage as a B DTO**.
Typed observations permit unknown timestamp=NULL, which is excluded from selection.
`latest_price(release_id,dish_uuid)` returns SQL NULL if no valid timestamp, the
newest amount is NULL, or multiple newest observations share the same instant.
It does not fall back to older rows. Other metadata remains explicit JSON null.
A locked result never calls this selector again. No importer/dataset is modified.

## Trusted transaction and read examples

GM20 must compute and validate the real eligible result, reserve the canonical UUID
and persist the room state, storage and history/outbox atomically. GM06 does not
install that writer or accept arbitrary client-supplied scores/consent IDs.

```sql
-- Trusted DB producer, after caller/state/version/consent validation:
begin;
-- INSERT gm06_canonical.results (...) with locked source/version and exact podium.
-- INSERT gm06_canonical.result_members(result_id,user_id,r1_accepted) for each member.
-- GM21 may insert histories + audience from active consent, not a supplied opt-in.
set constraints all immediate;
commit;

-- Private internal checks; not grants/RPCs. Never accept client viewer or clock.
select gm06_canonical.history_visible(:history_id, auth.uid(), statement_timestamp());
select gm06_canonical.latest_price(:catalogue_id, :dish_id);
-- Only AFTER visibility=true, authorized producer joins histories -> results,
-- resolves podium dishIds from that row's locked_pool; never current catalogue.
```

No group identity/participant display DTO is introduced here. GM17/21 must review
allowed “Cùng ăn” fields and personal/group read semantics with GM07, and must use
current consent/settings at request time (not merely the finalization-time check).
Legacy winner-only histories remain unchanged; no fake0 scores/Top3 backfill.

## Retention bridge and locking

Migration renames the previous gm17_private.cleanup to
cleanup_before_gm06_canonical, retaining its body, and adds a narrow security-definer
wrapper (fixed pg_catalog search_path, no client execute). It takes the same advisory
lock170017 and reference_epoch lock, purges invalid/expired new histories, then expired
canonical results, detaches only consents needed by retained canonical history, and
calls the existing cleanup chain. New BEFORE DELETE hooks retain shared room/result
registry IDs and active consent metadata while referenced. They do not keep raw rooms,
ballots, sessions or preferences. Unreferenced/invalid consent follows existing cleanup.
History visibility checks live enabled/revoked/expiry/scope/owner/settings and exact
audience; FK deletion or revoked consent hides the row immediately, before purge.
Receipts remain until the result TTL so replays cannot recreate deleted entries.

This bridge changes retention behavior for new rows and needs Trí/GM17 review.
It is exercised by actual cleanup SQL, not an assertion that v4 is deployed. Existing
v3 worker source verification still passes; no scheduler or worker service is installed.
Keep transaction order reference_epoch -> rooms -> canonical rows consistent with
upstream. Retry whole transactions for40001/40P01; handle23505 exact retry without
reroll/upsert of a terminal projection. Do not catch arbitrary integrity failures as
success. Schema constraints cannot validate actual votes/eligibility or full consent
protocol on behalf of the future security/API producers.

## Upgrade, backup and rollback

1. Inspect intended DB migration ledger plus deployed definitions, schema and source
   hashes; health/pull/schema_versions alone is insufficient. Confirm no draft objects
   collide with gm06_canonical or cleanup_before_gm06_canonical. Stop if there is drift.
2. Before applying to any retained/shared DB, owner approves a backup/reconcile plan:
   snapshot schema+data and restore-check; record0026, consent/registry/cleanup and
   catalogue hashes, expected storage version and downstream producer versions.
   This task runs **only namespace-owned QA**, not that application migration.
3. Apply0027 in one transaction. It adds storage and the retention bridge; it does
   not migrate/backfill old sessions/results or activate a v4 route. Verify function
   bodies, FORCE RLS, no grants, registry edges and populated upgrade assertions.
4. Rollback operationally by leaving v4 producers disabled and keeping retained rows.
   The SQL down file is for disposable QA only and refuses nonempty canonical,
   preference or observation data. It restores the prior cleanup name/body, removes
   only own hooks/objects/ledger, no CASCADE to producer tables or deletion of shared
   registry IDs. Remove future consumers first; dependencies make unsafe down fail.

Reproduce with existing Python3.11+/Docker local PostgreSQL17; no package changes:

```sh
npm run backend:start
python3 scripts/gm06_canonical_check.py --report /tmp/gm06-canonical-results.json
python3 scripts/dish_policy_sql_check.py
npm run backend:stop
```

Runner copies auth.users **DDL only**, uses a random database with its UUID marker,
applies old migrations then fresh/upgrade/down/reapply0027, executes actual SQL,
checks permissions/invalid rows/cleanup/receipt race and drops only its owned DB.
Real fixtures are synthetic; no production catalogue/source/ballot proof is implied.
GM06 is a data-schema task: new HTTP/native tests are N/A until producer APIs exist;
baseline v3 HTTP/SQL regression is recorded separately from v4 integration (Not run).
