# Tự kiểm và commit bước 1 GM-09

Agent chưa stage/commit/push. Đây là candidate của bước welcome/guest; kiểm Expo Go và sai khác trong [FIGMA_PARITY](../FIGMA_PARITY.md) trước khi nghiệm thu. Một commit để giữ mốc code không đồng nghĩa task đã Done hoặc được phép merge.

## 1. Kiểm đúng nhánh và app

```powershell
Set-Location E:\Workspace\project\IE307
if ((git branch --show-current).Trim() -ne 'codex/gm-09-figma-update') {
  throw 'Sai nhánh: dừng lại, chưa stage hoặc commit.'
}
git status --short --branch
git diff --check
git check-ignore -v prompt.md
```

Trong `mobile`, chạy `npm start`, mở Expo Go Android và full reload. Kiểm welcome → khách → nhập tên → Tiếp tục → Home; Back, tên lỗi/Unicode, keyboard, CTA toàn vùng và tên điền vào create/join. Account action phải báo chưa tích hợp, không giả đăng nhập. Kiểm thêm 320/360dp, chữ200%, TalkBack và Dark; ghi device/revision/ảnh/kết quả thật vào evidence. Đọc [STEP1](STEP1.md) để biết kiểm tự động và lỗi còn tồn tại.

## 2. Stage đúng phạm vi

Từ root, xem `git diff` và mở các file mới trước. Chỉ chạy stage sau khi đã kiểm phạm vi:

```powershell
git add -- mobile/src/app/index.tsx mobile/src/app/welcome.tsx mobile/src/app/create-room.tsx mobile/src/app/join-room.tsx
git add -- mobile/src/bootstrap/roomPreview.tsx mobile/src/shared/ui/components.tsx
git add -- mobile/src/features/home/screens/WelcomeScreen.tsx mobile/src/features/home/screens/GuestEntryScreen.tsx
git add -- mobile/tests/component/guestEntryScreen.test.tsx mobile/tests/integration/guestEntryRoute.test.tsx mobile/tests/integration/routes.test.tsx
git add -- mobile/assets/brand/entry/SOURCE.md mobile/assets/brand/entry/welcome-ring-large.png mobile/assets/brand/entry/welcome-ring-small.png
git add -- docs/evidence/roadmap-v2/GM-09/PLAN.md docs/evidence/roadmap-v2/GM-09/CHECKS.md docs/evidence/roadmap-v2/GM-09/HANDOFF.md docs/evidence/roadmap-v2/GM-09/FIGMA_PARITY.md
git add -- docs/evidence/roadmap-v2/GM-09/figma-update/STEP1.md docs/evidence/roadmap-v2/GM-09/figma-update/COMMIT_STEP1.md docs/evidence/roadmap-v2/GM-09/figma-update/MANIFEST.json
git add -- docs/evidence/roadmap-v2/GM-09/figma-update/figma-welcome.png docs/evidence/roadmap-v2/GM-09/figma-update/figma-guest-name.png
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
```

Staged diff phải chỉ chứa phạm vi trên; không có `prompt.md`, `.work`, credential hoặc output bundle. `prompt.md` vẫn ignore cục bộ. Nếu bạn sửa source sau revision trong manifest thì chạy lại checks liên quan và cập nhật manifest/evidence trước review.

## 3. Tạo commit rồi push đúng nhánh

Sau khi tự review staged diff:

```powershell
git commit -m "feat(gm09): update welcome and guest entry UI"
```

Sau commit thành công, kiểm lại nhánh/SHA rồi push đích rõ ràng:

```powershell
git branch --show-current
git log -1 --oneline
git push -u origin HEAD:refs/heads/codex/gm-09-figma-update
git status --short --branch
```

`-u` đặt upstream về nhánh feature này; trước đó upstream checkout là `origin/main`. Trên GitHub, mở nhánh `codex/gm-09-figma-update` và đối chiếu commit SHA vừa tạo. Không push vào `main`, không force-push hoặc tự merge/đổi Project Done. Trước merge vẫn cần refresh target, live merge gate, xử lý check còn lỗi và Trí review đúng revision.
