# GM-10 — sửa giao diện ngày/giờ, ngân sách và xác nhận

Ngày 2026-10-15. Branch `codex/gm-10-context-and-preferences`, base `30ecb5675104f13c64580018cad118647fb3d601` + working tree chưa commit, contract GM-10.1. Người dùng ghi ba yêu cầu mới trong bugs.md; đây là lượt sửa sau FINAL_REVIEW/SCOPE_FIX. Gate live `2026-10-15T16:04:45.696281+00:00` READY_TO_CLAIM; không đổi Project/approval/Done hoặc commit/push.

## Yêu cầu và xử lý

| Nội dung bugs.md hiện tại | Đã sửa | Đối chiếu/mâu thuẫn |
| --- | --- | --- |
| Tách ngày và giờ, thêm chọn ngày đẹp hơn theo quy chuẩn app | Ngày ăn là nút mở bộ chọn inline có nhãn ngày/thứ tiếng Việt. Chọn nhanh Hôm nay/Ngày mai theo server clock khi bấm; danh sách7 ngày mỗi trang, nút trước/sau và nhập YYYY-MM-DD cho ngày khác. Giờ ăn là field HH:mm riêng; nhập ngày dở không làm hỏng giờ. Chọn ngày giữ giờ, chưa tự lưu/xác nhận. | Không mâu thuẫn. UI_SPEC/FOOD_DATA_SPEC yêu cầu desiredAt hợp lệ và hiển thị timezone, không bắt buộc ngày/giờ chung một input hoặc datepicker native. Bố cục một cột, hàng >=48dp, text wrap; danh sách ngày giữ vùng bấm ở màn nhỏ/font lớn, dùng tokens GM-05, không thêm package/native module. |
| Ngân sách tham khảo nằm một ô riêng | Chuyển FormField ngân sách sang SetupSection Ngân sách tham khảo riêng, ngoài Buổi và giờ ăn. Nhãn VNĐ/người và hướng dẫn nullable/ưu tiên mềm giữ nguyên. | Không mâu thuẫn. Context/history chỉ quy định ý nghĩa budget mềm/nullable, không yêu cầu chung card với giờ. |
| Xác nhận dễ thấy, ô vuông bên trái và tích xanh | Đổi chip confirmation thành Pressable role=checkbox, viền và padding rõ, ô vuông bên trái xanh+dấu✓ khi checked; thêm text trạng thái. Bấm được toàn bộ hàng; accessibilityState checked/disabled, hint; giữ text scaling, dấu✓ trang trí có kích thước cố định trong ô. | Không mâu thuẫn. Xác nhận vẫn thủ công, không dựa duy nhất vào màu; màu xanh lấy green token hiện có. Không đổi shared theme/GM-39, không tự ready/start. |

**Không có mục nào trong ba mục bị bỏ vì mâu thuẫn thiết kế/logic project.** Những ràng buộc được giữ khi thực hiện: UTC+7, desiredAt UTC đúng GM-07, ăn ngay buffer một lần, presets sáng/trưa/tối đã bàn giao, Ăn nhẹ giữ giờ; ngày sai/giờ quá hạn không tự sửa/nới; sửa ngày/giờ/budget làm mất confirm/preview, phải xác nhận và xem món lại trước save. Các thao tác bị khóa khi member/stale/pending/unknown/ACK theo state cũ. Ngân sách không thành bộ lọc cứng hoặc phiếu NO.

## Nguồn đã đối chiếu

Rà soát Markdown repo theo từ khóa ngày/giờ/calendar/date picker/checkbox/ngân sách và đọc nguồn hành vi/thiết kế liên quan: AGENTS, [GM-10](../../../../tasks/backlog/GM-10.md), [UI_SPEC](../../../specs/UI_SPEC.md), [UI_DESIGN_SPECIFICATION](../../../specs/UI_DESIGN_SPECIFICATION.md), [CONTEXT_HISTORY_SPEC](../../../specs/CONTEXT_HISTORY_SPEC.md), [FOOD_DATA_SPEC](../../../specs/FOOD_DATA_SPEC.md), [COMPONENT_MAP](../../../design/COMPONENT_MAP.md), workflow/DoD, chuẩn output/checklist và docs/evidence GM-05/07/09/10. Design system/prototype/research lịch sử không ghi đè tokens/hành vi task hiện hành. Chỉ dẫn người dùng giữ ưu tiên project khi mâu thuẫn; không phát hiện xung đột bắt buộc từ ba đề xuất này.

Không mở lại ba mục A6/A7/A8 đã được người dùng loại khỏi phạm vi GM-10; không nâng dependency nền để sửa check:expo, không nối API/GPS/history thật hoặc lobby giả. Kết quả check:expo online trước đây vẫn được ghi theo log, không tự đổi thành Pass.

