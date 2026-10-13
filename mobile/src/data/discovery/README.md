# Discovery consumer — GM-18.1

Compose `createDiscoveryApi(apiClient)` with the real GM-07 client (and GM-16
SessionManager for app auth). No replacement DTO/transport/auth scaffold.
`getDiscoveryContext`, `previewFoodPool` and `getResultOfferings` retain normal
ReadResult/error behavior. Preview additionally checks seed/policy/reasonCodes;
cards check offeringIds/availability and strip unsupported outer fields.
Empty preview requires an explicit reason; empty result is legitimate, and
nonempty result cards must share the persisted winner identity.

Policy: 10km/7days server limits, 60 reads/minute per caller/endpoint. UI shows
unknown/empty without expanding radius or borrowing dishes from another area.
Preview choice keys are not round row UUIDs. Availability scheduled is not
confirmed in-stock; unknown prices stay null. Coverage adminAreaId `unknown`
means there is no administrative linkage; do not treat it as a district.

Actual client HTTP tests: `node scripts/gm18_http_check.mjs` from repo root after
root/mobile npm ci and backend:start. See
[API supplement](../../../../docs/architecture/GM18_DISCOVERY_API.md) and
[HANDOFF](../../../../docs/evidence/roadmap-v2/GM-18/HANDOFF.md).
Android screens/wiring remain GM-24/25/27; unit or desktop HTTP Pass is not
Android/UI acceptance.
