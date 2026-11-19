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
| HTTP, GoTrue and draft schema | See CI for the PR revision | The GM-36 workflow runs 15 HTTP scenarios in an owned GM-03 QA environment and publishes HTTP results with source hashes, the synthetic draft and both importer assertions. Auth/HTTP execute for real. Recognition uses a test double. |
| Real recognizer, rights, privacy, quota/cost and accuracy | Not run | Provider and permitted-menu pilot await reviewer decision. [Provider dossier](PROVIDER_REVIEW.md) |
| Edge deployment and device | Not run | Independent draft pipeline runs through a Node-hosted Web handler. GM-36 has no Android consumer in this scope. |

The prior macOS run stopped during disposable QA startup with
`QA_HOST_BINDING_NOT_LOOPBACK`. Its reports remain in the
[18 November record](continuation-2026-11-18/MANIFEST.json). The entrypoint stays
disabled. The handler returns drafts only and never activates a catalogue or
publishes data. Earlier October reports apply to their recorded revisions.