## Source/test và bàn giao

- [MealDateTimeFields.tsx](../../../../mobile/src/features/context/components/MealDateTimeFields.tsx): date selection + time field, controlled props riêng, chỉ sửa draft qua callbacks. Không đọc clock thiết bị trong render; getToday inject từ Context server-time handler.
- [ContextScreen.tsx](../../../../mobile/src/features/context/screens/ContextScreen.tsx): giữ date/time state riêng, ghép parseLocalTime khi preview/save, presets cập nhật cả hai; budget card riêng; checkbox. Checkbox/touch styles trong SetupFrame, không sửa shared UI/tokens.
- roomSetup.ts thêm shiftLocalDate/mealDateLabel: ngày hợp lệ, qua tháng/năm/leap, không UTC drift; date input invalid không được normalize thành ngày hợp lệ.
- Unit/component/routes suite được cập nhật theo role checkbox, input ngày/giờ tách riêng; giữ regression cũ requestId/version/reset-ready/no-widen/unknown-price/Home. Thêm tests picker next/previous page/clamp-to-today/đóng không chọn/partial input/disabled và confirmation invalidate.
- [Manifest chính](PATCH_MANIFEST.json) dùng bytes mới; [PRE_DATE_UI_PATCH_MANIFEST](PRE_DATE_UI_PATCH_MANIFEST.json) giữ hashes của revision537 tests trước lượt này. Các log FINAL trước đây là lịch sử, không chứng minh UI ngày/giờ mới đã được mở trên thiết bị.

## Kết quả kiểm trên revision mới

| Kiểm | Actual / evidence | Kết quả |
| --- | --- | --- |
| npm run check | TypeScript strict/lint/architecture, 4 warnings upstream giữ nguyên; **17 suites/551 tests**, Jest31.72s; [log](DATE_UI_MOBILE_CHECK.txt) | Pass |
| Android export |1294 modules; Hermes entry-d800cda8a975418a37e3c87ec743464c.hbc; [log](DATE_UI_ANDROID_BUNDLE.txt) | Pass export, chưa mở app thật |
| Python regression | **550 tests/124.926s, OK, không skipped**; [log](DATE_UI_PYTHON_REGRESSION.txt). [Lượt đầu](DATE_UI_PYTHON_INITIAL.txt) chạy khi tài liệu đang tạo nên có một link chưa sẵn; đã hoàn tất artifacts rồi chạy lại toàn bộ, không sửa validator/test để bỏ lỗi | Pass lượt cuối |
| Repo/indexes/diff/manifest/protected scope | [Log](DATE_UI_REPOSITORY_CHECK.txt);18 source/test hashes khớp, không thay shared/package/API/backend/task metadata, không staged/unmerged files | Pass |

## Thử lại trên Expo Go

Home → Công cụ kiểm thử → Chọn điểm ăn và khẩu vị:

1. Bấm Ngày ăn: thử Hôm nay/Ngày mai, trước/sau7 ngày, chọn ngày trong danh sách, nhập ngày khác rồi Xong chọn ngày. Ngày và giờ hiển thị riêng; đổi ngày giữ HH:mm, lỗi ngày/quá giờ chỉ rõ khi kiểm bối cảnh.
2. Chọn buổi/Ăn ngay và xem cả ngày lẫn giờ, thử giờ cụ thể 23:30; không cộng buffer lại khi lưu/retry.
3. Xem ngân sách trong thẻ riêng, để trống hoặc nhập số; không bắt buộc thành0.
4. Chạm phần chữ/khoảng trống/ô vuông của hàng xác nhận: checked có xanh+✓+text. Preview → đổi ngày/giờ/budget: mất checked/preview và phải xác nhận lại. Kiểm disabled ở Thành viên/Dữ liệu cũ/đang lưu/Mất phản hồi sau lưu.
5. Thử Light/Dark, font200, TalkBack, keyboard/Back ở màn nhỏ. Ngày chọn/checkbox đọc đúng state, không tràn hoặc mất vùng bấm.

Sau lượt sửa này, người dùng đã xác nhận “tôi đã kiểm tra và ổn thỏa”. **Expo Go: Pass theo xác nhận chung bằng văn bản**, xem [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md). Agent không trực tiếp thử trên điện thoại; model/Android/Expo Go và kết quả riêng từng fixture/light-dark/font200/TalkBack/keyboard/Back chưa được cung cấp, không tự đánh Pass. Không yêu cầu ảnh/video. Chỉ Trí review/merge/Done; chưa có approval.
