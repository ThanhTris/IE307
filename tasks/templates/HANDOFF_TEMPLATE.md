# Bàn giao đầu ra task — roadmap-v2

Task / owner / reviewer / track / stage:
PR / branch / target / commit:
Contract version / schema version / dataset version:
CHECKS.md / tested revision / Expo Go hoặc native build / API tool/base URL local / Data validation-query output:

## File và cách dùng

| Artifact thực tế | Producer task | Version/commit | Lệnh đọc/chạy | Expected output | Task nhận |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## AC và kiểm tra

| AC | Pass / Fail / Not run | Môi trường và lệnh | Evidence | Mock / thật và giới hạn |
| --- | --- | --- | --- | --- |
| | | | | |

Ghi dependency/package/license nếu thay đổi, migration/rollback, dữ liệu mẫu và dữ liệu verified, lỗi còn lại + owner.

## Đầu ra chạy được

Theo [chuẩn đầu ra](../../docs/project/TASK_OUTPUT_REQUIREMENTS.md) và [checklist từng task](../../docs/project/TASK_OUTPUT_CHECKLIST.md). Đính kèm CHECKS.md theo [mẫu checks](CHECKS_TEMPLATE.md).

- UI: cách mở từng route/component/state trong scope trên Expo, thao tác/expected/actual, screenshot/video/device/build; mock có nhãn, native cần build hỗ trợ.
- BE: request suite có local base URL/auth placeholder, setup/cleanup/lệnh hoặc import Postman, HTTP/body/error/state/version assertions và report thật; domain/contract/nền dùng runner đúng scope, không chờ task sau.
- Data: field coverage/schema/template/FK/unit/null/privacy/version, valid/invalid fixtures, mapping/query/import/counts/hash/freshness; BE nhận đủ input để không đoán field.
- Không lưu secret/phiếu thật/GPS; Not run/Fail là giới hạn/blocker thật, không đổi thành Pass vì CI hoặc có file.

## Checklist người nhận

- [ ] Upstream được review đúng scope và revision, PR/commit đã vào target.
- [ ] File và hướng dẫn đủ chạy từ clone sạch; không chỉ placeholder.
- [ ] Input/output/errors/nullability/version đúng contract; không cần đoán hoặc tạo lại nền.
- [ ] Nhánh của mình đã cập nhật đầu vào; đã kiểm thử bước smoke liên quan.
- [ ] Biết phần nào mock, phần nào API/dataset/native thật; blocker có người xử lý.
- [ ] Chạy lại cách mở/gọi/lệnh trong CHECKS và đối chiếu expected/actual; đủ field/version/fixture trước làm phần phụ thuộc.

Review độc lập dùng [mẫu review](REVIEW_TEMPLATE.md); HANDOFF không tự thay Approved.
