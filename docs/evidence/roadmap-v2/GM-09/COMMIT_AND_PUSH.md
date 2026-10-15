# GM-09 — hướng dẫn commit, push và gửi Trí review

Agent chỉ cập nhật tài liệu và chuẩn bị hướng dẫn; chưa stage/commit/push/tạo PR. Chỉ Trí (`ThanhTris`) được merge và chuyển task Done. Các lệnh dưới đây do người dùng chạy sau khi kiểm diff.

## 1. Kiểm nhánh và thay đổi

Mở PowerShell:

```powershell
cd E:\Workspace\project\IE307
git branch --show-current
git status --short
git diff --check
git diff --stat
```

Nhánh cần là `codex/gm-09-home-create-and-join-room`. Source/test đã kiểm có hashes tại [manifest](REVIEW_PACKAGE_MANIFEST.json), kết quả ở [CHECKS](CHECKS.md). Không đổi source/test sau kiểm mà giữ nguyên xác nhận của revision cũ; nếu có sửa thêm, kiểm lại phần bị ảnh hưởng.

## 2. Stage đúng phạm vi GM-09

Các đường dẫn sau khớp phạm vi đã kiểm khi chuẩn bị bàn giao, gồm sửa feature, shared AppButton, tests và tài liệu/logs. Kiểm lại nếu có thêm thay đổi ngoài phiên này.

```powershell
$gm09Paths = @(
  'mobile/src/features/home/screens/HomeScreen.tsx'
  'mobile/src/features/rooms'
  'mobile/src/shared/ui/components.tsx'
  'mobile/tests/component/roomEntryScreens.test.tsx'
  'mobile/tests/component/sharedComponents.test.tsx'
  'mobile/tests/integration/routes.test.tsx'
  'docs/evidence/roadmap-v2/GM-09'
  'tasks/backlog/GM-09.md'
  'GM-09-report.md'
)
git add -- $gm09Paths
git diff --cached --check
git diff --cached --stat
```

Kiểm danh sách staged đủ code/tests và evidence, không lẫn `.env`, `.work`, `node_modules` hoặc output bundle `dist`. Chưa commit nếu staged có file không thuộc phạm vi bạn muốn bàn giao.

## 3. Commit và push nhánh

```powershell
git commit -m "feat(gm09): complete Home and room entry UI"
git push -u origin codex/gm-09-home-create-and-join-room
git log -1 --oneline
git status --short --branch
```

Commit mới chứa cả code và tài liệu; SHA in ở bước cuối là revision PR để Trí review. Dùng push thường, không force-push. Nếu push bị rejected vì remote đã thay đổi, đọc nguyên nhân trước khi xử lý, không tự merge hoặc đè remote. Lúc kiểm remote 2026-10-15, chưa có branch cùng tên hoặc PR mở; thông tin có thể đổi sau đó.

## 4. Tạo PR target main

Nếu đã dùng GitHub CLI và có quyền tạo PR:

```powershell
gh pr create --repo ThanhTris/IE307 --base main --head codex/gm-09-home-create-and-join-room --title "feat(gm09): complete Home and room entry UI" --body-file docs/evidence/roadmap-v2/GM-09/PR_BODY.md
```

Hoặc mở repository trên GitHub → Compare & pull request → base `main`, compare `codex/gm-09-home-create-and-join-room`, rồi dán [PR_BODY.md](PR_BODY.md). Nếu PR cùng nhánh đã có, cập nhật PR đó thay vì tạo trùng.

Chọn reviewer `ThanhTris` nếu tài khoản/GitHub cho phép; cung cấp link PR cho Trí qua quy trình nhóm. Trí tự review task của mình theo ADR-013 nếu tài khoản tạo PR là Trí; không yêu cầu reviewer độc lập. Không dùng keyword tự đóng issue, bật auto-merge hoặc chuyển task Done.

## 5. Phần dành cho Trí

Trí kiểm PR head, CI, các ca thiết bị chưa được xác nhận riêng và [biên bản văn bản](MANUAL_DEVICE_CHECK.md), cập nhật ref đích rồi chạy:

```powershell
git fetch origin
python scripts/task_readiness.py --task GM-09 --gate merge --base-ref origin/main
```

Gate chỉ kiểm dependency/artifact, không thay review hoặc tự merge. Trí quyết định thay đổi cần bổ sung, review/merge và nghiệm thu/chuyển GM-09 Done trên Project #2. Tài liệu này không ghi approval thay Trí.
