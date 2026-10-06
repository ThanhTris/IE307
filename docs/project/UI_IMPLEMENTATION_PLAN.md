# Kế hoạch UI — Gì Cũng Được

Trạng thái: **đề xuất để nhóm review**, ngày 2026-10-06. Đây là kế hoạch màn hình và hành vi cho app Android React Native; chưa phải kết quả triển khai. Bám [PRD](../product/PRODUCT_REQUIREMENTS.md), [FR](../product/FUNCTIONAL_REQUIREMENTS.md), [UI spec](../specs/UI_SPEC.md), [decision spec](../specs/DECISION_SPEC.md) và [design system](../../design/DESIGN_SYSTEM.md). Prototype HTML chỉ giúp thống nhất luồng/copy.

## Mục tiêu trải nghiệm

Người dùng 2–8 người tạo hoặc vào phòng, chọn buổi ăn và sở thích, đánh giá cùng một bộ món, rồi nhận kết quả hoặc thông báo chưa đồng thuận trong **tối đa hai vòng**. Trên mỗi màn phải thấy rõ: đang ở bước nào, ai còn cần hoàn tất bước chung, hành động tiếp theo và cách xử lý khi lỗi. Không hiển thị phiếu riêng của người khác.

Luồng P0: **Trang chủ → Tạo/Vào phòng → Sở thích → Phòng chờ → Chọn món vòng 1 → (Kết quả | Vòng 2 → Kết quả | Chưa đồng thuận)**. Từ phòng chờ hoặc phiên đang chạy, mất mạng/hết hạn/hủy được xử lý bằng trạng thái gián đoạn và đọc lại snapshot. Tìm quán trên Maps chỉ xuất hiện sau kết quả.

## Màn hình và chức năng phải thiết kế

| Màn / mức | Nội dung và thao tác chính | Trạng thái đặc biệt cần vẽ | Task liên quan |
| --- | --- | --- | --- |
| UI-01 Trang chủ / P0 | Hai CTA **Tạo kèo ăn**, **Vào bằng mã**; tiếp tục với khách; hiển thị phiên đang tham gia để quay lại nếu còn hợp lệ | đang khôi phục session, offline, auth lỗi, chưa có phiên | GM-05, GM-07 |
| UI-02 Tạo phòng / P0 | Nhập tên 1–24 ký tự, chọn buổi ăn, xem quy tắc 2–8 người; bấm **Tạo phòng** | tên không hợp lệ, đang tạo, lỗi mạng/quota; khóa nút khi gửi để tránh tạo trùng | GM-07, GM-08 |
| UI-03 Vào phòng / P0 | Nhập mã 6 ký tự hoặc mở camera quét QR; nhập tên; bấm **Vào phòng** | sai mã, phòng đầy/hết hạn/đã bắt đầu, camera bị từ chối thì vẫn nhập mã được | GM-07, GM-20 |
| UI-04 Sở thích / P0 | Hiển thị buổi ăn do host chọn; chọn nhiều loại món hoặc **Gì cũng được**; ghi rõ đây là ưu tiên mềm; lưu và tiếp tục | catalogue rỗng, tải lỗi, không chọn loại nào vẫn hợp lệ | GM-03, GM-10 |
| UI-05 Phòng chờ / P0 | Mã + nút sao chép/chia sẻ + QR, danh sách thành viên, tiến độ sẵn sàng, nút **Sẵn sàng**; host đổi buổi ăn trước khi khóa | chưa đủ 2 người, người chưa ready, host rời, lỗi đồng bộ/reconnect, xác nhận rời phòng | GM-08, GM-09, GM-20 |
| UI-06 Chọn món vòng 1 / P0 | Cùng snapshot 8 món; tên/loại/mô tả ngắn; tiến độ; ba nút **Muốn ăn / Ăn được / Không ăn**; có thể sửa từng món trước khi bấm **Gửi lựa chọn** | món chưa chọn, chưa đủ 8 phiếu, đang gửi, gửi lỗi giữ nháp, đã gửi thì khóa sửa và chờ nhóm | GM-11, GM-12, GM-13 |
| UI-07 Vòng 2 / P0 | Giải thích vì sao sang vòng cuối; chỉ hiện món mọi người ăn được; từng món **Giữ / Loại thêm**; bấm **Xác nhận lựa chọn** | danh sách rỗng chuyển chưa đồng thuận, tự loại hết vẫn cho nộp, đang gửi, chờ người khác, reconnect | GM-12, GM-15 |
| UI-08 Kết quả / P0 | Tên món chốt, lời giải thích tổng hợp theo vòng, **Tìm quán trên Maps**, **Kết thúc** | Maps không mở thì mở link trình duyệt/copy từ khóa; kết quả được đọc lại nhưng không bốc lại | GM-14, GM-20 |
| UI-09 Chưa đồng thuận / P0 | Thông báo trung tính, **Kết thúc** hoặc **Tạo phiên mới**; không nêu ai đã chọn Không ăn | không tự quay lại vòng 1, không có vòng 3 | GM-14, GM-15 |
| UI-10 Phiên gián đoạn / P0 | Banner hoặc màn phù hợp cho chờ kết nối, phòng hết hạn, đã hủy; **Thử lại** đọc snapshot và **Rời phòng** khi cần | không báo gửi thành công trước ACK; snapshot mới quyết định màn tiếp theo; xác nhận hệ quả khi rời | GM-09, GM-16 |
| UI-11 Bạn ăn cùng / P1 | Danh sách bạn, mời/chấp nhận hai chiều, tạo phòng nhanh, liên kết tài khoản, lịch sử món và thời điểm | rỗng, lời mời từ chối, mất guest session, xung đột account link; không tự cho bạn ready/vote | GM-17, GM-18 |

