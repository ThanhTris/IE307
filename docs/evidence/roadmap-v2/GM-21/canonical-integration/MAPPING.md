# GM-21 producer → storage → reader map (Trí review Pending)

## Received mapping — 2026-10-30

Main e3f7058 includes GM20/PR143,0035/schema0.12.0/GM20.4. GM06/07/18/20 are
Done on live Project. This resolves the historical missing-input table below;
it does not authorize production activation or approve the GM21 supplement.

| Concern | Received artifact and GM21 integration |
| --- | --- |
| Authority | Existing v2/v3/B retain their sources. New B-supplement sessions pin gm06_canonical via gm20_canonical_private.sessions; no dual-write/backfill |
| Wire | Existing GM07.B-supplement schema and dish_session history/deleteHistory commands; no new fields or request version |
| Result/detail | Reuse gm20_canonical_private.result_projection and its stored final-round row map; embedded result is the same full typed terminal projection |
| Summary | GM20 supplies stable history/room/result IDs, scope, finalizedAt/createdAt, planned desiredAt, memberCount and R1 cohort |
| Winner/Top3/price | Only stored canonical cards/podium/order/versions and GM20 time adaptation; no catalogue requery or fake legacy scores |
| Participants | No retained identity projection supplied: omit optional participants, expose approved memberCount/cohort, never result_members or live nicknames |
| Consent | Start-pinned personal/group plus current grant/settings, supplied GM20 writer + GM17/GM06 predicate; late grants never rewrite a saved start snapshot |
| Revoke/expiry |0036 purges payloads when a scope is disabled/deleted or linked consent becomes invalid; receipts/result/ref survive |
| Delete | Versioned deleteHistory keeps its capability. Common delete_history also erases the authenticated canonical audience member's payload; hidden/missing IDs stay the same no-op |
| Detached consent | Reject new history_audience links with retention_detached consent; existing links remain valid after cleanup, no backfill |
| Concurrency | Reference epoch before history/audience/settings mutations, then consent row locks; actual held SQL sessions test both cleanup/link orders |
| Retention | Existing30day/caller/scope predicate and worker reused; operational room not required for retained history |
| Paging | B-supplement has no cursor: reject extra fields. Legacy get_history keeps its bounded50-row/caller-and-scope cursor contract |
| Recovery | QA down restores named prior API bodies, removes new guards/ledger, preserves data/receipts; cannot recover deleted/revoked payload |

Input/source hashes: INPUT_STATUS.json and MANIFEST.json. Received producer
[mapping](../../GM-20/canonical-writer/MAPPING.md). GM28/31 receive this server
contract; Android/cache acceptance remains consumer scope.

## Historical unresolved input map — 2026-10-27

Snapshot main1bf28d8,2026-10-27. These are observed sources and unresolved decisions,
not approval of a new authority/wire version. GM20 owns writer handoff; GM07 owns
DTO/capability; GM17 owns ACL/retention; GM21 owns reader/consent/delete integration.

## Authorities actually present

| Pinned generation | Current producer/storage/read path | Integration boundary |
| --- | --- | --- |
| Legacy v2 | gm20_private + public.results/histories and legacy history RPC | Keep original IDs/projection/consent; no invented Top3 or scores |
| Legacy dish v3 | dish_v3_private result/history behavior | Keep version routing and persisted legacy capability |
| Current v4/GM07.B | dish_v4_private.finish/save_history/results/history; public.dish_session result/history/deleteHistory | Existing API authority; schema0.9.0–0.9.2 |
| GM06.3 independent model | gm06_canonical private tables/helpers; no public reader/writer installed | schema0.10.0 proves storage exists only; GM20 adapter/version/authority not delivered |

New sessions can switch authority only through the reviewed version/capability
mapping. Do not infer it from latest schema_versions, table existence or task Done.
Existing rooms/results/history stay on their pinned authority, without backfill,
ID regeneration or an unreviewed dual write. No authority choice is made here.

## Field and lifecycle decisions required

