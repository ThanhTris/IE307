# GM36 provider review dossier — decision required

2026-11-19; reviewer Trí (ThanhTris). No selection or approval has been recorded.
GM34 is Done on Project and the four handoff files landed in `5a69b56`.

| Decision | Current evidence | Needed before enabling |
| --- | --- | --- |
| Placement | EXTENSIONS_SPEC targets on-device; typed port and disabled entry | Confirm concrete implementation and trust boundary; server OCR needs architecture/privacy review |
| Library/vendor/version | None chosen, no new dependency | Version/license/redistribution/native size/build review |
| Permitted images | Only synthetic 1x1 test image; fixture rows manually authored | Real menu/source rights and curator confirmation |
| Privacy | In-memory input, no external recognition call; draft excludes image/token | Selected implementation payload/egress/region/logging/retention/deletion/consent evidence |
| Quota/cost | Test-only memory quota: 3/min/user, one in flight | Approved local equivalent or distributed quota/billing cap/operator model |
| Decode safety | MIME/container/size/dimension validation only | Real decoder/decompression/metadata safety and malformed-image corpus |
| Confidence | Proposed threshold 0.85; ambiguous fields remain null | Calibration and manual fallback policy |
| Accuracy | No real recognition performed | Agree accuracy target before measuring Vietnamese layouts, blur, columns, name-price/unit alignment |
| Import | Both real importers reject MenuDraft | Human correction/source/taxonomy review; dish-only does not require venue/coverage/hours; legacy checks only for legacy export |
| Release inputs | Live checker READY_FOR_MERGE_REVIEW for artifacts and dependencies | Trí decision on the scope of PR #123; provider/pilot evidence for full OCR |

Decision/date/approved revision: Pending Trí. These fields are intentionally not
filled by AI. A test recognizer, source declaration or CI success cannot supply
provider approval or real menu accuracy evidence.
