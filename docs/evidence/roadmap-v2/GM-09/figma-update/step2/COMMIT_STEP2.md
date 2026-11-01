# Commit step 2 locally — do not include prompt.md

Base before this step: `8172241` on `codex/gm-09-figma-update`.
The agent has not staged/committed/pushed. Review the candidate and device limits
in STEP2.md and current GM-09 CHECKS before saving this step.

From the repository root:

```powershell
Set-Location E:\Workspace\project\IE307
if ((git branch --show-current).Trim() -ne 'codex/gm-09-figma-update') { throw 'Sai nhánh' }
git status --short --branch
git diff --check
git check-ignore -v prompt.md

git add -- mobile/src/app/index.tsx mobile/src/app/continue-session.tsx mobile/src/app/dev/home.tsx
git add -- mobile/src/features/home/screens/HomeScreen.tsx mobile/src/features/home/screens/ContinueSessionScreen.tsx mobile/src/features/home/screens/GuestSessionExpiredScreen.tsx mobile/src/features/home/screens/HomePreviewScreen.tsx
git add -- mobile/src/features/home/components/HomeFlowFrame.tsx mobile/src/features/home/hooks/useHomeRoom.ts mobile/src/features/home/fixtures/homePreview.ts
git add -- mobile/src/features/rooms/hooks/useRoomEntry.ts mobile/src/shared/ui/buttons/AppButton.tsx mobile/src/shared/ui/layout/AppHeader.tsx mobile/src/shared/ui/layout/BrandBanner.tsx
git add -- mobile/assets/brand/home/SOURCE.md mobile/assets/brand/home/back.png mobile/assets/brand/home/create.png mobile/assets/brand/home/join.png mobile/assets/brand/home/friends-dining-slot.png
git add -- mobile/tests/component/homeScreen.test.tsx mobile/tests/integration/guestEntryRoute.test.tsx mobile/tests/integration/routes.test.tsx mobile/tests/integration/resultRoutes.test.tsx
git add -- docs/evidence/roadmap-v2/GM-09/PLAN.md docs/evidence/roadmap-v2/GM-09/CHECKS.md docs/evidence/roadmap-v2/GM-09/HANDOFF.md docs/evidence/roadmap-v2/GM-09/FIGMA_PARITY.md
git add -- docs/evidence/roadmap-v2/GM-09/figma-update/step2/STEP2.md docs/evidence/roadmap-v2/GM-09/figma-update/step2/COMMIT_STEP2.md docs/evidence/roadmap-v2/GM-09/figma-update/step2/MANIFEST.json
git add -- docs/evidence/roadmap-v2/GM-09/figma-update/step2/figma-home.png docs/evidence/roadmap-v2/GM-09/figma-update/step2/figma-continue.png docs/evidence/roadmap-v2/GM-09/figma-update/step2/figma-expired.png

git diff --cached --check
git diff --cached --name-only
git diff --cached --name-only -- prompt.md
git diff --cached --stat
```

The staged prompt command must print nothing. No `.work`, credentials or bundle
output belongs in the staged diff. Do not use `git add .` or `git add -f`.
After reviewing the exact staged diff:

```powershell
git commit -m "feat(gm09): align Home and resume states with Figma"
git status --short --branch
git log -3 --oneline
```

The user may keep this and the merge commit locally and commit later steps
separately. Push when desired, without squashing those commits:

```powershell
git push -u origin HEAD:refs/heads/codex/gm-09-figma-update
```

A local candidate commit/push is not Trí approval, full visual acceptance or
permission to merge into main. Resolve/reproduce mandatory failed checks in the
supported environment before declaring the task complete.
