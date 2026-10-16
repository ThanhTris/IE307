# GM36.1 — Independent menu OCR/draft boundary

2026-10-16, owner Tâm, reviewer Trí (Pending). Inputs GM04.2/food1.1.0 and GM07.1.
This is the independent portion authorized before GM34, under the task's start gate.
No enabled app extension, provider, native package, DB migration or publish path.
EXTENSIONS_SPEC still targets on-device recognition; no cloud recognizer is selected.

## Entry and execution boundary

`supabase/functions/menu-ocr/index.ts` exports `createMenuOcrHandler`. The actual Deno
entrypoint is permanently disabled in this revision. Valid authenticated requests
receive503 OCR_DISABLED; missing/forged sessions receive401. No feature/environment
switch silently enables paid/external processing. Existing `edge_runtime=false`
and mobile/core clients/config/package locks remain unchanged.

The handler exposes a typed recognizer port (`on-device` or `test-double`). A future
reviewed implementation must establish where on-device recognition and correction
run, and how reviewed output reaches the import workflow. These labels do not
implement a recognizer or authorize image egress. Pure normalization can run without
network; this revision has no mobile camera/OCR consumer. The HTTP harness injects
only a test double and never transmits image bytes to a third party.

## Proposed request contract

POST `/functions/v1/menu-ocr`, application/json; bearer user session.
Strict required keys; unknown fields rejected, including userId/venue/URL/publish.
Example: `tests/fixtures/menu-ocr-v1/request.json` (synthetic PNG, no real source).

| Field | Type/constraint | Meaning |
| --- | --- | --- |
| requestId | ASCII A–Z/a–z/0–9/_/-,1..128 | Correlation ID; not an idempotency or reusable approval token |
| image.mimeType | image/png or image/jpeg | No SVG, data URL, file path, URL fetching or redirects |
| image.dataBase64 | Canonical padded base64, decoded<=1MiB | In-memory only, never returned/logged/persisted |
| source.sourceRef | UUID | Reference to curator-managed source; not proof that it exists/is reviewed |
| source.usageRights | granted/licensed/public_domain | Mandatory DECLARATION; remains unverified |
| source.license | nonempty<=500 or null; required when licensed | Declaration, never generates license evidence |
| processingConsent | literal true | Explicit processing intent; does not approve a provider or future retention |

Bounds: body<=ceil(1MiB/3)*4+4096 bytes measured from stream, body deadline5s;
image PNG signature/IHDR/IEND and dimensions1..4096; JPEG start/end markers/minimum
length. These are container checks, not complete decoding/CRC validation. The actual
recognizer must enforce safe decoding/dimensions/metadata handling before approval.
Provider result<=50 rows; names<=160 and price text<=80, controls rejected.
The proposed confidence threshold0.85 and request/provider timeouts are for review,
not a measured accuracy target or approved production quota.

## Authentication and authorization

Server authorizer sends only the bearer token and public key to the configured
project's `/auth/v1/user`; never trusts decoded sub/user_metadata or a caller ID.
Auth response capped64KiB and3s. Processing also requires an explicit server-owned
operator UUID allowlist; neither anonymous Auth nor room host implies data-import
permission. Missing recognizer/quota fails503. No service_role is accepted from the
caller or used to write food. No permissive CORS is added; no mobile UI consumer here.

Production requires a reviewed operator/admin model, recognizer and distributed
quota implementation. The bounded memory quota is only a local/test adapter:
3 attempts/user/minute, one running operation/user, at most128 active caller windows.
Provider errors still consume attempts. Pending work keeps its slot until it actually
settles, even if it ignores abort; no overlapping jobs after timeout. No response/image
cache; retries after completion may run recognition again and consume quota. requestId
is echoed only after input validation, not stored. Do not automatically retry OCR.

## Provider output → draft

Provider port returns exactly `{items:[{name,nameConfidence,priceText,priceConfidence,
currency,unit}]}`. All six keys required; text/confidence/currency/unit may be null.
Confidence is finite0..1, never string/percentage. currency is VND or null; unit uses
unchanged GM07/GM04 enum portion/item/person/group/kg/menu_item_unspecified, or null.
Extra classification/location/allergen/source/verified keys reject the entire result.
No model response is executed or treated as a trusted field/SQL fragment.

