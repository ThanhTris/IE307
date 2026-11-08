# GM21.3 producer-driven acceptance matrix — 2026-10-30

Source: issue82 comment6438979028 and received GM07.B-supplement/GM20.4 mapping.
Exact commands, source hashes, environment and counters are in CHECKS/HANDOFF and
MANIFEST. The result embedded in history is the full detail projection; no invented
new detail endpoint, identity field, paging parameter or legacy score is introduced.

| ID | Case / required assertion | Actual evidence/result |
| --- | --- | --- |
| C01 | Actual create/start/finalize→result→history uses same authority/resultId/winner/Top3/cohort/versions/order | Pass80 consumer +125 producer HTTP checks |
| C02 | Activate changed synthetic catalogue; locked card/price/order unchanged | Pass consumer immutable history comparison |
| C03 | R1/R2 DECIDED, EMPTY_INTERSECTION, ALL_REMOVED; no-consensus null winner/empty podium | Pass consumer real terminal cases |
| C04 |2/20 members; host/member/outsider and personal owner isolation, private fields absent | Pass consumer + closed GM07 schema |
| C05 | Missing/personal-only/group-only/partial/full consent, independent scopes | Pass consumer and baseline B |
| C06 | Late opt-in never authorizes earlier start; revoke before finalize affects only scope | Pass actual producer lifecycle |
| C07 | Revoke after finalize, before/after room cleanup: immediate payload purge, other scope/ref/result preserved | Pass consumer SQL readback and HTTP |
| C08 | Common/capability delete, exact retry, terminal replay, delete after cleanup: receipt prevents resurrection | Pass consumer; actual ACK/state assertions |
| C09 | New link using detached consent rejects23514; original retained link remains readable | Pass both SQL order cases; historical negative report retained |
| C10 | Real cleanup/link race in both lock orders plus concurrent HTTP finalize/revoke | Pass consumer; actual pg_stat_activity Lock observation, rollback leaves no receipt/audience |
| C11 | Fault after canonical/history/ref writes, retry persists exactly once | Pass full producer regression with controlled terminal-outbox trigger fault |
| C12 | Retained room cleanup, before/at/after retention cutoff, expired consent | Pass consumer predicate boundary + actual cleanup/expiry; legacy47 covers aged history |
| C13 | Existing legacy bounded50/cursor no overlap, reject foreign/invalid cursor; supplement rejects unsupported cursor | Pass legacy47 + consumer; supplement has no paging in supplied wire |
| C14 | Existing B/v2/v3 retain routes/IDs/projections; canonical capability mismatch and common delete correct store | Pass baseline151, producer125 and legacy47; no authority conversion |
| C15 | Auth/outsider/private helper/alias denial, declared errors, guard restore and source/security inventory | Pass consumer, baseline and schema validators |
| C16 | Android permission/delete/logout/refetch/cache TTL and identity isolation | Not run; consumer GM25/28/31 with build/device/endpoint evidence |

Server cases use owned QA Auth/REST/worker and synthetic identities/data. SQL claims,
independent domain parity, actual JWT HTTP and Android are separate evidence layers.
Final human review/status/rollout is not supplied by the runner or this matrix.
