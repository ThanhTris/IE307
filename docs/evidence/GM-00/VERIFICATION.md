# Verification GM-00

Ngày 2026-10-06. Người thực hiện: Codex. Scope: tài liệu, cấu trúc và HTML prototype; chưa có nghiệm thu độc lập.

## Đã kiểm thực tế

- `python scripts/validate_repository.py`: PASS — file bắt buộc, local links, JSON, 25 task records (GM-00 + 24 triển khai), dependency DAG, owner/reviewer và FR-01..13 traceability.
- `git diff --check`: PASS. Git có cảnh báo chuyển LF/CRLF trên Windows, không có lỗi whitespace với cấu hình repo hiện tại.
- Tài liệu đề tài trước đã được xóa khỏi working tree theo yêu cầu chủ dự án; lịch sử Git vẫn truy vết được commit trước đó. Bộ evidence hiện hành không chứa tài liệu hoặc dữ liệu của đề tài trước.
- `scripts/verify_prototype.cjs` với Playwright Chromium headless: **7 nhóm kiểm qua, 0 lỗi JavaScript**. [Output](prototype-checks.json).
- Kiểm hình trực tiếp: desktop, mobile, dark theme, vòng cuối; không thấy chữ/nút bị cắt ở ảnh kiểm. Automation kiểm không tràn ngang 320/390/768px ở home/vote.

## Nhánh prototype đã chạy

1. Tạo phòng → sở thích → ready → chọn đủ 8 món → match vòng 1.
2. NO bị loại khỏi vòng 2; offline chặn submit; winner giữ nguyên khi đổi theme.
3. Giao rỗng → chưa đồng thuận, không thêm vòng.
4. Loại hết món vòng cuối → chưa đồng thuận.
5. Mã sai, camera placeholder, vào với vai trò member không tự start.
6. Đã nộp chờ người cuối, không sửa phiếu; mô phỏng người cuối nộp; hết hạn chặn thao tác cuối.
7. Bố cục nhỏ không tràn ngang; Maps URL có query theo món.

## Ảnh

- [Desktop](ui-desktop.png)
- [Mobile](ui-mobile.png)
- [Dark](ui-dark.png)
- [Vòng cuối](ui-final-round.png)

## Tái chạy

Validator chỉ dùng Python chuẩn. Prototype checker cần Playwright và Chromium đã được cài trong môi trường công cụ; chạy `node scripts/verify_prototype.cjs`, hoặc đặt `PROTOTYPE_PLAYWRIGHT_PATH` trỏ module Playwright. Đây không phải dependency app mobile. Checker không gửi dữ liệu tới server ngoài và không mở link Maps.

Chromium bị sandbox chặn ở lần đầu; lần chạy headless được công cụ phê duyệt sau đó đã hoàn tất. Không cài thêm package app trong đợt này.

## Chưa kiểm / giới hạn

- Không có Expo build, thiết bị Android, TalkBack/font scaling native, backend RPC/RLS/realtime/camera thật.
- Catalogue trong HTML cố định, phiếu hai người khác mô phỏng; không phải test nhóm thật hoặc chứng minh mọi policy SQL.
- P1 partner/account/history mới có spec/task, chưa có màn hoàn chỉnh.
- Kiểm snapshot commit và kết quả công bố GitHub được ghi trong evidence publication của lần push.
- Reviewer chưa duyệt giả định/ADR/UI; GM-00 vẫn review, mọi task triển khai còn backlog.
