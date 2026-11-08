# GM-05 handoff — shared UI components

## Supplement 2026-11-05 — BrandLogo Vector Component

Bàn giao component logo thương hiệu cho các màn hình downstream (`GM-09`, `GM-10..14`, `GM-24..31`):
1. **Component:** `BrandLogo` tại `mobile/src/shared/ui/layout/BrandLogo.tsx`, xuất từ `mobile/src/shared/ui/index.ts`.
2. **Nguồn vector:** `mobile/assets/brand/gi-cung-duoc-logo.svg` (Figma node `22:394`, SHA-256 `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`).
3. **Thuộc tính & hành vi:**
   - Hỗ trợ prop `size` (mặc định 44dp), `testID`, và `accessibilityLabel`.
   - Giữ nguyên màu sắc và tỷ lệ vuông 1:1 (`preserveAspectRatio="xMidYMid meet"`).
   - Khi đứng cạnh chữ thương hiệu (mặc định không có `accessibilityLabel`), component tự đặt `accessible={false}` và `importantForAccessibility="no"` để hỗ trợ TalkBack không đọc lặp.
   - Khi đứng độc lập (có truyền `accessibilityLabel`), component mở `accessible={true}`, `accessibilityRole="image"`.
4. **Kiểm tra trực quan & mẫu preview:**
   - Xem preview trực tiếp tại màn `/dev/components` (`ComponentPreviewScreen`), hiển thị 3 kích thước trên cả nền sáng và tối (`#043B22`); nền shell ở `/dev/foundation`.
