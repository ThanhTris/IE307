# GM-36 continuation — 2026-11-19

Owner Tâm requests completion; reviewer Trí remains Pending. Reuse PR123 and branch
`codex/gm-36-menu-ocr`, updated from main `5bbee5d`. Keep one task/PR. Preserve the
main task Markdown verbatim, as requested by Trí on PR123; implementation notes live here.

Scope authorized independently since 2026-10-16: draft handler, normalization,
contract checks and isolated HTTP tests. This continuation addresses the four
review follow-ups: current main, dish-only profile, revision/evidence and merge gate.

1. Reuse GM03 sealed QA manifest and GM40 ownership verifier; require an explicit
   manifest before Auth or cleanup. No fallback to the application stack.
2. Keep GM36.1 wire bytes and production entrypoint disabled. Source/confidence/
   nullable/PriceUnit are retained. Do not infer taxonomy or require venues/hours
   for dish-only. Both real importers must reject the standalone OCR draft.
3. Run strict TS, Node/Python unit, actual HTTP/GoTrue with a test recognizer,
   schema/semantic/import guards, full Python regression and repository checks.
4. Capture hashes of actual tested sources, separate historical evidence, and
   run live merge gate with --verify-outputs. Do not fabricate producer output.

The start checker returns READY_TO_CLAIM. GM34 handoff is on main at `5a69b56`.
The merge checker returns READY_FOR_MERGE_REVIEW for the files and dependencies.
The proposed delivery covers the independent draft pipeline. Full OCR remains
subject to Trí’s scope decision, provider selection and a permitted-menu pilot.
