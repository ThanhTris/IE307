# GM-10.2 — điều chỉnh tương tác sau kiểm thử Expo

Ngày 2026-11-02, nhánh `codex/gm-10-figma-update`, base `9700bc8`.
Nguồn: yêu cầu chức năng người dùng sau lượt kiểm thử tiếp theo; không có
ảnh mới. Giữ phong cách và assets hiện có. Không dùng nhận xét “thiết kế
tạm ổn” làm nghiệm thu mọi AC hoặc ghi native Pass cho revision mới.

Start gate live `2026-11-02T15:22:44.208139Z`: READY_TO_CLAIM,
owner Tuấn, reviewer Trí. Không đổi Project/status/approval.

## Thay đổi và quyết định

| Ghi nhận | Hành vi sau sửa |
| --- | --- |
| Chọn bạn khó nhận biết | Viền xanh primary dày 2, nền chọn, avatar đổi màu và dấu tick; giữ staging/confirm/cancel và checkbox accessibility |
| Buổi ăn mặc định chưa theo giờ | Khởi tạo mock hoặc chọn lại Ăn ngay tính UTC+7: 07:00–08:59 sáng, 11:00–13:59 trưa, 19:00–21:59 tối, còn lại ăn vặt. Người dùng vẫn đổi thủ công; không có timer tự ghi đè lựa chọn |
| Giờ hẹn mặc định | Mỗi lần từ Ăn ngay mở Hẹn giờ, mặc định cộng 15 phút ở độ chính xác phút; qua nửa đêm đổi ngày. Mở Sửa khi đang hẹn giữ giờ đã chọn |
| Đổi buổi sau khi hẹn | Sáng 07:00, trưa 12:00, tối 18:00; ăn vặt giữ giờ. Giữ ngày tương lai đã chọn; nếu mốc hết hạn, lấy lần xuất hiện tương lai tiếp theo. Đây là gợi ý draft theo yêu cầu, không tự save/start phòng |
| Ngày/giờ sát chữ Sửa | Ngày/giờ chiếm vùng riêng, Sửa có màu primary/gạch dưới và touch target 48; TalkBack đọc đủ thời gian |
| QA lẫn màn và quá dài | Danh sách mặc định đóng; chỉ case màn thiết lập hoặc khẩu vị, tối đa 6 hàng ban đầu, tìm theo mã/tên và Xem thêm. Case ACK/stale dùng chung giữ đúng màn hiện tại; ẩn trên receipt/closed |
| Sửa thiết lập từ receipt | Sau ACK/readback settings đi tới Khẩu vị trên cùng room/version; Back hoặc bỏ sửa vẫn trở về receipt. Giữ snapshot khẩu vị/consent riêng, không tạo phòng thứ hai |
| Nền xác nhận trượt cùng panel | Native Modal không slide trong dialog này; backdrop chỉ animate opacity, panel chỉ translateY. Giữ modal tới khi đóng xong, khóa bấm trùng; áp dụng Reduce Motion và cleanup khi unmount |
| Nâng cao chỉ có nhiệt độ | Bổ sung 4 vị cay/mặn/ngọt/chua với Không ưu tiên/Không có/Có chưa rõ mức/Nhẹ/Vừa/Đậm. Giữ null/unknown riêng với false/none và true/unknown; thay một vị giữ các vị khác và consent |
| Footer sau hoàn tất | Host có Hủy phòng → xác nhận → ACK/readback CLOSED → Phòng đã bị hủy → Về trang chủ. Member chỉ có Về trang chủ, không cấp quyền hủy |

Các cửa sổ giờ được hiểu bao gồm toàn bộ giờ kết thúc đã nêu (ví dụ
08:59 vẫn là sáng); không suy giờ ăn tối mặc định thành giờ hẹn tối:
khung tự chọn buổi là 19–21h, còn gợi ý hẹn tối là 18:00 theo yêu cầu.

## Ranh giới bàn giao

Chỉ presentation, draft helpers và bootstrap mock. Không đổi package,
lockfile, API/SQL/schema, dataset hoặc engine. Màn vẫn ghi rõ mô phỏng;
GM-24/25 cần nhận adapter/version producer thật trước nối dữ liệu.

