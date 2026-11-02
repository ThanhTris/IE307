# GM-09 — receive main refactor, 2026-11-01

Branch: `codex/gm-09-figma-update`. Existing step 1 commit: `07fd340`.
The user started merging main at `90e871a` (including mobile refactor `67f332d`).
This patch adapts the GM-09 candidate to that structure. It does not complete later
GM-09 steps, activate database migrations or record review/approval.

## Resolution

- Home uses `HomeScreen` and main's `/room/*`, social and `/dev/*` routes, while
  preserving the guarded `/welcome` entry for a new guest.
- The old `shared/ui/components.tsx` remains deleted as on main. GM-09's optional
  `hideLabel` and `inputStyle` move to `shared/ui/forms/FormField.tsx`. Defaults and
  the accessible input label remain unchanged.
- Route tests use main's relocated route modules and keep the fresh guest test,
  mock-name fixture and assertions that entry does not create a real session/room.
- Guest screen and component test import `HomeLiveSession` from `HomeScreen`.
- The auto-merged `room/create.tsx` and `room/join.tsx` retain the mock guest name.

The original `MANIFEST.json` and `STEP1.md` describe the historical step 1
snapshot, before this merge; their old file paths/hashes are not this revision's
source manifest. The original step 1 commit instructions are historical too.

## Verification

Live start gate: `READY_TO_CLAIM`, checked 2026-11-01T14:48:24Z from Project #2.
Owner Tuấn, reviewer Trí; no Project writes.

Verification results are recorded in the current GM-09 CHECKS/HANDOFF supplement.
Android/device visual, font scaling, TalkBack, keyboard and hardware Back acceptance
remain Not run for this revision.

## Finish the user's pending merge

The agent edits the working tree only. Git still reports unmerged index entries
until the user stages these resolutions. From the repository root, review the
diff and run:

```powershell
git branch --show-current
git add -- mobile/src/app/index.tsx mobile/tests/integration/routes.test.tsx
git add -u -- mobile/src/shared/ui/components.tsx
git add -- mobile/src/shared/ui/forms/FormField.tsx
git add -- mobile/src/features/home/screens/GuestEntryScreen.tsx mobile/tests/component/guestEntryScreen.test.tsx
git add -- docs/evidence/roadmap-v2/GM-09/CHECKS.md docs/evidence/roadmap-v2/GM-09/HANDOFF.md
git add -- docs/evidence/roadmap-v2/GM-09/figma-update/MAIN_MERGE_2026-11-01.md docs/evidence/roadmap-v2/GM-09/figma-update/COMMIT_STEP1.md
git diff --name-only --diff-filter=U
git diff --cached --check
git diff --cached --stat
```

The branch must be `codex/gm-09-figma-update`; the unresolved-files command must
print nothing. Main's other merged changes
were already staged by the user's merge and belong in the resulting merge commit.
Review those changes too. Stage only the intended source, tests and evidence.

After review and checks:

```powershell
git commit -m "merge: integrate main refactor into GM-09 welcome flow"
git push origin HEAD:refs/heads/codex/gm-09-figma-update
```

These are user-run commands, not evidence that a commit/push or task acceptance
has happened. A candidate merge commit does not close remaining device or
repository regression issues.
