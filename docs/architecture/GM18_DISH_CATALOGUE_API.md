# GM-18.2 — Dish catalogue and preview API

Owner Tâm; reviewer Trí Pending. Additive producer delivery on main40feb9b + patch,
2026-10-29. Received GM07/PR138 baseline B and B-supplement schemas separately.
Contract `dish-catalogue/roadmap-v2/GM-18.2`, projection GM18.2, schema ledger0.11.0,
forward0033. This does not activate or change B-supplement runtime routing.
Legacy get_discovery_context/preview_food_pool/get_result_offerings keep their
existing contract, offering/coverage/time semantics and v2/v3 compatibility.

## Requests and authorization

Authenticated PostgREST calls, public key + caller JWT (never service_role):

```http
POST /rest/v1/rpc/get_dish_catalogue
{"payload":{"contractVersion":"dish-catalogue/roadmap-v2/GM-18.2"}}

POST /rest/v1/rpc/preview_dish_pool
{"payload":{"contractVersion":"dish-catalogue/roadmap-v2/GM-18.2","mealSlot":"lunch","dishCount":20}}
```

Both wrappers are SECURITY DEFINER with fixed pg_catalog search_path and execute
only for authenticated; missing identity is denied. Private selector/projector and
all private catalogue tables remain inaccessible. Each endpoint allows60 reads per
caller/minute through the existing GM19 limiter. No stored preference/roster/ballot/
seed/editor identity is returned. The new reads never create a room or ballot.

Catalogue permits only contractVersion and optional mealSlot. Preview requires
contractVersion, mealSlot and dishCount (JSON integer10..20); optional preferences
must match the received B softPreferences shape. No caller-supplied seed or hard
cuisine/category/budget/recent/location filters. Unknown fields are rejected.
Meal values: breakfast/lunch/dinner/snack. Missing/unknown meal labels on a source
dish do not mean eligibility for every meal. Desired time/GPS/venue/coverage are
not required or accepted by these read endpoints; planning time remains v4 settings.

## Success and errors

`{ok:true,data}` with closed data fields: contractVersion, projectionVersion,
catalogueVersion, catalogueSha, testOnly, mealSlot (null for unfiltered catalogue),
available, requested (null for catalogue), previewOnly, preferenceRanking and dishes.
JSON Schema: [gm18-dish-catalogue.schema.json](schemas/gm18-dish-catalogue.schema.json).
Rebuild/check via `python scripts/build_gm18_contract.py --write` / without --write.
B's upstream schema is read only and reused for card/nullable artwork/flavor types.

A preview returns exactly requested distinct stable dishIds, ordered by dishId,
from the selected meal in the one active catalogue. It does not persist/reserve
roundDishId or promise the same subset as a later room's seeded pool. GM19's real
create/start owns round UUIDs and locks its own full pool. Initial room pool remains
10–20; round2 is ballot-derived and never refilled by these APIs.

Shortage: HTTP409, `{ok:false,error:{messageKey:"INSUFFICIENT_DISHES",details:{available,requested}}}`.
Other safe message keys: AUTH_REQUIRED401, RATE_LIMITED429, INVALID_INPUT400,
UNSUPPORTED_CONTRACT_VERSION400, UNSUPPORTED_FIELD400, CATALOGUE_NOT_READY503.
No active catalogue, >1000 source cards or normalized duplicate IDs fails503;
no silent truncation, count reduction, relaxed meal filtering or invented dish.
This endpoint-specific version is distinct from both GM07.B request IDs; passing
B or B-supplement as this contractVersion is rejected rather than guessed.

## Preferences and projection

Preference ranking stays advanced/UNSUPPORTED, as advertised by the current v4
snapshot. Passing valid own preferences never removes a dish, changes available
or silently reduces count. This API does not claim to implement equal-weight
aggregation or an avoid-recent formula. A future reviewed ranking can order only
eligible dishes and read consent-authorized history without changing ballot scores.
Existing v4 account defaults and per-room private copies remain authoritative;
updating a default does not rewrite a room snapshot, peers read only their own.

Dish fields: dishId, name, description, mealSlots, cuisine/category IDs+labels,
temperature, flavor, artwork, priceReference, priceObservation, cuisine/category
Terms and taxonomyVersion. Terms contain only id/type/code/label/record version
from the received source. taxonomyVersion identifies its source profile/schema;
release ID/hash pins the exact vocabulary, not review approval. Unknowns stay null
or empty arrays. Artwork follows the existing reviewed-rights projection guard.

Select only the latest valid source checkedAt, comparing normalized UTC instants.
It is mapped explicitly to priceObservation.observedAt; running the tool does not
refresh the source clock. A latest timestamp tie gives no selected observation.
A latest null amount hides price without falling back to an older amount. Nullable
currency/unit/source/serving-size are kept in priceObservation, never invented.
priceReference uses the *received B wire* checkedAt and its stricter non-null
amount/currency/unit/source. If that wire cannot represent the selected metadata,
priceReference is null and priceObservation retains the known/unknown metadata.
No conversion to price/person, averaging, stale fallback or synthesis of price0.
A real amount0 is retained. Old source/draft does not prove current availability,
provider rights, freshness or verified production data.

## Opt-in loader and lifecycle

The validated original GM40 bundle/schema/digest are reused, not edited. Existing
import_dish_catalogue.py default cards and release ID stay unchanged. The new
import_gm18_catalogue.py projection uses the same immutable catalogue authority
with release suffix :gm18.2 to pin changed projection bytes. It does not overwrite
existing catalogue releases or use gm06_canonical as a second v4 authority.
Install, activation and conflict checking share the upstream transaction/lock;
fault rollback leaves the previous active release intact. Exact reimport is
idempotent; mismatched existing cards/hash fail rather than overwrite.

```sh
python3 supabase/seed/import_gm18_catalogue.py validate
# QA only; namespace marker required, application DB is rejected:
python3 supabase/seed/import_gm18_catalogue.py import --database gm08_check_<owned> --namespace <uuid> --activate
```

The real bundle remains39 draft/test-demo dishes. Measured source labels are
breakfast14/lunch23/dinner7/snack1. Positive larger pools use separately labelled
synthetic data, not changed source labels. Existing v4 create/start consumes the
same rich cards when that opt-in release is activated; stored pools/results/history
keep their already locked projection across catalogue activation. No app data is
backfilled, published or migrated by this delivery.

QA down0033 removes only the two new RPCs/helpers/ledger, preserving catalogue,
room/result/history and all legacy functions. Operational rollback disables these
new consumers and restores the previous active QA catalogue only through an
owner-reviewed release plan; no data reset. Trí reviews deployment/backup/restore
for retained databases. Git/schema health alone is not deployed definition proof.