Theo [GM-07.B](../../../../architecture/DISH_SESSION_API_CONTRACT_B.md),
FlavorProfile và temperature đã có, còn preference ranking là UNSUPPORTED;
không dựng chức năng ranking hoặc tạo phiếu NO từ mục Không có. Tất cả
thay đổi khẩu vị vẫn là ưu tiên mềm, không loại món hoặc đổi điểm ballot.

Bản này thay chỉ dẫn cũ trong EXPO_REPAIR về save settings quay thẳng
receipt và footer Home trước hủy. Các manifest/checks cũ là evidence lịch
sử, không thay hash để tạo bằng chứng kiểm lại. Xem
[checks revision này](BEHAVIOR_REFINEMENT_CHECKS.json) và
[manifest source/test](BEHAVIOR_REFINEMENT_MANIFEST.json).

## Kết quả kiểm tra

- Full Jest: 47 suites / 878 tests Pass trong 121.017s, không skip hoặc
  tăng timeout/đổi runner. Tăng 26 ca so với bản 852 trước đó; nhóm liên
  quan chạy riêng 46/46 Pass sau sửa truy vấn test và chia nhỏ ca dài.
- TypeScript, ESLint src/tests/scripts và architecture: Pass.
- PNG transparency: 28/28 Pass; không thay assets trong revision này.
- Android Hermes export Pass: `entry-5dacb31f85a383072941c4f604b76458.hbc`.
  Hash bundle và 23 file source/test được ghi trong checks/manifest.
- Repository validator, task indexes và diff: Pass.
- Full lint vẫn Fail với 4 imports lỗi trong file QA local cũ
  `mobile/.work/gm10Audit.test.tsx`; không sửa file đó hoặc ignore thêm để
  ghi Pass. Source/tests/scripts sạch, không có warning ở lượt cuối.
- Python: 657 tests / 119.503s, 650 Pass, 6 skipped, 1 Error, không
  assertion failure. Error cũ WinError1314 tại
  `test_stage_refuses_symlink_output`: Windows từ chối tạo symlink ở
  setup test, chưa chạy hàm được kiểm; không đổi test/quyền hệ thống.
- Log, build và đầu vào local vẫn ignore; không commit tài liệu nháp
  riêng hoặc ảnh tham chiếu. Không push, merge, approve hoặc đổi Done.

## Kiểm lại trên Expo Go

Tại repo root: `npm --prefix mobile start -- --clear`, mở lại app SDK58.

1. Home → Tạo phòng → thiết lập: buổi mặc định theo UTC+7, đổi buổi thủ
   công rồi bấm Ăn ngay; mở Hẹn giờ phải cách hiện tại 15 phút.
2. Hẹn hôm nay rồi chọn sáng/trưa/tối; kiểm giờ 07/12/18 và ngày mai nếu
   đã qua. Hẹn một ngày tương lai phải giữ ngày đó. Ăn vặt giữ giờ.
3. Chọn bạn: dễ thấy viền/tick; hủy không áp dụng. Sửa thời gian tách
   biệt, chữ lớn không đè lên ngày/giờ, TalkBack đọc đủ timestamp.
4. Mở QA ở thiết lập và khẩu vị: không lẫn case; tìm kiếm/Xem thêm,
   đổi case ACK/stale trong khẩu vị không nhảy về form thiết lập.
5. Hoàn tất → Sửa thiết lập → lưu: vào Khẩu vị, giữ cùng mã phòng.
   Back không sửa/Back có sửa/bỏ thay đổi vẫn đúng origin.
6. Nâng cao: nhiệt độ và đủ 4 vị, sửa một vị giữ các vị khác; Ăn gì
   cũng được reset ưu tiên mềm nhưng giữ consent; lưu/đọc lại đúng.
7. Receipt → Hủy phòng hoặc Back: nền xanh fade tại chỗ, panel trượt;
   Ở lại cũng fade riêng. Chỉ sau xác nhận hủy mới có màn đóng và Home.
   Thử Reduce Motion, bấm nhanh hai lần và Back phần cứng.
8. Kiểm 320/360/412dp, Dark, font200%, TalkBack, keyboard/safe area.

Expo Go/Android visual, Reduce Motion và accessibility trên thiết bị
sau bản sửa: **Not run**. Export Hermes/component tests không thay bằng
chứng native; người dùng kiểm rồi chuyển Trí review, chưa tự ghi Done.
