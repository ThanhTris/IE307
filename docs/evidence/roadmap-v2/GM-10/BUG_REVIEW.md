# GM-10 — đối chiếu bugs.md sau kiểm Expo Go

**Lịch sử:** báo cáo này giữ tám mục/câu hỏi từ bugs.md trước đó. Người dùng đã thay nội dung bugs.md bằng ba đề xuất ngày/giờ/ngân sách/checkbox; kết quả sửa mới nhất tại [DATE_UI_REVIEW](DATE_UI_REVIEW.md), cả ba đều phù hợp project và đã thực hiện. Không dùng link bugs.md hiện tại để suy nguyên văn tám mục lịch sử bên dưới.

Ghi chú mới nhất: [audit toàn bộ yêu cầu và downstream](REQUIREMENTS_AUDIT.md) tìm thêm các nhánh chưa đạt; người dùng đã giao sửa phần GM-10 và [SCOPE_FIX](SCOPE_FIX.md) ghi sửa A1..A5, gồm skip→timeout→retry và chỉnh context lần hai. Các sửa/câu trả lời của lượt bugs.md bên dưới không thay kết quả mới nhất hoặc xác nhận nghiệm thu toàn bộ.

Ngày 2026-10-15. Phản hồi gốc của người dùng từ file ghi chú cá nhân `bugs.md`; tám mục lịch sử được đối chiếu bên dưới, không phụ thuộc file ghi chú có được commit hay không. Branch `codex/gm-10-context-and-preferences`, base `30ecb56` + working tree chưa commit; contract GM-10.1 không đổi. Chưa commit/push/approval/Done. Start gate live `2026-10-15T14:41:08.573208+00:00`: READY_TO_CLAIM.

## Căn cứ

Rà soát Markdown trong repo để tìm yêu cầu GM-10/context/preferences/buổi/consent và đối chiếu nguồn hiện hành: [task GM-10](../../../../tasks/backlog/GM-10.md), [UI](../../../specs/UI_SPEC.md), [thiết kế UI](../../../specs/UI_DESIGN_SPECIFICATION.md), [catalogue/preferences](../../../specs/CATALOG_PREFERENCES_SPEC.md), [context/history](../../../specs/CONTEXT_HISTORY_SPEC.md), [food](../../../specs/FOOD_DATA_SPEC.md), [room](../../../specs/ROOM_SPEC.md), [component map](../../../design/COMPONENT_MAP.md), workflow/DoD/UI implementation plan, upstream GM-05/07 và downstream [GM-11](../../../../tasks/backlog/GM-11.md)/[GM-25](../../../../tasks/backlog/GM-25.md). Snapshot/roadmap-v1/ADR lịch sử không ghi đè task/spec hiện hành. Các mốc 07:00/12:00/19:00 là yêu cầu UX mới trong bugs.md, không phải luật eligibility cũ.

## Từng mục và câu trả lời

