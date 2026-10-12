# GM-18 — Pure eligibility

Contract `food-v1/roadmap-v2/GM-18.1`, policy `gm18-eligibility-1.0.0`.
`evaluateEligibility(bundle, input, evaluatedAt, policy)` consumes a trusted typed
snapshot, not a client-supplied bundle. Explicit finite radius/horizon policy is
required; fixtureMode is for tests only. No runtime clock, GPS, network or native SDK.

First check dataset/anchor/coverage, actual venue location/radius, freshness and
source rights, service mode, meal slot, both schedules/date exceptions/last order,
then sold-out/paused overrides. Half-open shifts and actual-day closed exceptions
apply across midnight. Inventory unknown stays scheduled, not confirmed live stock.

Rank order: preference matches, comparable budget fit, consent-filtered recent
penalty supplied by trusted caller, distance, seeded hash, offering ID. Budget is
soft; only VND/person budget is comparable with the public numeric budget request.
Select representatives for preferred categories, then fill to at most 8 distinct
(dishId, variant) choices. Card fields come from one representative offering;
other eligible offering IDs are references, not sources to merge into that card.
`roundDishId` is a preview key only; GM-19 must assign persisted round UUIDs.

SQL private kernel and snapshot/preview/discovery/winner helpers are in 0018.
No app RPC grants, security-definer functions or RLS changes. GM-17/19 must wrap
trusted snapshot/policy/preferences/history/winner inputs with auth/rate-limit and
membership checks. Do not expose private bundle/evaluation diagnostics to users.
Public GM-07 DTO projection is additive; reasons/offering metadata are private
kernel output until consumer contract review. No private preferences returned.

Run `node --test mobile/tests/eligibility.test.mjs` at repo root. SQL parity uses
`scripts/gm18_eligibility_check.py`. Fixture tests and draft DB queries do not prove
verified catalogue or Android/API integration. Current limits in CHECKS/HANDOFF.