P2 chỉ lên wireframe sau khi core ổn: OCR thực đơn phải cho sửa và duyệt lại món nhận diện; AI hiểu sở thích phải cho người dùng xác nhận nhãn, có lối nhập tay khi AI lỗi. Không để P2 chen vào luồng P0 hoặc quyết định món thay người dùng. Xem GM-23/24.

## Quy tắc UI dùng xuyên màn hình

- **Điều hướng:** mỗi bước hiển thị tiêu đề, CTA chính, nút quay lại/rời có ý nghĩa rõ. Khi phòng đã chạy, Back mở xác nhận rời và nêu hệ quả; không cho sửa phiếu đã gửi.
- **Phiếu kín:** chỉ cho thấy tiến độ tổng như “3/4 người đã chọn xong”; không gắn trạng thái WANT/OK/NO lên avatar, thông báo hay hiệu ứng.
- **Tải và lỗi:** skeleton hoặc progress có nhãn; lỗi có câu giải thích và hành động thử lại. Nút đang gửi chống chạm lặp; chỉ chuyển màn khi server ACK. Nháp trước gửi giữ cục bộ khi mạng lỗi.
- **Bình chọn:** nút bấm là đường thao tác chuẩn; vuốt chỉ là shortcut. Mỗi món luôn có lựa chọn hiện tại bằng chữ và biểu tượng, không chỉ bằng màu. `UNSET` chặn nộp vòng 1.
- **Nội dung:** dùng copy trong [UI spec](../specs/UI_SPEC.md); phân biệt “Không ăn” với chưa chọn. Kết quả và chưa đồng thuận dùng giải thích trong [decision spec](../specs/DECISION_SPEC.md).
- **Khả dụng:** safe area, bàn phím không che form, touch target >=48dp, font scaling 200%, TalkBack đọc tên/state/nút, dark mode, reduced motion; 320/390/768dp không tràn ngang. Danh sách thành viên/món dùng FlatList khi triển khai native.
- **Dữ liệu:** screen nhận view model/state đã chuẩn hóa; use case và network adapter nằm ngoài component. Kết quả/vòng và roster lấy từ snapshot server. UI không tự random winner hoặc suy phiếu nhóm.

## Đầu ra thiết kế và thứ tự triển khai

| Chặng | Tuần kế hoạch | Đầu ra cần review | Task đề xuất | Cổng nghiệm thu |
| --- | --- | --- | --- | --- |
| 0. Chốt baseline | 1 | Sơ đồ luồng, wireframe 11 màn, bảng copy, bộ trạng thái và component inventory; duyệt giả định UI/ADR của GM-00 | GM-00 | Chủ dự án + reviewer chốt P0, P1, luật hai vòng; task phụ thuộc chưa code trước review |
| 1. Nền UI | 1–2 | Theme sáng/tối, typography/spacing, AppButton, ChoiceChip, InlineNotice, EmptyState, ConfirmSheet; navigation skeleton Android | GM-01, GM-02 | Expo chạy thật; screen reader và font lớn có đường dùng; dependency mới được review |
| 2. Vào phòng | 2–3 | UI-01..05 nối guest/session, room API và catalogue; QR có nhập mã thay thế | GM-05, GM-07..10, GM-20 | Hai máy tạo/vào phòng, thấy cùng roster/buổi ăn, ready đúng; lỗi mã/mạng rõ |
| 3. Quyết định | 4–5 | UI-06..09 nối engine/RPC; phiếu ba mức, vòng hai, kết quả và chưa đồng thuận | GM-11..15 | T-06/07 qua; NO không thành winner, UNSET không gửi, không vòng ba, retry không đổi kết quả |
| 4. Bền vững và bàn giao | 5–8 | UI-10, reconnect, Maps fallback; QA 2/4/8 máy, a11y, chỉnh copy theo thử nhóm, ảnh Android và evidence | GM-16, GM-19..22 | T-09/10/12/13/15 có evidence; reviewer độc lập duyệt DoD |
| 5. Sau core | Sau P0 | UI-11; chỉ khi đủ thời gian mới thiết kế/triển khai P2 | GM-17/18, GM-23/24 | P1/P2 không chặn APK/demo P0 |

Ưu tiên triển khai theo dependency task, không theo việc wireframe đã vẽ xong. Phân công trong backlog là đề xuất; thành viên tự nhận và chọn reviewer khác owner theo [workflow](TEAM_WORKFLOW.md).

## Checklist nghiệm thu UI

1. Đi hết đường chính từ tạo phòng tới kết quả trên ít nhất hai máy Android; sau đó thử đường vào bằng mã, chưa đồng thuận và mất mạng.
2. Mỗi màn có ảnh/record native ở trạng thái thường, loading, empty/error quan trọng; HTML prototype không thay bằng chứng native.
3. Kiểm 320/390/768dp, font 200%, TalkBack, dark mode, reduced motion và camera denied theo [test plan](../testing/TEST_PLAN.md).
4. Đối chiếu từng UI-01..11 với task/FR; ghi phần chưa làm và blocker. Chỉ reviewer khác người làm mới xác nhận đạt.