Confidence below0.85 or unknown keeps the corresponding normalized field null.
Known price needs parseable min/max, VND and explicit unit together. Vietnamese
thousands separators and explicit k notation/ranges are supported; decimal numbers
without k, reversed/multiple ranges, mixed grouping, currency symbols/text that
cannot be parsed remain unknown. Price zero is accepted only when explicitly read
at sufficient confidence with currency/unit; missing price never becomes zero.
No person-unit conversion, nutrition/allergen inference or location/hours fabrication.

Success: `{ok:true,requestId,data:MenuDraft}`. Schema in
`supabase/functions/menu-ocr/draft.schema.json`. Draft and every item are always
reviewStatus=draft; publishable=false; sourceRightsVerified=false; venueId/coverageId/
scheduleId=null. Each row binds sourceRef and fieldSources.menu; fieldSources.price
is null unless the price is known. No dish/offering IDs, reviewer, checkedAt,
validUntil, verification, taxonomy, GPS or raw recognized text are invented.
`providerMode=test-double` marks all simulated recognizer outputs explicitly.

## Errors and privacy

Every response uses JSON, Cache-Control:no-store, nosniff and the contract header.
Errors: `{ok:false,messageKey,error:{messageKey},requestId?}`, no raw error details.

| HTTP | messageKey |
| --- | --- |
|401 | AUTH_REQUIRED |
|403 | OCR_FORBIDDEN |
|400 | INVALID_INPUT / INVALID_IMAGE / CONSENT_REQUIRED / SOURCE_RIGHTS_REQUIRED |
|405 | METHOD_NOT_ALLOWED (Allow:POST) |
|408 | REQUEST_TIMEOUT (body deadline) |
|413 | PAYLOAD_TOO_LARGE |
|415 | UNSUPPORTED_MEDIA_TYPE |
|422 | OCR_NO_TEXT |
|429 | RATE_LIMITED (local adapter, Retry-After:60) |
|502 | OCR_MALFORMED_OUTPUT |
|503 | AUTH_UNAVAILABLE / OCR_DISABLED / OCR_UNAVAILABLE |
|504 | OCR_TIMEOUT |

Provider deadline10s aborts its signal; a late answer cannot produce a second
response or persistent draft. Unknown provider errors are sanitized. Images,
license declarations, tokens, raw OCR text and user IDs are not in output/logs.
Only draft source references/normalized fields/confidence/issues are returned.
No source/food/room/history data is written, and no DB client is in this boundary.
GoTrue guest creation/cleanup belongs only to the local test runner.

## Human correction and GM08 handoff

This MenuDraft is deliberately NOT a food1.1.0 bundle. Existing GM08 preflight must
reject direct import, including publish-ready; the contract checker tests that
unchanged code on the actual HTTP output. Do not rename the draft contract to food,
set reviewStatus verified, infer schedules/coverage or fill null values to bypass it.

A curator must inspect the real menu, correct/confirm name/price/unit, establish a
real dataSources record and permitted source evidence, bind actual dish and branch
UUIDs/venue–dish offering, hours/coverage/timezone and freshness. Populate the existing
GM04 template with those reviewed fields, then run the original GM08 offline validator.
All publication guards and human approval remain in GM08; this feature has no staging,
publish or DB-write capability. Integration/real provider pilot waits for GM34 and
provider review. Unknown menu hours/coverage remain unknown, never available by default.

## Reproduce and reference

Commands/evidence in GM36 HANDOFF/CHECKS. Node tests execute Web APIs/TypeScript,
loopback HTTP verifies actual GoTrue sessions, while the recognizer remains stubbed.
Deno/Supabase Edge gateway execution and real recognition/native accuracy are Not run.
No Android consumer exists in this task; later app OCR requires a separately agreed
consumer and device upload/auth/timeout/privacy cases, without a reverse dependency.

Runtime design references (not new dependencies):
- [Supabase Auth via user session](https://supabase.com/docs/guides/functions/auth-legacy-jwt)
- [Deno Web HTTP server](https://docs.deno.com/runtime/fundamentals/http_server/)
The pinned CLI baseline uses the legacy Deno entrypoint; no newer SDK/package is adopted.
