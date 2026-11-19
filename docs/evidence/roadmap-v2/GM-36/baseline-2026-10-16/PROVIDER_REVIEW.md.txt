# GM36 provider/native review — Pending Trí

No recognizer/provider/library is selected or approved in this revision. The task
and EXTENSIONS_SPEC target on-device OCR; no new package, cloud endpoint or native
module is installed. This dossier is for the post-GM34 integration decision.

| Item to decide/review | Current evidence | Required before enabling |
| --- | --- | --- |
| Recognition placement/adapter | Typed port, pure normalization, disabled entry | Confirm on-device flow and trust boundary; any server processing needs explicit architecture/privacy review |
| Vendor/model/library/version | None | Chosen implementation/version/owner, license/redistribution terms, native build/size support |
| Image rights/data source | Mandatory declaration; sourceRightsVerified=false | Actual permitted menu/source and curator confirmation; no generated rights approval |
| Privacy/data egress/retention | No external recognizer; in-memory images only | Concrete payload map, network destinations/region, logging/retention/consent and deletion behavior |
| Quota/cost/abuse | Test-only3/min/user, one in-flight,128 window cap | Reviewed operator/admin permission model, distributed admission/quota/cost caps or local-only equivalent, failure/timeout policy |
| Input/decoder safety |1MiB/container checks/PNG dimensions | Safe real decoder, decompression/dimension limits/metadata handling; malformed corpus |
| Accuracy/pilot |1×1 synthetic image + manually written provider rows only | Real permitted Vietnamese menus, multi-column/blur/reflection/small fonts, line/price alignment, price units; define accuracy target BEFORE measurement |
| Confidence policy | Proposed0.85; explicit null/manual fallback | Confidence calibration and decision to retain manual entry if target not met |
| Import/publication | Existing GM08 rejects MenuDraft | Human correction/source binding/offering/coverage/schedules/freshness + ordinary GM08 guards; no direct publish |
| Release gate | GM34 Todo at start check | GM34 Done/output/version and current target merge gate, plus real recognizer/Edge/native checks for chosen scope |

Reviewer: ThanhTris/Trí. Decision/date/revision/evidence: Pending; AI does not fill
approval fields. No production flag, provider call or cloud billing is authorized
by a test adapter or this review form. No independent reviewer is required beyond
Trí under ADR013; this does not waive real source/accuracy/provider evidence.
