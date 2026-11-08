# GM20.4 — writer → canonical storage → reader mapping

Candidate requested by Vinh; Trí reviews before integration. One result authority
per session, not two definitions of canonical. [ADR021](../../../../architecture/decisions/ADR-021-versioned-canonical-writer.md).

| Concern | B / existing v2/v3 | New B-supplement |
| --- | --- | --- |
| Admission/version pin | Existing routing/operational rows | Extra private capability row created in same transaction as room; no conversion of existing rooms |
| Ballot source | Existing ACKed rows | Shared private v4 complete ballots, roster and locked pools; isolated new-wire ACK table |
| Authority | Existing result/history tables | gm06_canonical.results only; no insert into dish_v4_private.results |
| resultId | Existing returned UUID | Secure generated UUID; canonical registry trigger alone inserts shared result_refs; same UUID in API/history/outbox |
| Room ref | Existing model | Canonical room_ref_id→gm17_private.room_refs, independent of operational room lifetime |
| Catalogue | Existing pinned release/hash | Same immutable ID/hash from locked session, checked by canonical registration trigger |
| Locked cards | Existing result projection | Initial10–20 full cards in canonical.results.locked_pool; no current catalogue read during projection |
| R2 row IDs | Existing locked R2 pool | Private immutable result_round_rows maps stable dishId to final roundDishId; survives operational room cleanup |
| R1 cohort | Existing baseline labels | ACKed complete R1 ballots only→scored_r1_count and result_members.r1_accepted; public round1BallotCount is not R2 submittedCount |
| Participants | Locked roster |2–20 auth FKs, fingerprint SHA256(resultId:comma-separated sorted lowercase UUIDs); normalized atomic result_members |
| Winner/points/ranks/order | Existing persisted baseline | SQL kernel parity GM15.3; canonical top_dishes plus winner_dish_id; sorted/dense Top3 persisted once |
| Tier | Existing private field | Derived deterministically from persisted winner score and R1 cohort when needed; no raw vote recount or new public field |
| NO_CONSENSUS | Existing baseline | Canonical status/reason, null winner, empty podium; internal fixed score/rank labels project to public nulls |
| Seed | Existing behavior unchanged | Separate pgcrypto terminal seed, private FK record; never poolSeed/client entropy/public metadata |
| Consent/history | Existing logic | Locked per-scope snapshot plus current enabled/nonrevoked/unexpired consent granted before start; canonical receipts/audience same transaction |
| History read/delete | Existing command source | Existing B-supplement DTO; live history_visible predicate; physical payload delete leaves receipt; retry never rewrites history |
| Event delivery seam | Existing public event/inbox FKs | Private terminal_outbox + normalized audience FK; minimal ID/status/contract/version only; GM23 consumes, no network/push inference |
| TTL | Existing rules | Canonical result<=30d, scoped history expiry<=consent/result, ACK24h, outbox7d; existing GM17 cleanup handles canonical retained payload |

## Operational bridge and compatibility

The old session contract_version/result_id constraint and its v4 result FK are not
relaxed. New capability is the authoritative routing pin, its result_id references
canonical storage, and the legacy operational result_id remains null for that
capability. Public new snapshot/result/finalize ACK read the canonical pin. All
operational room/user IDs and public final-round IDs are unchanged.

Original public/B finisher and tick bodies are retained under private aliases;
wrappers route by the capability. Direct execute on public-schema legacy aliases
is revoked. Old wire cannot read/write new rooms, nor can new wire reinterpret
old rooms. Separate ACK namespaces prevent a same requestId from upgrading an old
create ACK into a new storage capability. Reads for already-pinned new sessions
continue when the server flag blocks new creation.

## Card and time adaptation

B wire price has checkedAt and strict known metadata; canonical storage uses
observedAt and permits unknown metadata. Convert only that timestamp name, retain
amount/currency/unit/sourceRef/servingSize verbatim and validate the closed card.
Unknown price remains JSON null. No averaging, conversion to price/person, fallback
to earlier observations or catalogue reselection. Add explicit null attribution
only when the B artwork field is absent; no license/right is inferred by adapter.
R2 projection substitutes its saved row ID into the same immutable initial card.

## Privilege / transaction boundary

Every new private table has ENABLE+FORCE RLS and no client/service-role grants.
Public wrapper is authenticated, fixed pg_catalog search_path; caller/room/round/
pool/version/expiry checks stay server-side. reference_epoch precedes room/session
locks. Canonical deferred member/history triggers retain their bodies and fixed
path but run SECURITY DEFINER, because commit happens after the RPC definer frame
returns. This avoids granting private schema access to authenticated callers.

Canonical parent, members, final row map, private seed, scoped histories/receipts/
audience, outbox/audience, room terminal state and request ACK commit or roll back
together. Existing register_result owns the sole registry insert. Result/history
readers reconstruct only from immutable canonical storage + retained row map;
raw matrices, seed, per-user R1 flags and tie/eligible sets are never public DTOs.

GM21 receives result_projection, canonical history writer and visibility/receipt
rules; GM23 receives terminal_outbox/audience. Those are producer seams, not a
claim consumers/Android or actual push delivery are integrated. Human authority/
ACL review and Project Done remain pending on this candidate revision.
