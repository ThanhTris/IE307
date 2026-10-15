# RELEASE SPEC

food-v1 • 2026-10-07. Nghiệm thu Android APK nội bộ, chưa phát hành store.

- P0 đạt [DoD](../project/DEFINITION_OF_DONE.md); có demo 2/4/8 clients, giới hạn thiết bị thật được ghi rõ.
- Không phụ thuộc P1/P2 để chạy luồng chính. Flag OCR/AI/weather/mood/fairness mặc định tắt khi chưa được review.
- Chuẩn bị dataset quán–món–lịch bán verified có nguồn/ngày/coverage, fixture mô phỏng tách riêng, project backend thức/khỏe, quota, migration version, privacy notice và tài khoản khách test.
- Kiểm signature APK bằng cấu hình local/private; không commit signing files. Không yêu cầu người dùng trả phí để chạy demo.
- Demo video có happy path, vòng hai, không đồng thuận, pending/restart/reconnect, avatar invitation/push, QR/link/location và history consent; ghi phiên bản app/backend, không dùng prototype thay app thật.
- Báo cáo chỉ nêu tính năng đã chạy; tính năng đề xuất có mục riêng. Trí phê duyệt trước task Done, kể cả task Trí trực tiếp làm; không yêu cầu review chéo theo [ADR-013](../architecture/decisions/ADR-013-project-owner-final-review.md).

Core food-v1 bao gồm data/coverage/location/eligibility GM-08, GM-24, GM-18, không trì hoãn sau release. Demo có đổi giờ/khu vực, unknown/out-of-coverage và offering thay đổi sau result. Kiểm mọi P0 qua dependency map và review của Trí; không bảo đảm tồn kho live từ lịch. Approval baseline GM-01 không thay review/test của từng task triển khai.
