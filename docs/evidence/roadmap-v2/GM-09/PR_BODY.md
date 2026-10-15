## Phạm vi bàn giao

GM-09 / issue #70: UI Home, tạo phòng và nhập mã bằng mock trên nhánh `codex/gm-09-home-create-and-join-room`, target `main`. Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`), contract `food-v1/roadmap-v2/GM-09.1`.

Home tách lỗi tải bạn bè khỏi session để lỗi phụ không chặn tạo/vào phòng; Create có tóm tắt bối cảnh trước xác nhận. Create/Join giữ payload/requestId khi retry, khóa gửi sau ACK; incoming code chỉ điền và yêu cầu xác nhận. Receipt khóa bước tiếp khi snapshot chưa hợp lệ. AppButton được sửa bố cục để nhãn phủ lòng nút, bỏ thử nghiệm pointerEvents gây mất phản hồi trên thiết bị.

Giữ component props GM-05.1 và client/mock GM-07.1; không đổi package/lockfile, DTO/schema/backend. Callback sang GM-10/11/25/30 đã ghi trong HANDOFF; API, GPS/camera/QR thật và persistence nằm ở task tích hợp.

## Đầu vào và gate

- Nhận GM-05 components/tokens và GM-07 contract/client/mock trên base; start gate live ngày 2026-10-15 đạt `READY_TO_CLAIM`. Đây là dependency/artifact gate, không phải approval.
- Base HEAD `6735694` đã nhận `origin/main` `ce7b87a`. Source/test working tree đã kiểm có hashes trong `docs/evidence/roadmap-v2/GM-09/REVIEW_PACKAGE_MANIFEST.json`; sau commit, PR head là revision để Trí review.
- Trí cập nhật ref đích và chạy lại merge gate trước khi merge: `python scripts/task_readiness.py --task GM-09 --gate merge --base-ref origin/main`.

## Kiểm chứng

| Kiểm | Kết quả / evidence |
| --- | --- |
| TypeScript, lint, Jest, architecture | Pass; 14 suites / 462 tests, 4 lint warnings upstream; `BUTTON_LABEL_AREA_MOBILE_CHECK.txt` |
| Android Hermes export | Pass; 1284 modules; `BUTTON_LABEL_AREA_ANDROID_BUNDLE.txt`; export không phải APK/native integration |
| Python regression | Pass; 550 tests, không skipped; `BUTTON_LABEL_AREA_PYTHON_REGRESSION.txt` |
| Repository/indexes/diff | Kết quả lượt chuẩn bị review tại `REVIEW_PREPARATION_REPOSITORY_CHECK.txt`; CHECKS ghi trạng thái cuối |
| Expo Go | Người dùng xác nhận “tôi đã kiểm tra GM-09 thành công và hoạt động”; biên bản `MANUAL_DEVICE_CHECK.md` |

Theo chỉ dẫn hiện tại của người dùng, lần bàn giao này dùng xác nhận UI bằng văn bản và không yêu cầu ảnh/video. Model/Android/Expo Go chưa được cung cấp; light/dark, font200%, TalkBack, keyboard/Back và từng fixture chưa có xác nhận thiết bị riêng. Có assertion tự động theo CHECKS; không suy các mục thiết bị đó Pass từ xác nhận chung. Trí đối chiếu/kiểm bổ sung trước nghiệm thu.

## Cách mở và bàn giao

```powershell
cd mobile
npm ci --no-audit --no-fund
npm start -- --clear
```

Quét QR bằng Expo Go SDK57 cùng LAN. Home → tạo phòng/nhập mã → receipt → Home/resume. Công cụ kiểm thử → Bình thường để xóa receipt mẫu khi cần kiểm lại hai CTA; khi đang có phòng, hai CTA bị khóa theo thiết kế.

- CHECKS: `docs/evidence/roadmap-v2/GM-09/CHECKS.md`.
- HANDOFF: `docs/evidence/roadmap-v2/GM-09/HANDOFF.md`.
- Manual check: `docs/evidence/roadmap-v2/GM-09/MANUAL_DEVICE_CHECK.md`.
- Report: `GM-09-report.md`.

## Phần dành cho Trí

- [ ] Đối chiếu AC, xác nhận thủ công và các mục chưa xác nhận riêng trên revision cuối.
- [ ] Kiểm dependencies/target/main, merge gate và CI của PR.
- [ ] Quyết định review và merge.
- [ ] Quyết định nghiệm thu/chuyển GM-09 sang Done trên Project #2.

Chỉ Trí (`ThanhTris`) được merge và chuyển Done. PR này không tự đóng issue #70, không bật auto-merge và không tự ghi Approved/Done.
