# GM-18.1 — Discovery API supplement

2026-10-13. Owner Tâm, reviewer Trí, review Pending. Compatible with GM-07.1;
food 1.1.0, schema 0.2.0, eligibility `gm18-eligibility-1.0.0`.
Policies selected by Tâm: radius <=10000 m, future <=604800 seconds; Trí reviews
the revision in PR #108. No new package/provider or upstream DTO edits.

## Boundary and input

Migration `0005_gm18_discovery_rpc.sql` adds three authenticated public RPCs and
a private policy/read-window schema. Migration 0018 remains the handed-off
private kernel. 0005 calls 0018 only at runtime, after all migrations are applied.
0001–0004 and 0018 are unchanged. Prefix 0019 remains available to GM-19.

`get_discovery_context(area_id?, anchor_id?)`: UUID filters; at most 100 public
anchors and 100 coverage areas, serverTime. Draft/fixture/source-private rows
are excluded. Coverage has no administrative linkage in GM-04: adminAreaId is
the explicit `unknown` sentinel required by GM-07's nonempty string contract.
It is not a district ID, inferred region or eligibility filter. Missing addresses
are empty strings per GM-07; no coordinates are invented.

`preview_food_pool(anchor_id, radius_m, desired_at, service_mode, meal_slot,
time_hint?, cuisine_ids?, category_ids?, budget?)`: radius is a positive JSON
number <=10000; desired_at is valid timezone-qualified ISO and no more than
7 days ahead of server time; service mode dine_in/takeaway/delivery; meal slot
breakfast/lunch/dinner/snack; time hint null or late_night. Taxonomy arrays contain
<=32 distinct known published UUIDs of the matching kind. Budget is null or a
nonnegative number, a soft VND/person preference; incompatible units never count
as a budget match. No client userId, GPS, clock, seed, bundle or fixtureMode.

`get_result_offerings(room_id, result_id)`: current JWT identity, active room
member and server expiry; result must belong to that room. Reads the persisted
winner/context, filters current availability of the same dish/variant before
the 100-card cap. Cards retain persisted roundDishId/choiceId. No winner,
past target or no available venue returns []; no replacement winner or writes
to room/result. GM-17 membership rules support reading terminal results; the
mutation guard `require_room` is deliberately not used for this read.

## Output and errors

Success envelope `{ok:true,data:...}`. Preview has GM-07 fields plus
`poolSeed`, `policyVersion: gm18-api-1.0.0`, `reasonCodes`. Pool remains <=8 unique
dish/variant choices. Preview/result cards add nonempty `offeringIds` and
`availability: scheduled | confirmed`. A card uses one offering's complete
profile/price, never combines prices/profiles from multiple venues. Preview IDs
are temporary choice keys, not persisted round UUIDs for GM-19 inserts.

Empty preview reasons: OUT_OF_COVERAGE if the anchor is unavailable in the safe
snapshot, AVAILABILITY_UNKNOWN if schedule/stock confirmation is needed,
otherwise NO_ELIGIBLE_FOOD. Nonempty preview has no empty reasons. Raw kernel
diagnostics, authors/reviewers/source locators/preferences/history/ballots do
not leave the boundary. Artwork needs eligible usage rights and a fresh source;
unknown rights return null. `origin:null` becomes the explicit unknown enum.
Latest published current dataset supplies metadata; if none exists, ADR-014
allows the actual draft version metadata with an empty safe catalogue. This
does not publish draft rows or change manifest verified counts.

| Error | HTTP | Condition |
| --- | --- | --- |
| AUTH_REQUIRED | 401 | No current DB-backed identity; GoTrue/PostgREST also reject missing/forged/expired JWTs |
| INVALID_INPUT | 400 | Bad UUID/date/shape/value/policy bound, or wrong/missing result for a member |
| DESIRED_TIME_PASSED | 400 | Preview target is in the past |
| NOT_MEMBER | 403 | Outsider/left member, including nonexistent rooms |
| ROOM_EXPIRED | 410 | Active member's room has expired |
| RATE_LIMITED | 429 | More than 60 calls per minute per caller and endpoint |

RPC error bodies include top-level messageKey and nested error.messageKey for
GM-07's HTTP and envelope paths. PostgREST privilege/signature errors outside
the endpoint body use its native response. Rate windows are atomic, private,
bounded to one row per user/endpoint, deleted after expiry on the next read and
cascade with auth user deletion. Read retries may consume the budget.

Only authenticated has public execute. Private schemas/functions/tables deny
anon/authenticated/service_role, use RLS/default deny. Public wrappers are
SECURITY DEFINER with fixed pg_catalog search_path and qualified names. No
direct app writes or privilege grants to upstream tables are introduced.

## Consumer and acceptance

Use `createDiscoveryApi` from `mobile/src/data/discovery`, composed with the
existing real GM-07/GM-16 authenticated client. It checks reason/seed/offer refs,
same-winner result cards and projects only allowed fields; server errors remain
errors. No fallback to mock. Temperature/flavor/private recent ranking ports
remain trusted kernel input for GM-19/21, never client histories returned here.

See GM-18 CHECKS/HANDOFF and `supabase/tests/http/GM-18.http`. Actual GM-08 bundle
0.4.1 returns empty without invented anchors; positive HTTP tests use new,
clearly labelled synthetic rows only in a process-owned disposable database.
No verified/production publish is needed by ADR-014 or claimed by these checks.

Rollback: stop consumers; administrator applies
`supabase/rollback/0005_gm18_discovery_rpc.down.sql`. It removes only the new
API/private policy/window objects, has no CASCADE and preserves food/core/GM-17
and kernel 0018. Do not run on a database with dependent consumers without
coordination; use forward migrations for merged versions.
