# GM-09 remaining steps — requirements and gaps

2026-11-01, user clarification: Figma is a visual reference. Report omitted
GM-09 requirements and add small missing controls/states in the existing visual
language without a major layout change. The user authorizes a local commit after
each remaining step, no push or Figma writes; stop on a serious error. This
supersedes the earlier local prompt's manual-commit/one-step-only preference.
No Task/Project approval or scope transfer to another owner is implied.

Live start gate: READY_TO_CLAIM at 2026-11-01T15:51:53Z. Base: step 2 `e5f92d2`.

| Gap | Finding / action | Boundary |
| --- | --- | --- |
| Design reads | Starter quota reached for create43:106, join268:1952/268:2081 and tutorial368:17115. Tutorial T01 368:16838 returned full context/screenshot. Reuse received tokens/components/reference patterns and the user's clarification; later frames are unverified, not declared pixel-parity | No Figma write, subscription change or quota bypass |
| GM-10 dish-only setup | Received GM-10.1 is still a location-dependent legacy form. New create entry presents the setup seam without duplicating controls or requiring location; missing producer is shown honestly | Product entry cannot yet complete dish-only creation. Legacy APIs/form remain available for compatibility/QA, not falsely presented as the new flow |
| Unnecessary legacy fixture | Room layout eagerly created a GM-10 mock room even on other room screens. Enable that fixture only on its context/preferences routes | In-memory mock fixture only, no database/contract change |
| Join preview | GM-07.1 ApiClient has no previewJoin method. Add an explicit UI-only preview port/fixtures, no pre-join member snapshot, roster or invented live preview | Real B adapter belongs to GM-07/25; no DTO/RPC rewrite |
| Tutorial controls | GM-09 requires skip/replay/Back and accessible action buttons even where the picture only shows a gesture/spotlight | Small same-pattern additions; isolated sample state, no room/ballot mutations |

Device/visual checks and upstream producer limitations remain open acceptance
items. Completing independent UI candidates does not mark those integrations or
GM-09 Done. No new API/schema/storage/native dependency is introduced.

Final status: source candidate `a4dbdec`, full mobile795 tests Pass; see
[handoff/matrix](FINAL_HANDOFF.md). Create setup callback remains unavailable
until the updated GM-10 artifact exists. Mock join has its explicit public UI
fixture; real Home retains GM-07.1 integration, not an invented B preview.
Read-only preview cancellation, write/ref guards, Back/skip/replay/undo and
wrapping labels are implemented. Rate-limited frames remain unverified: these
are requirement-backed controls, not a verified claim that every such control
is absent from the unseen Figma frames. No design or upstream approval was made.
