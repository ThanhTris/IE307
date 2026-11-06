## Task and behavior

GM-26 ([issue #87](https://github.com/ThanhTris/IE307/issues/87)), owner Trang, reviewer Tri. Contract: `dish-session-v4/roadmap-v2/GM-07.B-supplement`.

Connects the existing R1/R2 Figma screens to real room snapshots, ballot ACK, waiting and finalize. An ACKed ballot resumes the waiting step without resubmitting votes. Ambiguous retries retain the complete request; room/account changes invalidate old continuations, and stale snapshots cannot regress the round or result. Host identity and the server-provided `canEndWaiting` permission are distinct. Prices retain their currency/unit and missing metadata stays hidden.

Keeps the R2 30% cap with minimum one, including REMOVE when N=1. The server owns deadlines, transitions, winner and Top 3. Includes the lobby-to-vote route correction and preserves `NOT_ENOUGH_MEMBERS`. SDK 58 patches and lockfile are aligned with the tested Expo Go baseline. No API or migration change.

## Inputs and merge checks

- Live Project prerequisites GM-07, GM-12, GM-20 and GM-25 are Done; their artifacts exist on target main `c5b2b07`.
- Start gate: `READY_TO_CLAIM`. Target-baseline diagnostic: `READY_FOR_MERGE_REVIEW`.
- Ordinary branch merge checker: `BLOCKED_ON_BASE` for `VoteScreen.tsx` and `FinalRoundScreen.tsx`. These delivered GM-12 screens are intentionally changed by the GM-26 integration. The target versions and integration diff were reviewed manually; checker logic and task statuses were not changed.
- The owner requested push/merge in the current chat. No automated GitHub approval or Project Done is recorded by this PR.

## Verification

- Full mobile: **65 suites / 1,104 tests passed**; includes four regressions that failed before the final retry/role correction.
- Typecheck, lint on touched files (zero warnings), architecture, repository validator, task indexes and whitespace checks: **Pass**.
- Earlier QA: real Auth+REST on owned schema 0.16.0, R1 ACK/waiting/worker transition, R2 REMOVE and persisted `DECIDED`; backend runners and SQL/domain parity passed as documented.
- Earlier Expo Go emulator: voting interaction/cap checked. The final waiting/identity correction adds consumer regression coverage; API/Android were **not rerun** for that correction.

## Handoff and limits

[CHECKS](https://github.com/ThanhTris/IE307/blob/issue87_figma_ui_gm26/docs/evidence/roadmap-v2/GM-26/CHECKS.md) · [HANDOFF](https://github.com/ThanhTris/IE307/blob/issue87_figma_ui_gm26/docs/evidence/roadmap-v2/GM-26/HANDOFF.md) · [Figma map](https://github.com/ThanhTris/IE307/blob/issue87_figma_ui_gm26/docs/design/UI_FIGMA_TASK_MAP.json).

The result API consumer remains GM-27: reaching its placeholder does not establish result UI integration. Visual screenshot parity, physical Android and native-build evidence remain **Not run**. In-memory recovery does not replace the persistent outbox of GM-31. Existing legacy API and policy versions remain pinned.
