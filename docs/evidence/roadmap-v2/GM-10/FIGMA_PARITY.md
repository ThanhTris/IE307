# GM-10.2 — ma trận thiết kế và implementation

Nguồn: PNG user cấp ngày2026-11-02, [audit ảnh](figma-update/FIGMA_REFERENCE_AUDIT.md).
Figma chỉ tham khảo trình bày theo chỉ dẫn user, yêu cầu task vẫn phải đủ.
Node trong task giữ truy vết, chưa xác minh live/revision/variables trong lượt này.
Đây không là visual acceptance; chưa có ảnh app sau sửa trên thiết bị.

| Frame/state | Điểm mở và fixture | Expected trong implementation | Visual/Android actual |
| --- | --- | --- | --- |
| R01–R05 | `/room/setup`, chọn preset cùng mã | Buổi/ngân sách/draft độc lập; pool không yêu cầu GPS | Not run |
| R06–R08 | Cùng route, ScheduleSheet | Giữ buổi, confirm/cancel, ngày/giờUTC+7, reject giờ qua | Not run |
| R09–R10 | SetupFriendsSheet | Chọn nhiều/search/empty, hủy không ghi nháp; không gửi lời mời trước tạo | Not run |
| R11–R14 | Tải chậm/tạo lỗi/offline/discard | Khóa gửi trùng, retry, giữ nháp, confirm Back | Not run |
| R15 | Preset chưa history | Giải thích không có dữ liệu, không chặn tạo phòng | Not run |
| Min10/max20 | Preset min10/max20 | Count nguyên, đúng nút biên disabled | Not run |
| Shortage>=10 | shortage15 | Hiện available15/requested20, chỉ đổi draft sau xác nhận | Not run |
| Shortage<10 | shortage7 | Không cho giảm hoặc tiếp tục, sửa/quay lại | Not run |
| P01–P04 | Preset P, cùng flow | Anything/multi/edit own; lấy default tài khoản rồi bản chụp phòng | Not run |
| P05–P07 | Preset P, bấm CTA nếu cần | Pending/save error/offline giữ draft, không nói đã đồng bộ | Not run |
| P08–P11 | Preset P | Loading/retry/discard/closed có lối thoát | Not run |
| State bổ sung | timeout/ack-read-error/stale/taxonomy-empty/member | Stable intent, readback-only retry, no guessed data, host-only settings | Not run |

Các test interaction và port xác minh hành vi trong [CHECKS](figma-update/CHECKS.md),
không xác nhận kích thước pixel/Android hoặc API thật. Khác biệt picker, nhãn
taxonomy, nullable budget, consent/temperature và receipt thay lobby chưa nhận
được ghi tại [handoff mới](figma-update/HANDOFF.md).

Reviewer Trí chưa quyết định acceptance cho revision này; không kế thừa
device Pass của GM-10.1 vào bổ sung GM-10.2.
