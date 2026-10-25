# GM-17 forward-only access matrix supplement — 2026-10-25

Status: **Proposed contract requirement**. This document extends the baseline [ACCESS_MATRIX.md](ACCESS_MATRIX.md) for future GM-07.B results/history. It does not alter merged `0004_access_policies.sql`, deployed grants, v2/v3 behavior, or task approval.

| Projection | Before terminal | After terminal | History scope |
|---|---|---|---|
| Room member | Authorized current member reads shared context/roster and accepted/not-submitted status; own preferences, own ballot and ownWaiting only | Authorized room member reads persisted winner/status/reason and aggregate Top 3/score/rank versions; outsider denied | Personal: caller identity plus member count only. Group: names only if every member has valid explicit frozen consent |
| Host | Host rights only for lifecycle commands assigned by the pinned contract | Same aggregate projection as other authorized members | No access to another member's ballot or contribution; no identity list without all-member consent |
| History | Not available before an immutable terminal projection exists | Read only under current personal-owner or valid group-consent policy and retention | Consent withdrawal/delete denies immediately and removes the corresponding projection; retries cannot recreate it |
| Inbox/event | Reference/status/version only; event does not grant read permission | Refetch through the same authenticated result/history ACL | No ballot, seed, hidden context, push token, user IDs in group-name projection, or private diagnostics |
| Expired room | Membership check precedes expiry response | Member receives `410 ROOM_EXPIRED`; outsider remains `403 NOT_MEMBER` | Historical read follows independent history consent/retention policy |

All aggregate scores are computed from the acknowledged complete R1 cohort and carry `scoredRound1BallotCount`; score bounds are `score <= 2 * scoredRound1BallotCount`. The canonical result reference is an identifier only and never bypasses row/column ACL. Private storage and helper tables remain inaccessible by direct client SQL. Implement forward grants only with GM-06/17/20/21 producer artifacts and regression SQL/HTTP; until then these rows are not effective privileges.
