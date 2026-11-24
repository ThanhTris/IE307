# GM-50 handoff

Branch: `codex/gm50-legal-pages` from `origin/main` at `d9332f7`.

## Delivered for review

- `docs/legal/PRIVACY_POLICY.md` — Vietnamese policy and English summary, grounded in current source and Android v1 scope.
- `docs/legal/TERMS_OF_SERVICE.md` — usage terms.
- `docs/legal/ACCOUNT_DELETION.md` — in-app path and external email request path aligned with the operator path in GM-49.
- `docs/legal/STORE_PRIVACY_ANSWERS.md` — provisional Play Data safety and Apple App Privacy mapping; not submitted.
- `docs/legal/index.md`, `support.md`, `_config.yml` — static public page source with stable routes.
- `.github/workflows/legal-pages.yml` — PR build and main-branch GitHub Pages deployment workflow. It holds deployment if publisher/contact information is missing.

## Required before publication or review completion

1. Publisher name **Nguyễn Thanh Trí** and public privacy/support email `23521645@gm.uit.edu.vn` were supplied on 2026-11-24.
2. Reconcile the documents against the exact release APK/AAB and Supabase production configuration, especially Sentry, push, region, backup retention, and account deletion behavior.
3. Before merge, Trí enables GitHub Pages with source **GitHub Actions**. After merge, confirm each deployed URL opens without sign-in:
   - `https://thanhtris.github.io/IE307/privacy/`
   - `https://thanhtris.github.io/IE307/terms/`
   - `https://thanhtris.github.io/IE307/delete-account/`
   - `https://thanhtris.github.io/IE307/support/`
4. Run the workflow and inspect the final rendered pages, then update CHECKS with the run, URL, revision, and review evidence.
5. Trí verifies current Play Console/App Store Connect form labels, reviews `STORE_PRIVACY_ANSWERS.md`, and submits the forms manually when authorized by the release plan.

`python scripts/task_readiness.py --task GM-50 --gate merge --base-ref origin/main --verify-outputs` returned `READY_FOR_MERGE_REVIEW` on 2026-11-25 for target `d9332f73679eead23844ecaf927515c5ca623c9e`. The PR is for review; no Project status or approval was changed.
