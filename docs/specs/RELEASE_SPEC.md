# RELEASE SPEC

Draft v0.1. Nghiệm thu Android APK nội bộ, chưa phát hành store.

- P0 đạt [DoD](../project/DEFINITION_OF_DONE.md); có demo 2/4/8 clients, giới hạn thiết bị thật được ghi rõ.
- Không phụ thuộc P1/P2 để chạy luồng chính. Flag OCR/AI/fairness mặc định tắt khi chưa được review.
- Chuẩn bị catalogue fixture có quyền dùng, project backend thức/khỏe, quota, migration version, privacy notice và tài khoản khách test.
- Kiểm signature APK bằng cấu hình local/private; không commit signing files. Không yêu cầu người dùng trả phí để chạy demo.
- Demo video có happy path, vòng hai, không đồng thuận, reconnect; ghi phiên bản app/backend, không dùng prototype thay app thật.
- Báo cáo chỉ nêu tính năng đã chạy; tính năng đề xuất có mục riêng. Reviewer độc lập phê duyệt trước task done.
