# GM-50 checks

Status: implementation candidate on `codex/gm50-legal-pages`. No public site has been deployed; no store form has been submitted.

## Scope and evidence

| Check | Status | Evidence / limitation |
| --- | --- | --- |
| Privacy policy, English summary, terms, support, account-deletion instructions | Prepared for review | `docs/legal/`; publisher and contact details are supplied; content checked against current repository source and release scope |
| Data categories and third-party processors | Drafted; release-build reconciliation required | Supabase/Auth and Google Places calls reviewed in source; push is excluded by current release scope; crash reporting depends on final Sentry build configuration |
| Retention and deletion description | Drafted; backup retention needs operator confirmation | GM-21/24 history uses up to 30 days; GM-49 deletion migration describes account cleanup and group-history redaction; production backup policy not present in repo |
| Stable public URLs | Not run | Expected project Pages URLs are documented; Pages is not enabled |
| Web deletion path | Prepared; not operational until deployment | Static page has a direct email request link to 23521645@gm.uit.edu.vn and describes the manual GM-49 operator workflow; Pages deployment remains pending |
| GitHub Pages workflow | PR build passed | Jekyll `build` job passed on PR #219 at source commit `ce83a4d` (run `45449357823`); deploy was skipped for the PR event and runs only on `main` when Pages is configured |
| Google Play / Apple form answers and content classification | Provisional mapping only | Must match exact release APK/AAB and live store forms; nothing was submitted |
| Publisher name | Supplied | Nguyễn Thanh Trí, supplied by owner on 2026-11-24 |
| Contact email | Supplied | 23521645@gm.uit.edu.vn, supplied by owner on 2026-11-24 |
| GitHub Pages setting / public URL | Not run | Owner must select Settings → Pages → GitHub Actions before merge; then confirm deployed URLs |

## Validation

- `python scripts/task_readiness.py --task GM-50 --gate merge --base-ref origin/main --verify-outputs` returned `READY_FOR_MERGE_REVIEW` on 2026-11-25, target snapshot `d9332f73679eead23844ecaf927515c5ca623c9e`; Project #2 dependencies GM-21 and GM-23 were Done.
- `python scripts/validate_repository.py` passed after replacing Jekyll template links with stable Pages URLs.
- GitHub Pages Jekyll build passed on PR #219 at `ce83a4d`; repository-wide CI still had unrelated checks pending at the time of this update.
- No workflow build, site deployment, APK/AAB audit, or store-form submission was run in this environment. The PR workflow will build the site artifact when opened.
