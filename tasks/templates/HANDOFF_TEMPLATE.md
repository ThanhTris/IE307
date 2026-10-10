# Bàn giao đầu ra task — roadmap-v2

Task / owner / reviewer / track / stage:
PR / branch / target / commit:
Contract version / schema version / dataset version:

## File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## AC và kiểm tra

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| | | | | |

Ghi dependency/package/license nếu thay đổi, migration/rollback, dữ liệu mẫu và dữ liệu verified, lỗi còn lại + owner.

## Checklist người nhận

- [ ] Upstream được review đúng scope và revision, PR/commit đã vào target.
- [ ] File và hướng dẫn đủ chạy từ clone sạch; không chỉ placeholder.
- [ ] Input/output/errors/nullability/version đúng contract; không cần đoán hoặc tạo lại nền.
- [ ] Nhánh của mình đã cập nhật đầu vào; đã kiểm thử bước smoke liên quan.
- [ ] Biết phần nào mock, phần nào API/dataset/native thật; blocker có người xử lý.

Review độc lập dùng [mẫu review](REVIEW_TEMPLATE.md); HANDOFF không tự thay Approved.