| Mục gốc | Kết luận / sửa đổi | Cách thử lại và expected |
| --- | --- | --- |
| Điểm ăn chung khó phân biệt cấp khu vực và điểm | Lỗi trình bày. Tách rõ 1 Chọn khu vực → 2 Chọn điểm công cộng trong khu vực (khung riêng, kèm địa chỉ) → 3 Chọn bán kính. Chọn khu vực khác bỏ điểm cũ; vùng không có điểm báo rõ. | Chọn Quận 1/Quận 3, chỉ thấy điểm của vùng được chọn. Chọn Thủ Đức trong fixture hiện tại thấy Chưa có điểm công cộng, không thể preview/lưu. Coverage mẫu không là dataset thật. |
| Chọn buổi không đổi giờ | Hành vi cũ chọn mealSlot độc lập với desiredAt phù hợp contract, nhưng chưa có tiện ích người dùng muốn. Đã thêm gợi ý theo yêu cầu: sáng 07:00, trưa 12:00, tối 19:00 UTC+7 lần kế tiếp so với serverTime + elapsed. Nếu đã tới/qua mốc thì ngày mai. Ăn nhẹ giữ nguyên giờ. | Chạm từng buổi, xem cả ngày lẫn giờ trong ô. Sau đó vẫn sửa giờ cụ thể được; lưu/retry không cộng thêm buffer. Ăn ngay vẫn +15 phút một lần. Sửa buổi/giờ phải xác nhận/preview lại, không tự dời giờ khi pool rỗng. |
| Switch Giảm ưu tiên món đã ăn gần đây nằm dưới chữ? | Lỗi bố cục/khả năng hiểu, không phải điều kiện có history. Đã đặt nhãn và switch cùng hàng; nhãn dài tự xuống dòng, switch giữ cạnh phải. Tách thành mục Lịch sử và chống lặp. | Host bật/tắt được kể cả chưa có history. Chỉ tác dụng xếp hạng chống lặp mới cần đúng history/consent; member chỉ đọc, đang lưu/unknown/đã ACK không sửa. |
| Xem món mẫu là chỉ hiện danh sách hay chọn món? | Chỉ xem trước, không chọn món hoặc bỏ phiếu tại đây. Đã bổ sung câu giải thích trong danh sách. Vote WANT/OK/NO thuộc vòng 1 GM-12; GM-26 nối API. | Danh sách hiện tên/giá/nguồn gốc/nơi bán/nhiệt độ; không tạo phiếu khi chạm món. |
| Thể loại chọn một hay nhiều? | Chọn nhiều đúng spec catalogue; chạm lại bỏ chọn. Không chọn một thể loại không có nghĩa NO. Giữ hành vi, thêm hướng dẫn ngay trên nhóm chip. | Chọn đồng thời Món nước và Cơm; bỏ một mục vẫn giữ mục kia. Gì cũng được xóa mọi ưu tiên mềm, giữ consent. |
| Switch Đồng ý lưu lịch sử nằm dưới chữ? | Cùng lỗi bố cục switch, đã sửa cùng hàng. Đây là consent cho việc lưu bữa ăn, không chờ đã có history mới bật được. Mặc định false khi chưa lưu lựa chọn. | Bật/tắt khi phòng mẫu mới, lưu hoặc bỏ qua mềm vẫn gửi consent đã chọn; chưa có history API thật trong GM-10. |
| Chống lặp của phòng do host chọn ở đâu? | Đây chính là Giảm ưu tiên món đã ăn gần đây ở màn Bối cảnh. Tên/copy trước đây chưa chỉ đường rõ. Thêm đường dẫn bằng chữ từ Khẩu vị về Bối cảnh → Lịch sử và chống lặp. | Bật ở Bối cảnh, xác nhận/preview/lưu, sang Khẩu vị thấy Chống lặp của phòng: Đang bật. Không đổi fixture giữa hai bước vì sẽ tạo phòng mới. |
| Lưu khẩu vị/Bỏ qua bị đơ, không qua trang tiếp theo? | Chưa có callback phòng chờ trong route mẫu GM-10, không phải tự động sang lobby theo contract hiện tại. UX trước đây giữ form bị khóa và thông báo ở cuối khiến tưởng đơ. Đã đổi thành biên nhận hoàn tất thay toàn bộ form, reset vị trí cuộn, có Chỉnh lại khẩu vị/Quay lại bối cảnh và giải thích bản mẫu kết thúc tại đây. Chỉ hiện Tiếp tục đến phòng chờ khi caller inject onContinue và snapshot sau lưu đã đọc thành công. | Cả Lưu và Bỏ qua đều thấy Đã hoàn tất chọn khẩu vị. Chỉnh lại đọc snapshot/version mới rồi cho sửa. Lỗi snapshot sau ACK chỉ thử đọc lại, không ghi lần hai. Không tự ready/start. Lobby UI là GM-11; nối cùng room/API/navigation là GM-25, không tạo lobby giả trong GM-10. |

## Kiểm sau sửa

Mobile check: **16 suites / 522 tests**, typecheck/lint/architecture pass; [kết quả](BUGFIX_MOBILE_CHECK.txt). Tổng hợp export/regression/repo và SHA256 tại [CHECKS](CHECKS.md), [manifest](PATCH_MANIFEST.json).

Người dùng đã kiểm Expo Go và báo các vấn đề trên; không ghi toàn bộ GM-10 đã Pass. **Kiểm lại Expo Go sau sửa: Not run** trong phiên agent. Cần thử lại phân cấp khu vực/điểm, giờ gợi ý, hai switch ở Light/Dark/font200 và biên nhận của cả Lưu/Bỏ qua. Ghi bằng văn bản được; không bắt ảnh/video. Thiết bị/Android/Expo Go chưa được người dùng cung cấp. Trí review và quyết định merge/Done.
