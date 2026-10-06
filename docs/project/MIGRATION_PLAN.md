# Chuyển Manabi sang Gì Cũng Được

Ngày: 2026-10-06. Trạng thái: bộ nền đề xuất, chờ nhóm review; chưa triển khai ứng dụng.

## Kết quả của đợt chuyển đổi

- Nguồn Manabi được bảo toàn trong lịch sử Git tại commit `6086c16`; đã xóa thư mục lưu trữ theo yêu cầu tiếp theo của chủ dự án.
- Đổi tài liệu gốc, PRD, spec, ADR, UI và backlog theo chọn món cho nhóm.
- Chuẩn hóa thư mục `mobile/` theo Expo Router + feature modules và `supabase/` theo migration/RPC/test.
- Có prototype tương tác để review trước khi code; có đường truy vết yêu cầu → màn hình → spec → task → test.
- Không tự tạo package/lockfile giả hoặc coi HTML là ứng dụng React Native đã chạy.

## Trình tự và điểm kiểm tra

| Bước | Đầu ra | Cách kiểm |
| --- | --- | --- |
| 1. Chuyển đề tài | Lịch sử Git giữ nguồn cũ; xóa thư mục lưu trữ; giữ `docs/decision/` | Kiểm target xóa, validator và diff |
| 2. Chốt baseline đề xuất | PRD, giả định, phạm vi MVP/P1/P2 | Nhóm review các quyết định bên dưới |
| 3. Soạn UI | Design system, screen spec, prototype | Đi qua happy path, no-match, hết lựa chọn, mất mạng |
| 4. Đặc tả AIDD | Domain, data, RPC, security, test plan, task | Validator kiểm link, ID, dependency, owner/reviewer |
| 5. Tạo cấu trúc | `mobile/`, `supabase/`, `tests/`, `tasks/` | Thư mục có hướng dẫn trách nhiệm; không lẫn domain cũ |
| 6. Gửi review | GM-00 và evidence | Reviewer khác người thực hiện; chưa đánh dấu Done |
| 7. Bắt đầu code sau review | GM-01 và các task đã mở khóa | Build Android thật, typecheck, test; lưu evidence |

## Giả định cần review trong bộ nền

1. Tên hiển thị: **Gì Cũng Được**; mã kỹ thuật `gi-cung-duoc`.
2. Android-first; iOS kiểm khả năng tương thích, chưa cam kết phát hành App Store.
3. MVP hỗ trợ 2–8 thành viên/phòng, hai vòng bỏ phiếu tối đa; đây là giới hạn kỹ thuật đề xuất, không phải yêu cầu đã xác nhận của người dùng.
4. Chế độ nhóm online là core; mất mạng giữ lựa chọn nháp nhưng không tự công bố kết quả.
5. Backend đề xuất Supabase thay cho gợi ý Firebase trong cuộc trao đổi trước: SQL RPC giúp chốt kết quả nguyên tử và giữ phiếu riêng tư. ADR vẫn chờ review.
6. Vòng hai chỉ đánh giá các món mọi người đã xác nhận ăn được; nếu không còn món nào thì kết thúc chưa đồng thuận. Không tự đưa lại món NO hoặc tự mở vòng ba.
7. Kết bạn nhanh cho cặp đôi thuộc P1 trong kế hoạch; OCR/AI và ưu tiên người đã nhường thuộc P2, không chặn MVP.
8. Catalogue đầu tiên 60–80 món tự biên soạn; dữ liệu giá chỉ tham khảo. Không quảng cáo độ an toàn dị ứng của món/quán.

## Kế hoạch kiểm tra của lần sửa này

Chạy validator tài liệu và diff; kiểm prototype ở desktop và viewport nhỏ, chạy các nhánh demo; ghi giới hạn mô phỏng. Không báo build/test React Native thành công khi chưa có app.

## Rollback

Nguồn cũ được giữ trong lịch sử Git, commit `6086c16`. Thư mục lưu trữ từng được kiểm đối chiếu rồi đã xóa theo yêu cầu chủ dự án. Khi quay lại đề tài cũ, tạo thay đổi riêng sau khi chủ dự án quyết định; không chạy script xóa/ghi đè toàn repo. File `docs/decision/so_sanh_ba_de_tai.docx` có sẵn được giữ nguyên.
