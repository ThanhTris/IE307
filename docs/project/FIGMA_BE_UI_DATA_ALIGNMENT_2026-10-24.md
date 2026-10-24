# Figma–BE–Data–UI alignment and task follow-ups — 2026-10-24

> **Owner scope correction — 2026-10-25:** only BE/Data follow-ups are assigned in the current iteration. Figma/UI observations below are input requirements for API/data, not authorization to change FE. The FE rows, foundation/theme/font work, mobile consumers, in-app Places UI, Android and release work below are deferred references. Preserve previous FE tasks/status/owners/deadlines until Trí finalizes Figma and explicitly assigns the rebuild. See [current BE/Data scope and owners](BE_DATA_ONLY_SCOPE_2026-10-25.md). GM-07 currently covers shared wire contract/schema/DTO only; mobile client/mock implementation is deferred.

This is the current implementation handoff for the product-owner decisions recorded on 2026-10-24. It supersedes the earlier “Top 3 pending” notes in [the BE/Data audit](BE_DATA_AUDIT_2026-10-24.md), [BE/Data follow-ups](BE_DATA_FOLLOWUPS_2026-10-24.md), and GM-07.A proposal where they conflict. GM-07.A remains an immutable historical draft; GM-07.B is the active proposed contract for new sessions.

- Figma file: [Gì Cũng Được](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j).
- Repository baseline inspected: `3f77789cfa451f24967428985e8a444ec2821114` (`main`).
- Current deployed dish-session: v3 / migration `0026`; v4.A/B are proposals, not deployed runtime.
- Task owner/status source: [GitHub Project #2](https://github.com/users/ThanhTris/projects/2). Owner and primary Status are preserved. This supplement does not mark implementation done or approve a task.
- Related decisions/contracts: [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md), [ADR-020 Top 3](../architecture/decisions/ADR-020-public-top-three-result.md), [GM-07.B](../architecture/DISH_SESSION_API_CONTRACT_B.md).

## What Figma asks the code to render

Figma inspection covered the Light foundations/components, main screen page, and create/preferences/lobby scenarios. The frames are design references, not fixed device dimensions. Key node references:

| User flow / Figma nodes | Expected presentation | Current API/data gap | Task owners |
|---|---|---|---|
| Create `43:106`; lobby/create examples `368:11933`, shortage `323:2664` | Host chooses 10–20 dishes; shortage is explicit and never silently reduced | v4.B request/settings, `available/requested`, explicit host confirmation; no venue/GPS | GM-07 Trang; GM-18 Tâm; GM-19 Trí; GM-24/25 Trang; GM-09/10 Tuấn; GM-11 Trung |
| Preferences `50:235`, `59:330` | Cuisine/category/flavor/temperature/budget choices remain soft; missing labels/price do not break the form | Caller-private preferences and locked display labels; only comparable currency/unit affects budget preference; unknown remains eligible | GM-40 Vinh; GM-06 Tâm; GM-18 Tâm; GM-10 Tuấn; GM-25 Trang |
| Lobby `68:429` and scenario `76:853` | Host starts; no ready or per-member approval; members see accepted-submission progress without choices | Per-member role and accepted status; server owns 20-seat limit and room state | GM-19 Trí; GM-22/23 Trí; GM-11 Trung; GM-25/28 Trung/Trang |
| Round-one vote `94:558`; wait `107:657` | Flashcard with buttons as gesture alternative, explicit send/ACK, wait; preserve 60s from the first valid transition into waiting after ACK | v4.B ACK/wait/finalize result shapes; missing ballot is not OK; UI refetches authoritative snapshot after ACK | GM-15/20 Vinh; GM-07 Trang; GM-12 Trang; GM-26 Trang; GM-31 Trung |
| Round-two `130:965`, one-item case `488:11662`, no consensus `226:1286` | Locked survivor set; if N>=1 open a real round 2. Cap `max(1,floor(.30*N))` for N=1..20; at N=1 user can REMOVE or not. No empty round 2 | v4 policy snapshot/finalize ACK, `removalCap`, NO/REMOVE terminal reason; no replenishment or auto-finalize | GM-15/20 Vinh; GM-19 Trí; GM-26 Trang; GM-32 Vinh |
| Top 3 `114:753`; result `382:7598`, `382:7884` | Up to three dishes, high-to-low points, shared ranks for ties; winner separately labeled “Món được chọn” | Runtime exposes winner only. v4.B persists aggregate score/rank and locked card projection. No client-side tally | GM-07 Trang; GM-15/20 Vinh; GM-06/17 Tâm/Trí; GM-13 Tuấn; GM-27 Trang |
| History `232:226`, details `260:1526`, no consensus `260:1597` | Reopen the same finalized result; no fake winner for no consensus | Persisted immutable result projection under existing consent/ACL/retention | GM-21 Tâm; GM-17 Trí; GM-14 Trung; GM-28 Trung |
| Notifications `286:2245` | Open the referenced result/history route; do not put votes or score contributions in push | Event references result ID/status/version; authorized in-app fetch supplies aggregate | GM-23 Trí; GM-14 Trung; GM-28/29 Trung |
| Friends and join | Search only current friends by name; add by code; no fake online status. Join preview is minimal; full roster only after joining | No global user-directory/presence endpoint; preview does not reserve a seat; join rechecks capacity/state | GM-07/19/22; GM-14/28/30 |
| Places after result | Show nearby places and map in the app for the winning dish; Google Maps link is an extra action; do not show sample restaurant/distance as live data | Add Places provider and in-app map to result flow; permission denied offers permission or opens Maps; Places failure cannot change winner | GM-27 Trang; GM-30 Trang |
| Foundations | Green/cream Light palette and Inter type; current Figma has Light variables only | App still uses orange tokens; no local Inter font assets found; Dark design/synchronization is deferred for this supplement; keep existing accessibility/regression requirements | GM-02 Trí; GM-05 Trung; GM-39 Trang |

Figma examples may contain sample points, restaurant names and distances that are not actual API data. Result fixtures must pair every displayed point with enough accepted ballots (`score <= 2 × submittedCount`), a consistent room roster, and stable dish IDs. Sample venue/distance data must be labeled mock or removed from the production result route.

## Approved result semantics

See [ADR-020](../architecture/decisions/ADR-020-public-top-three-result.md) for the normative rules:

- Score uses complete round-one ballots accepted by the server: `2 × WANT + OK`; missing ballots and round-two KEEP add no points.
- Eligibility excludes any R1 NO and, for round-two results, any R2 REMOVE.
- Return at most 3 eligible dishes, sorted by score. Fewer eligible dishes means fewer rows; `NO_CONSENSUS` returns no winner and an empty podium.
- Ties use dense shared ranks (`8,8,7` → `1,1,2`). The persisted result fixes any cutoff subset and includes the winner.
- Every authenticated room member sees aggregate points after finalization, even for one or two submitted ballots. No individual ballot or member contribution is exposed. Small-group inference risk is accepted by Trí.
- Persist once. Result, history and in-app notification fetch show the same immutable projection; no client or history query recomputes it.

## Contract and data handoff

`dish-session-v4/roadmap-v2/GM-07.B` is a forward-only extension. It adds `previewJoin`, `updateSettings`, `updatePreferences`, host/settings/caller-preference snapshot fields, member roles and accepted-submission status, `removalCap`, expiry, explicit finalize transition vs terminal ACK, and the terminal `topDishes` projection. The complete proposed DTOs are in [the B contract](../architecture/DISH_SESSION_API_CONTRACT_B.md) and [its JSON Schema](../architecture/schemas/dish-session-v4b.schema.json).

GM-40/06 must supply a locked card with stable dish identity, labels/IDs, meal slots, nullable description, known flavor/temperature, nullable rights-cleared artwork and nullable observed price with currency/unit/source/time. Current 39-dish bundle is test/demo and artwork is null; this is enough to test fallback and unknown states, not proof of production coverage. Price observations retain their unit; no conversion. Never invent a label/image/price to satisfy the frame.

## Task-by-task supplement (existing IDs and owners)

All owners below match Project #2 at inspection time. Only the BE/Data rows are active under the scope correction above. Preserve the primary Status, assignee and Deadline; use **Follow-up** for active BE/Data supplements on accepted baselines, not for deferred FE work. Do not add a new task or numeric dependency that points backward. Baseline acceptance remains intact; follow-up acceptance is separate. PR #132 / GM-07.A is not runtime evidence.

| Task / owner | Supplement deliverable and acceptance |
|---|---|
| GM-07 — Trang | Publish B request/response/error schema, typed DTO examples and parser/guard separation. Add finalize-advance vs terminal ACK, snapshot/privacy and result Top 3. Schema fixtures reject missing projection/invalid state. No production API/client completion claimed. |
| GM-06 — Tâm; GM-40 — Vinh | Forward migration/storage and Data handoff for immutable result podium/card snapshot. Preserve legacy FK and history. Required identifiers/version/hash; nullable image/price and explicit unit/provenance. Readback keeps old results stable; no production dataset quota or fake data. |
| GM-15 / GM-20 — Vinh | Implement parity only after B is reviewed: R1 scoring, eligibility, dense ranks, cutoff tie, winner inclusion, atomic persisted Top3; ACK/retry/reconnect never changes it. Keep v2/v3 and current runtime behavior pinned. |
| GM-17 — Trí | Member-only post-terminal aggregate ACL; no individual ballot/contribution/seed; history consent, revoke/delete/retention; small-group aggregate visibility is allowed per ADR-020. |
| GM-18 — Tâm; GM-19 — Trí | Dish-only exact initial count, soft preference ranking, preview join, editable lobby settings/preferences with poolVersion increment, capacity/admission and response-driven lifecycle. Missing fields neutral; insufficient count explicit; no venue/GPS and no auto-reduction. |
| GM-21 — Tâm | Store/read the same immutable decided/no-consensus result under consent/ACL. History never recomputes from catalogue; deletion/revoke/TTL remains effective. |
| GM-22 / GM-23 — Trí | Admission follows capacity/room state. Events/inbox reference the canonical result once; notifications contain IDs/status/version only and fetch authorized aggregate result in-app. |
| GM-39 — Trang | Finalize Figma/prototype states: shared-rank podium, winner badge independent of rank, 1/2/3-entry and no-consensus fixtures, shortage/unknown/error/loading, Light direction. Dark redesign/synchronization is deferred. Do not edit app as part of the HTML task. |
| GM-02 — Trí; GM-05 — Trung | Reconcile approved green/cream tokens and Inter font loading with Expo baseline; check contrast, fallback, font scaling and existing component states. Add package/assets only through normal dependency review; no major upgrade. |
| GM-09/10 — Tuấn; GM-11 — Trung | Setup/host preference and lobby copy/states match B; remove requirement for venue/location/ready; show server-backed capacity and accepted progress. Preserve old mock-vs-real labeling. |
| GM-12 — Trang; GM-13 — Tuấn; GM-14 — Trung | Vote/wait, Top3/no-consensus, history/inbox states render typed server data. A one-item R2 remains an actual REMOVE/no-REMOVE ballot; no auto-finalize. Tie ranks share semantic rank/equal podium level; winner gets separate label. No local score calculation or fake online/presence. |
| GM-24/25 — Trang | New flow is dish-only; time is planned meal time and does not auto-start. Location/coverage is not a prerequisite. Room/preferences integration uses B version and pool snapshot. |
| GM-26/27 — Trang | Use v4.B live ballot/ACK/refetch and server result. A one-item R2 remains an actual ballot. Result screen integrates Places-backed restaurant/map search for the winner; opening Google Maps is supplementary; permission denied offers permission or Maps; provider failure never changes winner. |
| GM-28/29/31 — Trung | History, inbox/push route, cache/outbox and reconnect use result IDs and current snapshot; no duplicate submit/notification or private payload. Keep push native limits and device evidence separate. |
| GM-30 — Trang | Join links/QR preview are minimal and race-safe. Integrate an in-app Places-backed list/map for the winning dish on result; Google Maps link is supplementary. Define provider configuration/key handling, attribution, permission fallback, loading/empty/error/quota states, and ensure Places failure cannot change the winner. |
| GM-03 — Trí; GM-32 — Vinh | Active BE/Data QA: authenticated Auth+REST environment/worker, ledger and artifact hashes, actual API/Data/security/race assertions. Record schema fixtures separately from deployed API proof. |
| GM-33 — Vinh; GM-34 — Trí | Deferred Android/release reference: FE scope and execution will be assigned after Trí finalizes Figma. Existing tasks/statuses remain unchanged. |

## Ordered delivery and handoff gates

These are artifact gates, not newly-added backward task dependencies. Independent rows may be developed in parallel after their listed artifact exists.

1. **BE/Data contract** — Review GM-07 B, wire examples and Data projection together. Upstream consumers use the exact contract B/schema hash. Figma states remain reference input; no GM-39 design work is assigned by this iteration.
2. **Data/storage** — GM-40/06 define projection and migration plan. Storage must have a forward migration and old-version preservation plan before engine persistence. The previous GM-02/05 theme/font proposal is deferred; it is not parallel work assigned in this iteration.
3. **BE producers** — GM-18/19 implement pool/lifecycle; GM-15/20 implement deterministic ranking/result after contract and projection. The pool branch may run alongside the engine branch once contracts are reviewed; Vinh does GM-40 before the part of GM-15/20 that consumes the projection.
4. **Privacy and consumers** — GM-17 reviews ACL/storage; GM-21 history and GM-22/23 events consume the persisted result seam. Social/event and history may proceed in parallel once the terminal DTO and ACL rules are stable.
5. **BE/Data QA** — GM-32 API/data/security/race uses merged/deployed producer artifacts and GM-03 QA setup. No Test/Done claim from schema-only or mock-only execution.
6. **Deferred FE/Android/release** — Trí will finalize Figma and assign the FE rebuild separately. This matrix does not assign screen, mobile integration, theme/font, Android or release changes now.

If a producer is not merged yet, a consumer may prepare independent layout/mapping but must not hardcode its output or merge integrated code until that version is available. Do not make GM-03, GM-06, GM-07, GM-18/19 or GM-20 depend numerically on later GM-40; record the concrete manifest/schema/version in HANDOFF instead.

## Acceptance / test matrix

| Layer | Minimum proof |
|---|---|
| Ranking | 0/1/2/3/many eligible; 0/1/2+ submissions; WANT/OK score vectors; dense ties; cutoff tie; winner included; locked projection; replay/reconnect byte-stable; no-consensus empty. |
| Room rules | 10–20 initial exact count; shortage 20 available/15 requested; host explicit reduction >=10; 20/21 members; host start; lobby settings/preferences version races; N=0 terminal R1; N=1..20 opens real R2, cap=max(1,floor(.30*N)), including N=1; no auto-finalize; cap+1 rejection; all REMOVE terminal R2. |
| Contract/HTTP | create → preview/join → snapshot → start → submit → waiting → finalize; success/error bodies validate; transition ACK has no terminal fields, terminal ACK has result reference; next request uses returned snapshot; exact retry stable. |
| Privacy/history | Room member sees aggregate only after terminal; outsider denied; no ballot/contributor/seed; history consent, revoke/delete/TTL; notification reference only. |
| Data/projection | IDs/version/hash stable; nullable labels, artwork fallback, price unknown and distinct units; no current-catalogue mutation changes saved result. |
| UI/Figma | 1/2/3 podium, shared rank and winner label, no consensus, image/price absent, loading/empty/error/shortage, Places list/map and permission fallback, no fake restaurant/distance, Inter fallback, green contrast, narrow layouts and large font. Dark redesign is deferred for this supplement; preserve existing accessibility and TalkBack requirements. |
| Integration | Two authenticated clients, process/network interruption, unknown ACK, stale response, server deadline, host finalize, terminal notification/history route. Track Expo Go and Android device/native checks separately. |

Task CHECKS/HANDOFF must record baseline SHA, contract/schema ID+hash, migration/schema version, catalogue version/hash, expected/actual/assertion, reviewer Trí and exact environment. HTTP, Expo and Android evidence are separate. This plan itself does not alter runtime or claim any of those tests passed.
