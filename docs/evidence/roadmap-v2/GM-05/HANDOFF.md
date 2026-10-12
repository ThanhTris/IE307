# GM-05 handoff — shared UI components

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

## Người nhận tiếp

GM-09 có thể dùng component map và preview làm seam để dựng Home/create/join mock ngay sau khi GM-05 được review/merge; không chờ GM-25/30/39 hoặc dataset thật. GM-25/30 sau đó thay repository/native behavior tại composition/integration layer, không đưa API/GPS/QR/Maps vào shared component. Room code từ GM-07 mock/client hiện là 6 ký tự theo ROOM_SPEC (`GCD234` fixture); server production vẫn chịu uniqueness/authorization.

## Blocker

Start gate live từng `BLOCKED_ON_BASE` vì artifact GM-02 trên `origin/main` khác hồ sơ bàn giao ở `mobile/README.md` và `mobile/tests/README.md`; merge gate đã có bản ghi `READY_FOR_MERGE_REVIEW` nhưng chưa refresh được do thiếu credential `read:project`. Owner GM-02/reviewer cần đối chiếu trước merge; code component độc lập đã được kiểm local nhưng chưa thể ghi task Done thay cho Project gate.
