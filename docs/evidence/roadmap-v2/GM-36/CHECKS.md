# GM-36 checks

Updated 2026-11-19. Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
PR #123 integrates main `5bbee5d`. GM-34 delivered RELEASE, CHECKS, FIGMA_PARITY
and HANDOFF in `5a69b56`. [Release](../GM-34/RELEASE.md)

| Scope | Result | Evidence and limits |
| --- | --- | --- |
| Start gate | `READY_TO_CLAIM` | [Live start](readiness-2026-11-19/start.txt) on `5bbee5d` |
| Merge/output checker | `READY_FOR_MERGE_REVIEW` | [Live merge](readiness-2026-11-19/merge.txt) checks artifacts and dependencies. Trí decides whether to accept the independent scope. |
| Strict TypeScript, Node, Python feature checks | Pass | 48 Node tests, 12 Python tests. Includes ambiguous prices at high confidence, null/source/unit, auth and quota boundaries, and cleanup ownership guards. |
| Python regression, repository and index validation | Pass | 703 Python tests, 6 skipped. Repository and task index checks passed. |
| Dish-only and legacy import boundary | Pass offline | Both importers reject the standalone draft before DB access. Dish-only requires provenance and preserves nullable fields and typed units without venue/offering/hours/coverage. OCR does not infer taxonomy. |
| HTTP, GoTrue and draft schema | **15/15 Pass** | [CI at `709defe`](https://github.com/ThanhTris/IE307/actions/runs/44497479002). GoTrue Auth and HTTP ran on disposable QA with a test recognizer. [HTTP assertions](readiness-2026-11-19/results.json), [draft](readiness-2026-11-19/actual-draft.json) and [schema/import assertions](readiness-2026-11-19/contract-results.json). Both importers rejected the draft. Guest cleanup and QA stop passed. |
| Real recognizer, rights, privacy, quota/cost and accuracy | Not run | Provider and permitted-menu pilot await reviewer decision. [Provider dossier](PROVIDER_REVIEW.md) |
| Edge deployment and device | Not run | Independent draft pipeline runs through a Node-hosted Web handler. GM-36 has no Android consumer in this scope. |

The reported CI run tested `709defe40390cc42e2da812885acff6c8a360509`. Its HTTP source hashes
match this documentation update. The first Linux run found a cleanup CLI argument
mismatch. The test runner now passes the verified manifest and guest namespace.

The prior macOS run stopped during disposable QA startup with
`QA_HOST_BINDING_NOT_LOOPBACK`. Its reports remain in the
[18 November record](continuation-2026-11-18/MANIFEST.json). The entrypoint stays
disabled. The handler returns drafts only and never activates a catalogue or
publishes data. Earlier October reports apply to their recorded revisions.

Historical red-run output had whitespace on blank lines. The Git diff
normalizes those lines. Original bytes are available at the prior PR head
`0608d3e`.
