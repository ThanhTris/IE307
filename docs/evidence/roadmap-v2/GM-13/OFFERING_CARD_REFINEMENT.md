# GM-13 — điều chỉnh trình bày thẻ nơi bán

Ngày 2026-10-18, theo yêu cầu trực tiếp của người dùng trong cuộc hội thoại:
thẻ Quán phở mẫu cần dễ đọc, bắt mắt hơn, giữ logic và ưu tiên yêu cầu issue nếu
có mâu thuẫn. Đây là thay đổi local trong scope UI-08/GM-13, không phải hướng
thiết kế GM-39 hoặc thay contract/kiến trúc/quyền riêng tư.
Owner/reviewer giữ nguyên; chưa commit/push, chưa Approved/Done.

Revision: HEAD `4a8cd642c8d908d9e6d2c75d19c0935a44cba042` + working tree theo
[manifest thẻ nơi bán](OFFERING_CARD_MANIFEST.json). Contract GM-13.1, API GM-07.1,
policy `decision-v2`. Gate đã chạy lại và trả `BLOCKED_PROJECT_UNVERIFIED` vì
thiếu credential Project. Tiếp tục phần local GM-13 đã được người dùng cho phép
trong cùng cuộc hội thoại; không coi đây là gate đạt hoặc approval cho downstream.

## Thay đổi giao diện

| Trước | Sau |
| --- | --- |
| Tên quán và mọi thông tin nối thành các dòng có cùng độ nhấn | Header nền ấm với biểu tượng trang trí, tên quán lớn và nhãn trạng thái có chữ |
| Giá lẫn vào phần mô tả | Khối giá riêng, số/tiền tệ/đơn vị nổi bật, nhãn Giá tham khảo và nguồn giá luôn hiện |
| Địa chỉ, khoảng cách và lịch cạnh nhau như danh sách | Nhóm địa chỉ/khoảng cách riêng; lịch và thông báo phục vụ nằm trong khối nền ấm |
| Nguồn/ngày kiểm chưa tách khỏi nội dung chính | Vùng metadata có đường phân cách, giữ nguyên nguồn và ngày kiểm của đúng offering |
| Bốn nút lặp tên quán trên màn | Nhóm Maps/review và browser/copy; Maps có nền ấm/viền nhấn; nhãn TalkBack vẫn kèm tên quán |

Các trường theo issue vẫn luôn hiển thị, không thêm thao tác mở rộng để xem
source/checkedAt/schedule. Nhãn lịch dự kiến không được đổi thành “đang mở” hoặc
“còn hàng”; khoảng cách vẫn ghi đường chim bay từ điểm ăn chung và không phải
quãng đường đi. Không thêm đánh giá sao, ảnh quán hoặc trạng thái đã xác minh.

## Logic và điểm nối

- `mobile/src/features/result/components/ResultOfferingCard.tsx` là phần trình bày,
  nhận offering/availability/pending/feedback và callback action từ screen.
- `ResultScreen.tsx` giữ nguyên public props, `publicTarget`, lọc đúng winner,
  khóa `actionInFlight`, xử lý callback lỗi/thành công và state refetch/result.
- Nhãn nhìn thấy của nút gọn hơn; `accessibilityLabel` vẫn giữ Maps/review/browser/
  copy cùng tên quán như trước. Disabled/busy và callback target không đổi.
- Dùng lại formatter giá/khoảng cách/thời gian. Chỉ chuyển chữ “Giá tham khảo”
  từ cuối dòng giá thành nhãn riêng; không đổi số tiền/tiền tệ/đơn vị/khẩu phần.
- Không đổi model/DTO, fixture, engine, routes, NoConsensus hoặc nguồn dữ liệu.
  GM-27/30 tiếp tục inject dữ liệu và callbacks như HANDOFF trước đó.
- Dùng tokens hiện có; không đổi shared components/palette/package/lockfile.
  Các nút cao tối thiểu 48dp, không giới hạn số dòng; fontScale từ 1.5 chuyển nút
  thành một cột. Text trên nền ấm/khối giá dùng màu text để giữ khả năng đọc.

## Kiểm tự động trên revision này

| Kiểm | Actual | Kết quả |
| --- | --- | --- |
| Ba suites GM-13 sau lần đổi bố cục đầu | 40 tests, gồm tier, metadata/unknown, callback/failure/pending/double-click, refetch/winner, new/Home/Back và NoConsensus | Pass |
| `npm run check` trên bản cuối | TypeScript, lint 0 errors/4 warnings sẵn trong API, 24 suites/657 tests, architecture guard | Pass — [output](OFFERING_CARD_MOBILE_CHECK.txt) |
| `npm run bundle:android` trên bản cuối | Android/Hermes export thành công, không phải device smoke/APK | Pass — [output](OFFERING_CARD_ANDROID_BUNDLE.txt) |
| Python full regression với pandas/lxml/tzdata đã cài | 550 tests, OK, không có skipped | Pass — [output](OFFERING_CARD_PYTHON.txt) |
| Hash source và whitespace source/file mới | Khớp manifest; không lỗi whitespace | Pass |

Không thêm tests chỉ để chốt vị trí/màu/border của một thay đổi trình bày.
Giữ các test hành vi hiện có; toàn bộ 657 tests đã chạy trên bản cuối.
Các dòng Cell ERROR/HTTP429 trong Python output thuộc kịch bản test lỗi mô phỏng;
kết luận cuối của unittest là OK.

## Kiểm lại trên Expo Go

Giữ Metro/tunnel của người dùng đang chạy và Reload app, mở `/gm13/result`.
Không cần thay lệnh khởi động cho thay đổi này.

1. Có nơi bán: xem tên quán, giá/đơn vị/nguồn, địa chỉ/khoảng cách, lịch/cảnh báo,
   source/ngày kiểm có phân cấp rõ và vẫn đủ trường.
2. Chọn chưa rõ dữ liệu/đóng/cũ/đổi/trống: giữ thông báo tương ứng; missing target
   khóa actions; cập nhật nơi bán giữ winner/tier/resultId.
3. Bấm Maps/review/browser/copy, thử chế độ lỗi: đúng callback mô phỏng, không tự
   mở provider hoặc sao chép thật; kết quả không thay đổi.
4. Kiểm light/dark, màn nhỏ/lớn, font200 và TalkBack: tên quán/địa chỉ dài xuống
   dòng, không bị cắt; nút chuyển một cột ở font lớn và đọc đúng tên nơi bán.

**Not run:** visual review và kiểm font200/TalkBack trên điện thoại cho bố cục
mới. Người dùng đã báo mở được app trước yêu cầu đổi thẻ; điều đó chưa xác nhận
bố cục mới đạt. Không có screenshot/device evidence mới từ agent, không tự Done.