5. **Tiêu chuẩn kiểm thử:**
   - 23 tests component đã ghi trong [CHECKS](CHECKS.md). [CI commit `4903256`](https://github.com/ThanhTris/IE307/actions/runs/41957120783) đạt 56 suites / 954 tests toàn mobile; con số 214 tests toàn mobile ghi trước đó không khớp và đã được đính chính. Tập con local năm suite component/route đạt 93/93 tests của cùng revision được ghi riêng.
   - Visual logo trên thiết bị, TalkBack và icon/splash native của supplement SVG vẫn **Not run**; bằng chứng props/export không thay kiểm thiết bị.

## Supplement 2026-10-27 — Home component consumption

The current Home screen now reuses the tested shared `AppHeader`, `AppButton`, and `AvatarRow`; two reusable GM-05 components, `BrandBanner` and `AppBottomNavigation`, carry the approved dining illustration and Home tab bar. Figma assets are local and provenance/hash-logged in [`mobile/assets/brand/SOURCE.md`](../../../../mobile/assets/brand/SOURCE.md). The 46 targeted component/route tests, typecheck, architecture check, and Android export passed; lint has four existing warnings. The updated Home still needs an emulator visual check. API/session handlers stay in the feature/root composition; shared UI components only render props and trigger callbacks.

## Supplement 2026-10-27 — palette and brand mark

PR #137's current local revision updates the shared Light palette from the approved Figma palette, uses the official G mark in `AppHeader`, and adds pressed-state colors to `AppButton`. The exported logo provenance/hash is recorded at `mobile/assets/brand/SOURCE.md`. The shared component test asserts the palette (9/9 targeted tests pass). The updated revision has not been rechecked visually in Expo Go/emulator; this supplement is not GM-05 approval or task completion. GM-09 still owns the Figma Home layout and artwork.

Owner Trung / reviewer Trí theo phân công hiện hành. Contract `food-v1/roadmap-v2/GM-05.1`. Nhánh được tạo từ `origin/main` `9188c736def7e125266f8cce2314b9f1f5c31b81`; tested code commit `b66d9e3`. Không tự Approved/Done.

## Artifacts

- `mobile/src/shared/theme/tokens.ts`: light/dark tokens, typography, spacing, radius.
- `mobile/src/shared/ui/index.ts` and `components.tsx`: reusable props-only components.
- `mobile/src/features/home/screens/ComponentPreviewScreen.tsx`: fixture-labeled composition example.
- `mobile/src/app/components.tsx`: Expo route; `/foundation` has link to preview.
- `docs/design/COMPONENT_MAP.md`: mapping and downstream boundaries.
- `mobile/tests/component/sharedComponents.test.tsx` and `mobile/tests/integration/routes.test.tsx`: interaction/route assertions.

## Chạy và kiểm

```powershell
Set-Location (git rev-parse --show-toplevel)
Push-Location mobile
npm ci --no-audit --no-fund
npm run check
npm start -- --go --lan
Pop-Location
```

Trong Expo Go Android mở `/foundation` → `Mở component mẫu GM-05`; kiểm dark mode, font scaling 200%, TalkBack labels, màn nhỏ 320–599dp, touch target, fallback ảnh và modal back/close. Ghi device/revision/screenshot vào CHECKS trước review. Preview dùng synthetic fixture, không gọi API và không chứng minh native/verified data.

Xác nhận thủ công: Trí đã mở Expo Go và xác nhận các component hiển thị/tương tác ổn trên revision `31148c7` ngày 2026-10-12. Chưa có model thiết bị hoặc screenshot được lưu kèm evidence.

## Người nhận tiếp

GM-09 có thể dùng component map và preview làm seam để dựng Home/create/join mock ngay sau khi GM-05 được review/merge; không chờ GM-25/30/39 hoặc dataset thật. GM-25/30 sau đó thay repository/native behavior tại composition/integration layer, không đưa API/GPS/QR/Maps vào shared component. Room code từ GM-07 mock/client hiện là 6 ký tự theo ROOM_SPEC (`GCD234` fixture); server production vẫn chịu uniqueness/authorization.

## Historical gate note

Earlier GM-02 artifact/gate mismatch and Project credential failures were resolved for this revision. Current live results are recorded below and in [`CHECKS.md`](CHECKS.md). GM-05 still requires owner visual/device review before it can be marked Done.

## Supplement 2026-10-29 — GM-05.2 implementation branch

Branch: `codex/gm05-figma-components`; implementation commit `4210278` (`feat(gm-05): align shared components with Figma PDF`), based on `origin/main` / `5c339cf351ca4e37d95d4d0e8211be0ccb8a8af3`. Contract referenced by the current UI handoff: `ui-figma-final/2026-10-25/GM-05.2`. This supplement records implementation and local checks only; it does not mark the task Done/Approved.

### Implementation and entry point

Extended the shared tokens/components and the synthetic preview. Open the app, visit `/foundation`, then tap **Mở component mẫu GM-05** to reach `/components`. The preview demonstrates interactive dish count and preference selection, a room header/back action, member summary, waiting progress, tied podium, tutorial button alternative, stale/empty/loading/error/shortage states. Fixtures are synthetic; no API or live room is used. Current component/node references remain in [`COMPONENT_MAP.md`](../../../design/COMPONENT_MAP.md).

Source files changed: `mobile/src/shared/theme/tokens.ts`, `mobile/src/shared/ui/components.tsx`, `mobile/src/features/home/screens/ComponentPreviewScreen.tsx`, `mobile/tests/component/sharedComponents.test.tsx`, `docs/design/COMPONENT_MAP.md`.

### Reproduce local checks

```powershell
Set-Location mobile
npm ci --no-audit --no-fund
npm run check:expo
npm run check
npm run bundle:android
```

Also run at repository root:

```powershell
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

### Known limits and blockers

- The local Figma PDF was opened in Chrome and visually inspected on pages 27–33. It clarified the component overview and concrete tutorial, waiting, collection, connection, and shortage states. A same-viewport Expo/device comparison and exported live design-context payload were not obtained; see [`FIGMA_PARITY.md`](FIGMA_PARITY.md).
- Trung reports a manual Android check in chat on 2026-10-29. Device/build/revision, route/scenarios, expected/actual, assertions, and screenshots/logs are not attached; this environment has no Android SDK/device/adb to reproduce it. Keep device AC marked **Not run** until that evidence is added. Android export is only a bundle check.
- Live Project gates were rerun with the GitHub CLI credential after the Python checker initially read a different Windows credential. GM-02 and GM-04 are Done; GM-05 is Needs Update and assigned to Trung. Start gate reports `READY_TO_CLAIM`; merge gate reports `READY_FOR_MERGE_REVIEW` against fetched `origin/main` `5c339cf351ca4e37d95d4d0e8211be0ccb8a8af3`. These are task-readiness results, not a task approval or Done state.
- Repository Python suite final rerun: 642 tests, 6 skipped, OK. `tzdata` and the pinned `jsonschema` from `scripts/ci-requirements.txt` were installed in the user Python site for the check; no Python dependency file changed.
- No production behavior, native UI acceptance, or Figma pixel parity is claimed.

## Supplement 2026-10-29 — direct local Figma file

Trung saved the Figma `.fig` and `.pdf` sources under `design-input/` (12,590,824 and 5,648,112 bytes). The PDF contains 33 pages; pages 27–33 show component and state references. Direct inspection of Figma node `617:1671` yields dense-rank tie behavior; `ResultPodium` retains all supplied rank 1/2/3 entries in a horizontal scroll row. `TutorialGesture` now shows all four actions in two tones and a button alternative. The reference uses vector hand icons; the implementation uses platform text symbols until visual review. Device/same-viewport verification remains Not run; this does not claim visual parity or approval. See `FIGMA_PARITY.md`.
