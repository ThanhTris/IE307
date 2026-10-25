# ADR-021 — Soft preference ranking and participant history projection

- Status: **Proposed — owner review required**
- Date: 2026-10-25
- Owner/reviewer: Trí (`ThanhTris`)
- Scope: forward-only `dish-session-v4/roadmap-v2/GM-07.B`; no change to deployed v2/v3.
- Related: [GM-07.B contract](../DISH_SESSION_API_CONTRACT_B.md), [ADR-019](ADR-019-dish-first-room-policy.md), [ADR-020](ADR-020-public-top-three-result.md), [GM-17 baseline access matrix](../ACCESS_MATRIX.md), [GM-17 B supplement](../ACCESS_MATRIX_GM17_B_SUPPLEMENT_2026-10-25.md).

## Context

The new room flow needs a deterministic soft ranking policy and a privacy-safe participant projection for personal and group history. Both affect storage and server outputs, so a field declaration without a rule is not enough. The product owner clarified the two user-visible privacy/weighting choices on 2026-10-25; the numeric ranking details below are a technical proposal for explicit review before producer implementation.

## Owner-confirmed decisions

1. The host and every joined member have equal person weight in soft preferences. The host alone sets meal context and requested dish count.
2. Personal history keeps the caller identity and member count only. It does not store peer identities.
3. Group history may store display names only when every participant has valid explicit consent frozen for that room. It stores no participant user IDs or avatars.

No consent is inferred from room membership, a UI label, an existing result reference, or an ACK replay.

## Proposed soft ranking policy

Meal eligibility remains a separate hard check. A source-backed `mealSlots` match is required; `mealSlots=[]` is unknown and does not match every meal. Shortage is reported as `available/requested`; the server does not relax meal evidence, replenish dishes, or reduce the exact requested count.

For each candidate, calculate an integer preference score across the canonical member set:

- Cuisine: one point for a person if any selected cuisine ID intersects the candidate; otherwise zero.
- Category: one point for a person if any selected category ID intersects the candidate; otherwise zero.
- Temperature: one point for an exact known selected/candidate match; otherwise zero.
- Flavor: one point for a person when at least one known flavor attribute was selected and every selected known attribute matches; otherwise zero.
- Each person contributes at most one point per dimension. Multiple tags do not add extra points. Host and non-host members are summed equally. Unknown/unselected data contributes zero and never removes a candidate.

After preference score, compare the fraction of members with a valid comparable budget whose maximum includes the candidate's selected price observation. Comparability requires exact currency and unit equality; non-comparable or missing price contributes no fit point and does not make the dish ineligible. Next rank by fewer consent-authorized recent-history hits among members who requested `avoidRecent`. If all prior fields tie, sort by `SHA-256(privateRoomSeed || canonicalRoundDishId)` ascending, then `roundDishId` ascending. The seed stays private and is pinned for that room/result.

The result ranking tuple is therefore: preference score descending, comparable budget-fit fraction descending, recent-hit count ascending, private seeded hash ascending, stable round-dish ID ascending. This exact formula remains proposed until Trí reviews it.

Price display selects only valid-source observations, preferring greatest `checkedAt`; timestamp ties use observation UUID ascending. It never averages or converts currency/unit. `menu_item_unspecified` is not per-person. No usable observation projects `priceReference=null`.

## Proposed history participant projection

- Personal: `memberCount` plus the caller's own identity only; never store peer names or IDs.
- Group: names only, with no user IDs, and only if every room participant has valid explicit frozen consent for the same session.
- Revocation/deletion removes the associated history projection and immediately denies access under GM-21 semantics. A retry, reconnect, or canonical reference cannot recreate a deleted row.
- Retain valid history up to 30 days from `finalizedAt`, subject to the shorter consent expiry. Operational room cleanup must not cascade-delete valid retained history.
- No new avatar, location, roster role, raw ballot, individual contribution, seed, or consent snapshot is added to public history.

## Compatibility and rollout

This proposal applies only to new B rooms. Legacy v2/v3 sessions keep their pinned policy and must not be backfilled with invented scores, participants, or Top 3. Producers GM-06/17/18/20/21/40 must pin the reviewed contract/schema, preserve ACL and transaction boundaries, and provide SQL/HTTP evidence before B is treated as implemented. This ADR does not alter merged migrations or deployed grants.

## Review checklist

- [ ] Trí approves the exact soft-ranking formula and tie-break.
- [ ] Trí confirms the owner-approved history projection remains consistent with GM-17/21 storage and consent semantics.
- [ ] GM-18/40 hand off the exact eligibility, price provenance and candidate-card fields.
- [ ] GM-06/20/21 hand off canonical result, score cohort, history writer and no-consensus representation.
