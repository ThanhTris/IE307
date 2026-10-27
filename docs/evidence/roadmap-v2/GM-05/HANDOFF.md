# GM-05 handoff — shared UI components

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
Set-Location 'C:\Users\ADMIN\.codex\worktrees\b952\Project'
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

## Blocker

Start gate live từng `BLOCKED_ON_BASE` vì artifact GM-02 trên `origin/main` khác hồ sơ bàn giao ở `mobile/README.md` và `mobile/tests/README.md`; merge gate đã có bản ghi `READY_FOR_MERGE_REVIEW` nhưng chưa refresh được do thiếu credential `read:project`. Owner GM-02/reviewer cần đối chiếu trước merge; code component độc lập đã được kiểm local nhưng chưa thể ghi task Done thay cho Project gate.
