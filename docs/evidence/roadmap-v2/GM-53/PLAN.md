# GM-53 — Kế hoạch triển khai và kiểm thử

Revision `release-v1/2026-11-20/GM-53.1` cùng AC từ PR #214. Nhánh
`codex/gm-53-delete-account` tách từ `origin/main` tại `d7b89f2`.
Tuấn thực hiện, Trí review. Gate live 26/11/2026 trả `READY_TO_CLAIM`.

| Bước | Đầu ra và phép kiểm |
| --- | --- |
| 1 | Đối chiếu task, dependency, thiết kế và API. Ghi phạm vi, kế hoạch và đầu ra. |
| 2 | Nối API GM-49, xác minh mật khẩu email và identity, giữ idempotency khi retry, dọn phiên sau ACK. Kiểm contract, race, lỗi và dọn local. |
| 3 | Nối Hồ sơ, form xác nhận, pending/Back/error và liên kết pháp lý. Kiểm route sản phẩm, tương tác và điều hướng. |
| 4 | Chạy kiểm tra tự động, ghi CHECKS, HANDOFF, FIGMA_PARITY, chuẩn bị môi trường và ca kiểm Expo. |
| 5 | Tuấn kiểm trên Expo Go Android AVD nối QA thật. Bổ sung kết quả, ảnh và commit evidence sau khi có kết quả thực tế. |

Đầu vào trên main: GM-35 qua PR #182 (`d9332f7`), GM-49 qua PR #205
(`7de174a`), GM-50 qua PR #219 (`7996126`). [Task](../../../../tasks/backlog/GM-53.md)
và handoff [GM-35](../GM-35/HANDOFF.md), [GM-49](../GM-49/HANDOFF.md),
[GM-50](../GM-50/HANDOFF.md).

- Kết quả xóa được xác nhận bằng ACK `deleted: true` với đúng request UUID.
  Phiên email xác minh lại qua GoTrue. Phiên khách chỉ cần cụm xác nhận.
  Retry cùng UUID và bearer ban đầu. Mật khẩu và bearer chỉ ở bộ nhớ.
- Tái sử dụng phiên GM-16 và dữ liệu local GM-31. Chỉ dọn sau ACK; kiểm
  thay thế phiên trong lúc gọi, lỗi dọn dữ liệu và `401` tách khỏi sai mật khẩu.
- Màn mới dùng pattern [Hồ sơ](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649)
  và [Đổi mật khẩu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857),
  đã đọc ảnh Figma 412dp. Dùng nút và token có sẵn cho hành động nguy hiểm.
- Gói đã được duyệt trong AC GM-53 là `react-hook-form` và `zod` cho
  form mới. Giữ các form GM-35 và hợp đồng/migration GM-49.
- Expo Go dùng tài khoản và stack QA riêng. Ghi revision, AVD, phiên bản
  SDK, backend, expected, actual và ảnh đã bỏ thông tin nhạy cảm.
