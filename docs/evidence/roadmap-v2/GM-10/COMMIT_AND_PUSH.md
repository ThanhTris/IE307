# GM-10 — commit, push và gửi PR cho Trí

Thực hiện tại `E:\Workspace\project\IE307` bằng PowerShell. Agent chỉ chuẩn bị hồ sơ; người dùng chạy các lệnh dưới đây. Chỉ Trí (`ThanhTris`) được merge và chuyển Done.

## 1. Kiểm nhánh và thay đổi

```powershell
git branch --show-current
git status --short
git diff --check
```

Nhánh phải là `codex/gm-10-context-and-preferences`. Nếu khác hoặc có file staged không thuộc GM-10, kiểm lại trước commit. Không xóa hoặc khôi phục thay đổi chưa commit để đổi nhánh. Xác nhận Expo Go đã ghi tại [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md); [CHECKS](CHECKS.md) ghi tests và giới hạn.

## 2. Stage đúng phạm vi GM-10

```powershell
$gm10Paths = @(
    'mobile/README.md'
    'mobile/src/app/gm10/_layout.tsx'
    'mobile/src/app/gm10/context.tsx'
    'mobile/src/app/gm10/preferences.tsx'
    'mobile/src/app/index.tsx'
    'mobile/src/app/shell.tsx'
    'mobile/src/bootstrap/roomSetupPreview.tsx'
    'mobile/src/features/context/components/SetupFrame.tsx'
    'mobile/src/features/context/components/MealDateTimeFields.tsx'
    'mobile/src/features/context/hooks/useRoomSetup.ts'
    'mobile/src/features/context/screens/ContextScreen.tsx'
    'mobile/src/features/context/services/roomSetup.ts'
    'mobile/src/features/home/screens/AppShellScreen.tsx'
    'mobile/src/features/home/screens/HomeScreen.tsx'
    'mobile/src/features/preferences/screens/PreferencesScreen.tsx'
    'mobile/tests/component/roomSetupScreens.test.tsx'
    'mobile/tests/component/MealDateTimeFields.test.tsx'
    'mobile/tests/integration/routes.test.tsx'
    'mobile/tests/unit/roomSetup.test.ts'
    'docs/evidence/roadmap-v2/GM-10'
    'tasks/backlog/GM-10.md'
)
git add -- $gm10Paths
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Danh sách này gồm 18 file source/test theo manifest, mobile README, task và evidence GM-10. `bugs.md` là ghi chú cá nhân chưa track; phản hồi đã được chép/đối chiếu trong các báo cáo evidence, không cần stage file đó. Không stage `.work`, `.env`, token, thư mục build/export hoặc thay đổi khác. Nếu trước đó đã stage file khác, lệnh `git add` trên không tự bỏ chúng; kiểm danh sách cached trước bước tiếp.

Cảnh báo LF/CRLF là thông báo chuyển line endings của Git, không phải lỗi stage. Sửa lỗi thực sự nếu `git diff --cached --check` báo lỗi; không đổi cấu hình toàn máy chỉ để ẩn cảnh báo.

## 3. Commit và push nhánh

Chỉ chạy sau khi danh sách staged đúng và lệnh kiểm không báo lỗi:

```powershell
git commit -m "feat(gm10): add context and preference setup UI"
git push -u origin codex/gm-10-context-and-preferences
git log -1 --oneline
git status --short --branch
```

`bugs.md` có thể vẫn hiện `??`; đó là ghi chú không đưa vào commit. Giữ nguyên để dùng tiếp. Nếu push bị reject vì remote có commit mới, kiểm tra nhánh remote trước khi tiếp tục; không force push.

## 4. Mở hoặc cập nhật pull request

Trên GitHub repo `ThanhTris/IE307`, kiểm có PR đang mở cho nhánh này chưa. Nếu có thì cập nhật PR đó; nếu chưa thì mở **New pull request**:

- Base: `main`; compare: `codex/gm-10-context-and-preferences`.
- Title: `feat(gm10): add context and preference setup UI`.
- Description: copy toàn bộ [PR_BODY.md](PR_BODY.md). Nếu description đang có khung do Trí viết, giữ yêu cầu riêng của khung và dùng nội dung đã điền tương ứng; không đánh dấu đã được Trí duyệt.
- Reviewer: chọn `ThanhTris` nếu GitHub hiển thị mục chọn reviewer. Nếu không có quyền chọn, gửi link PR cho Trí qua kênh nhóm đang dùng.
- Kiểm **Files changed** đúng phạm vi và **Checks** trên chính commit vừa push. Hồ sơ đã ghi check Expo online exit1; không báo mọi check đều xanh nếu GitHub chưa chạy hoặc đang fail.
- Bấm **Create pull request** khi mô tả/phạm vi đúng, rồi gửi link để Trí review. Nếu nhóm dùng draft để bổ sung checks, mở draft trước; không tự merge hoặc chuyển task Done.

Trước merge, Trí cần cập nhật ref target, chạy merge gate live và đối chiếu upstream/AC/revision theo CHECKS/workflow. Tài liệu chuẩn bị PR không thay bước đó.

## 5. Sau khi gửi review

Chờ Trí phản hồi. Nếu được yêu cầu sửa, sửa trên cùng nhánh, chạy checks liên quan rồi tạo commit mới và `git push`; PR tự cập nhật. Khi Trí chưa merge/Done, không tự coi GM-10 đã nghiệm thu hoặc chuyển task Markdown vào `tasks/done`.
