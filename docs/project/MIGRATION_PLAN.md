> Lịch sử: các mã task trong tài liệu này thuộc thời điểm soạn/roadmap-v1 (hoặc mã cũ được ghi bên dưới). Lộ trình hiện hành: [roadmap-v2](IMPLEMENTATION_ROADMAP.md); không dùng mã trong tài liệu này để mở gate.

> Lưu ý mã task: nội dung lịch sử bên dưới dùng mã cũ. Task hiện hành đã đánh số theo lộ trình; xem [bảng mã cũ–mới](TASK_RENUMBERING.md). Không suy task hiện tại từ số trong bản lịch sử.

> Lịch sử soạn baseline v0.1/v0.2. Phạm vi data hiện hành food-v1 ở [food spec](../specs/FOOD_DATA_SPEC.md) và [dependency map](TASK_DEPENDENCIES.md); GM-00 đã review v0.2, GM-28 chờ review bản mới. Những câu “venue P1/chờ GM-00” bên dưới là trạng thái của đợt cũ.

# Gì Cũng Được — kế hoạch nền

Ngày: 2026-10-06. Trạng thái: bộ nền đề xuất, chờ nhóm review; chưa triển khai ứng dụng.

## Kết quả của đợt chuyển đổi

- Tài liệu đề tài trước đã được gỡ khỏi nội dung hiện hành.
- Đổi tài liệu gốc, PRD, spec, ADR, UI và backlog theo chọn món cho nhóm.
- Chuẩn hóa thư mục `mobile/` theo Expo Router + feature modules và `supabase/` theo migration/RPC/test.
- Có prototype tương tác để review trước khi code; có đường truy vết yêu cầu → màn hình → spec → task → test.
- Không tự tạo package/lockfile giả hoặc coi HTML là ứng dụng React Native đã chạy.

## Trình tự và điểm kiểm tra

| Bước | Đầu ra | Cách kiểm |
| --- | --- | --- |
| 1. Chuyển đề tài | Lịch sử Git giữ nguồn cũ; xóa thư mục lưu trữ và tài liệu quyết định đề tài cũ theo yêu cầu chủ dự án | Kiểm target xóa, validator và diff |
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
7. Baseline v0.2 đưa bạn quen/history tối thiểu/push/outbox vào P0; account nâng cao/venue pilot P1, OCR/AI/fairness dài hạn P2. Chủ dự án đã yêu cầu soạn lại tài liệu, independent review vẫn pending.
8. Catalogue đầu tiên 60–80 món tự biên soạn; dữ liệu giá chỉ tham khảo. Không quảng cáo độ an toàn dị ứng của món/quán.

## Kế hoạch kiểm tra của lần sửa này

Chạy validator tài liệu và diff; kiểm prototype ở desktop và viewport nhỏ, chạy các nhánh demo; ghi giới hạn mô phỏng. Không báo build/test React Native thành công khi chưa có app.

## Rollback

Khi cần xem lại bối cảnh cũ, dùng lịch sử Git. Không khôi phục hoặc trộn tài liệu đề tài trước vào nhánh hiện hành.

## Cập nhật baseline tài liệu 2026-10-07

Spec/FR/UI/data/API/test/backlog được soạn đồng bộ v0.2 theo góp ý giảng viên và double-tap WANT. 20 FR, 27 task triển khai + GM-00 review. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md), [task summary](TASK_SUMMARY.md). Không đánh dấu Done hay tạo app; ADR dependency và prototype/native cần reviewer kiểm.
