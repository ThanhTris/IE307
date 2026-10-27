# GM06.3 — Independent canonical storage and v4 compatibility

Owner Tâm; reviewer Trí (Pending). PR136 follow-up to a7f54d8 on main79eb0b9,
2026-10-27. Forward migration0032, storage contractGM06.3-canonical-storage,
private schema ledger0.10.0. Published0027/GM06.2 is superseded before merge;
no applied/merged migration is edited and no ledger conflict is suppressed.

## Runtime authority and integration boundary

**Existing `dish_v4_private` is the authority for the v4 API.** Main migrations0027
through0031 implement the v4 writer, persistent results/history, account defaults,
room preferences and account-consent scope pinning. Its runtime contract remains
GM07.B and ledger versions0.9.0/0.9.1/0.9.2. The additional0.10.0 row does not mean
that API version changed or that v4 writes now use the independent model.

| Actual producer / artifact | Authoritative storage | Consumer |
| --- | --- | --- |
| `public.dish_session` → `dish_v4_private.dispatch/finish` | `dish_v4_private.results` with immutable-by-protocol result projection/Top3 | v4 result command and event references |
| `dish_v4_private.save_history` from0029 | `dish_v4_private.history`, pinned consent scopes and saved result projection | v4 history/deleteHistory commands; revoke trigger on gm21 settings |
| v4 updateDefaultPreferences/updatePreferences | `dish_v4_private.default_preferences/room_preferences` | Existing versioned own-caller preference/snapshot commands |
| Catalogue installer GM40 | `dish_v3_private.catalogues`, immutable release/hash | Existing v3/v4 pool/card producers |
| Independent GM06.3 SQL model in0032 | `gm06_canonical` private tables/helpers | No API writer or consumer is installed or redirected by this PR |

V4 event references use public.events.dish_v4_result_id -> dish_v4_private.results.
The independent model reserves its own IDs in the existing gm17 result/room registry;
**those are not aliases/mirrors of v4 result IDs**. No live v4 result, history,
preference or consent is copied/backfilled into gm06_canonical. Legacy v2/v3 and
already stored v4 projections stay pinned. Do not serialize SQL rows as a B DTO.

Integrating the independent model needs a separately reviewed ownership/adapter and
versioned migration plan with GM07/17/18/19/20/21/40: select one result authority,
map IDs/FKs/consent/retention/wire fields, prove atomic writer/readers, and preserve
stored results and opt-outs. This PR does **not** claim that integration is complete,
that all GM06 task acceptance is approved, or that v4 production is deployed.

## Independent SQL interface

All eight tables in gm06_canonical have ENABLE+FORCE RLS, no client/service-role/
publisher schema/table/function access, and no public RPC. Host status does not
grant access to another user's raw preferences or private R1 acceptance metadata.

| Table / field | Storage invariant |
| --- | --- |
| results | Reserved registry UUID, retained room_ref, exact existing catalogue ID/hash; GM06.3/policy/score/rank version labels; finite planned/final times, bounded <=30-day retention |
| results.locked_pool |10–20 unique lowercase dishId/roundDishId cards; closed fields, explicit unknowns; source dish/name must exist in pinned catalogue |
| results.top_dishes |1–3 ordered dishId/score/rank/isWinner rows; descending integer score <=2*scored_r1_count; dense ties and one included rank1 winner |
| result status | DECIDED R1 UNANIMOUS_WANT or R2 ACCEPTABLE_FINAL; NO_CONSENSUS R1 EMPTY_INTERSECTION or R2 ALL_REMOVED, winner NULL and empty podium |
| result_members |2–20 normalized auth-user FKs and private r1_accepted flags; count/scored count/fingerprint checked at commit; member insert only in parent transaction |
| histories/history_audience | Same retained result; personal owner or group2–20 exact audience, scoped active consent granted before finalization; no fake dish/winner for no-consensus |
| history_receipts | UNIQUE NULLS NOT DISTINCT(result,scope,owner); survives payload deletion/revoke until result TTL; concurrent exact recording accepts one; audience insert only in parent transaction |
| account_preferences/room_preferences | Separate explicit defaults and per-room copies; nested flavor, comparable budget.maximum/currency/unit, unknowns; version increments, membership/LOBBY constraints; no ranking side effect |
| price_observations | Existing catalogue/dish membership; amount/currency/unit/source/serving size/timestamp nullable; append-only updates; selector below |

Member fingerprint: SHA256(resultId + ':' + comma-joined sorted lowercase user UUIDs).
write_xid is assigned by parent triggers; replay cannot append/rebind deleted roster
or audience rows in another transaction. Account-deletion cascades remove identity
links; missing required audience/consent makes history visibility fail closed.
The model stores no raw votes, per-user points, seed, GPS or auth credentials.

Card keys: roundDishId,dishId,name,description,mealSlots,cuisineIds,cuisineLabels,
categoryIds,categoryLabels,temperature,flavor,artwork,priceReference. Unknown values
stay null/empty arrays; no inferred taxonomy/meal coverage or invented artwork.
GM40 must verify display rights before providing artwork. Shape checks do not grant
rights or prove vote calculation/eligibility/cutoff correctness; those are producer ACs.