| Concern | GM06.3 actual source/invariant | Existing B/runtime shape | Required handoff / owner |
| --- | --- | --- | --- |
| Result identity | results.result_id; BEFORE INSERT registers gm17 result_refs | v4 writer already reserves its result; events.dish_v4_result_id FK points to dish_v4_private.results | GM20/17: one registration and one ID mapping, atomic references; do not insert same registry ID twice |
| Room | results.room_ref_id retained after operational cleanup | history returns roomId | GM20/17: retain authentic room reference; no live-room join required for retained history |
| Terminal state | status/reason/terminal_round | result status/reasonCode/round | GM07/20: exact versioned DTO for DECIDED and NO_CONSENSUS; no winner fabricated |
| Winner/cards | winner_dish_id + immutable locked_pool | winner is a complete locked poolDish or null | GM07/20: map ID to the stored card, never current catalogue |
| Podium | top_dishes has dishId/score/rank/isWinner; immutable array order | B topDishes has nested dish card with score/rank/isWinner | Join by dishId against same locked_pool; preserve fixed subset, dense ties/order and winner; never recompute score |
| Score/cohort | score_version/ranking_version non-null even on NO_CONSENSUS; scored_r1_count private bound, score<=2*count | Current B terminal schema requires null score/ranking on NO_CONSENSUS and lacks a required cohort field | GM07/20: resolve storage-to-wire nullability/cohort capability; do not serialize SQL row directly or alter contract locally |
| Price | nullable metadata, observedAt; JSON null for unknown | Existing B priceReference is separately defined | GM07/40: explicit nullable/time/unit mapping; never coerce unknown to0, convert price/person or fallback to older price |
| Participant membership | result_members stores private user_id/r1_accepted; member_count/fingerprint locked | Current historyPage has no participant display projection | GM07/17: approved identity fields/consent/version; raw roster/accepted flags/preferences/ballots/seed must not become DTO |
| Times | planned_meal_at nullable, finalized_at, retain_until; histories.expires_at | Existing historyPage requires createdAt; no history created_at in independent table | GM07/20: define createdAt semantics and planned-vs-finalized projection; do not silently substitute a timestamp |
| History | histories + history_audience reference the same result; expires<=retention | Current B historyPage returns historyId/roomId/resultId/scope/createdAt/expiresAt/result | GM20/21: bind producer transaction/receipt to reader; shared summary/detail/cursor/capability artifact still missing |
| Scope consent | independent model uses exact audience consent IDs and gm21 settings; current v4 pins personal/group at start | v4 account defaults, start snapshot, no post-start retroactive grant | GM20/17: hand off each pinned scope, current revoke checks and retention references; do not infer from member flag or enabled account at read time alone |
| Delete/retry | history_receipts blocks reinsertion after payload deletion | Current deleteHistory deletes dish_v4_private only; legacy delete uses its own storage | GM21: dispatch by authenticated capability/authority, remove correct payload, retain receipts until TTL; no success that leaves new model untouched |
| Revoke/TTL | history_visible hides disallowed rows; cleanup purges invalid/expired independent payload | Existing settings revoke hook primarily targets v4/legacy | GM17/21: immediate authorization loss plus reviewed physical purge/worker chain; independent schema alone does not wire account revoke/delete APIs |
| Privacy/cache | FORCE RLS, no public grants/API; no participant DTO | Existing history/caller APIs have their own ACL | GM17/21: personal owner-only; group full locked cohort consent; cache scope/TTL/revocation, bounded cursor and safe errors from reviewed DTO |

## Concrete retention diagnostic

An added SQL regression against d433dfd created retained independent history using
room-scoped consent, ran real cleanup, verified original history still visible,
then attempted a new history for another room using those same consent IDs.
**Actual: insertion accepted**, contrary to the expected23514 rejection. The
predicate treats room_id=NULL after retention detachment like global scope.
See diagnostics/gm06-detached-consent/red-detached-consent.json and RED_REPRO.patch.
Only the private unwired model was exercised, with synthetic identities in an
owned DB; no application/API data exposure is claimed. The QA DB was removed.

Merged0032 is immutable. GM06/17/21 must review a forward fix that permits original
saved links after cleanup but prevents detached consent reuse for new histories,
including concurrent cleanup/write/revoke and transaction rollback/receipt behavior.
This is recorded as Fail, not fixed or silently replaced by a passing fixture.