## Strict price validation and selection

SQL NULL is invalid validator input. JSON null is a valid unknown price. An object
must have exactly amount,currency,unit,sourceRef,servingSize,observedAt. The first
five can be JSON null; observedAt must be a finite timezone-qualified timestamp.
An empty object, each missing field, wrong types and extra keys return boolean false.
Key-set comparisons use IS DISTINCT FROM; callers and CHECKs require IS TRUE so
SQL NULL cannot bypass nested card or terminal validation. Adjacent card/podium/
preference inputs follow the same fail-closed boundary.

The independent stored price uses observedAt and nullable metadata according to the
owner's rule. Any difference with the actual B wire priceReference must be resolved
by GM07/GM40 before wiring it to an API. Existing B/runtime DTOs are not rewritten.
`latest_price(release_id,dish_uuid)` ignores timestamp=NULL; no valid timestamp,
latest amount=NULL, or a newest-timestamp tie returns SQL NULL with no fallback.
Other metadata remains explicit JSON null. Never convert portion/group/item/kg/menu
price into per-person price. Locked terminal cards never reselect a current price.

## Trusted use and privacy

```sql
-- Independent SQL model only; this is not the actual v4 writer.
begin;
-- Trusted producer inserts results with exact pinned source/version and fixed podium.
-- Insert all result_members(result_id,user_id,r1_accepted) in the same transaction.
-- A reviewed history writer may insert histories + all consent-bound audience rows.
set constraints all immediate;
commit;

-- Private predicates, no grants/RPC. Future wrappers must supply auth.uid()/server time.
select gm06_canonical.history_visible(:history_id, auth.uid(), statement_timestamp());
select gm06_canonical.latest_price(:catalogue_id, :dish_id);
```

Only after a true live visibility check may a reviewed reader return a safe history
DTO joined to that result's locked projection. No participant display DTO or current
catalogue recomputation is installed. Legacy histories are not backfilled with fake
points/Top3. Actual v4 result/history commands continue reading dish_v4_private.

## Retention bridge

The migration preserves the prior gm17_private.cleanup body by rename and adds a
narrow wrapper (SECURITY DEFINER, fixed pg_catalog search_path, no client execute).
It takes the same170017 advisory/reference_epoch locks, purges invalid/expired
independent histories/results, detaches only needed consent metadata, then runs the
existing cleanup chain. V4's writer guard is enabled for that call and restored to
its previous setting, so shared cleanup can remove operational v4 rooms too.
Own BEFORE DELETE hooks keep shared registry/active consent rows only while the
independent retained histories still reference them. Raw operational rooms/sessions/
ballots and room preference copies do not become history payloads.

Actual v4 result/history/default preference/consent rows are not rewritten by0032.
SQL upgrade fixtures create DECIDED/group20 and NO_CONSENSUS results through the
existing v4 RPC **before**0032, compare saved rows and actual result/history reads,
then exercise operational cleanup, revoke, delete and exact terminal replay. V4
history remains the authorized readback route after room cleanup; the result command
still has its existing live-room membership boundary. The bridge requires Trí/GM17
review and is not a new consent/participant API or a source of v4 business rules.

## Upgrade and rollback

Inspect the target's real migration ledger, function definitions and catalogue hashes;
health, git pull or schema_versions alone cannot prove deployment. Before applying
on any retained/shared DB, obtain the owner-reviewed backup/restore/reconcile plan
and ensure there are no draft collision objects. This task changes QA DBs only.

0032 is forward-only after0031;0.10.0 is distinct from v4 ledger0.9.0–0.9.2. Never
edit merged migrations or use ON CONFLICT to hide identity collisions. For operational
rollback leave v4 routing unchanged and retain any independent data while a future
adapter is disabled. The QA-only down file refuses nonempty independent storage,
preferences or prices, restores the prior cleanup body/name, removes only own hooks/
objects/ledger and retains shared minimal registry IDs. Future downstream dependencies
must be reviewed/removed first; no CASCADE into unrelated producer storage.

Reproduce using existing local Docker/PostgreSQL17 tooling:

```sh
npm run backend:start
python3 scripts/gm06_canonical_check.py --report /tmp/gm06-canonical-results.json
python3 scripts/gm06_isolated_http_check.py --report /tmp/gm06-isolated-http-results.json
python3 scripts/dish_policy_sql_check.py
python3 scripts/gm06_schema_check.py --report /tmp/gm06-legacy-results.json
npm run backend:stop
```

The runner uses a random marker-owned template0 DB, copies only auth DDL, applies
main migrations, tests populated upgrade, strict regressions, retention/races/down,
and drops only its own DB. The HTTP runner starts separate PostgreSQL/PostgREST
containers on a new internal network, using new random QA credentials and no host
ports; it reads no existing service credentials. It applies all migrations and
calls the actual v4 HTTP RPC using synthetic auth identities/JWTs. This verifies
PostgREST authorization/readback, not GoTrue signup or Android. The GM03 full-stack
QA attempt on this macOS environment stopped at its strict loopback-binding guard;
that failed attempt is recorded separately and is not presented as an Auth pass.
