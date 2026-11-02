# GM-10.2 — sửa lỗi sau lượt Expo đầu tiên

Ngày2026-11-02, base343b42e, nhánh `codex/gm-10-figma-update`.
Nguồn: ghi nhận chức năng của người dùng và14 ảnh local trong
`.work/gm10-errror-screens`:8 ảnh expected,6 ảnh errors. Raw inputs vẫn
ignore; [manifest](EXPO_REPAIR_MANIFEST.json) pin ảnh và source bằng SHA256.
Không lấy kết quả native của bản trước làm Pass cho bản sửa này.

## Lỗi tái hiện và thay đổi

| Lỗi trên ảnh/luồng cũ | Cách sửa |
| --- | --- |
| Checkbox ưu tiên thành nút lớn, tick rời, lời giải thích ngoài hàng | Hàng checkbox nền trung tính, nhãn trái, ô vuông phải; helper lịch sử nằm trong hàng. Giữ touch48 và checked/disabled đúng |
| Rủ bạn chỉ hiện số lượng | Chip tên/avatar chữ cái và nút Thêm; mở lại picker để sửa, không bịa profile/name khi ID chưa có |
| Picker bạn căn giữa, thiếu avatar/clear search | Avatar trái, tên trái, viền selected, khoảng cách hàng; empty có Xóa từ khóa; staging rồi confirm, hủy không đổi draft |
| Ngày/giờ là form text và lịch3 cột | Wheel giờ/phút native snap, nút ngày mở lịch7 cột thứ Hai trước; tháng trước/sau, lựa chọn ngày chờ confirm; lịch hẹp cuộn ngang giữ touch48, nội dung dài cuộn dọc |
| Giờ đã chọn hiện giây, thứ tự locale không ổn định | Format UTC+7 `dd/MM/yyyy · HH:mm`, không giây; parse/validate vẫn chặn ngày sai/giờ đã qua |
| Tùy chọn nâng cao là dãy nút lớn | Card disclosure có tóm tắt nhiệt độ hiện hành, radio dạng pill và giải thích ưu tiên mềm; giữ nguyên value khi đóng/mở |
| Thiếu hộp thoại bỏ thiết lập/khẩu vị | Hai dialog giữa màn, overlay theo mẫu, hai hành động rõ; Back khi có sửa chưa lưu giữ draft tới quyết định |
| Back từ sửa khẩu vị/thiết lập quay sai | Lưu origin của editor; sửa từ receipt thì Back/bỏ sửa trở về receipt trên cùng room/version. Sau lưu settings đã có own preferences cũng trở về receipt |
| Back sau tạo phòng làm mất ngữ cảnh | Host được thông báo phòng mẫu đã tạo, chọn ở lại hoặc xác nhận hủy. Chỉ sau ACK/readback CLOSED mới hiện Phòng đã bị hủy; Về trang chủ dismiss tới Home |
| Stepper chiếm nhiều chiều cao | Thêm layout inline cho màn mới; giữ variant card mặc định cho consumer cũ |

## Ranh giới dữ liệu và consumer

UI port bổ sung `cancel` intent có room/version/requestId và close reason;
chỉ mock bootstrap hiện implement. Consumer nhận definition mới trong
manifest, phải map/cấp quyền/xử lý idempotency theo artifact thực tế trước
bật real integration. Không đổi API/schema/migration hoặc tạo endpoint.

Cancel chỉ sau thao tác xác nhận, không tự hủy do Back hoặc unmount.
UNKNOWN replay cùng intent; ACK mất read chỉ đọc lại; member không được
gửi cancel/settings. Không nói đã hủy phòng thật từ mock. Phòng đã đóng
khác phòng chính người dùng vừa hủy; không cho mở editor sau đóng.

Màn mới vẫn có nhãn mô phỏng. Không thêm package/lockfile, không đổi token,
taxonomic IDs, tính điểm hoặc phiếu. Mặc định Account/own-room/consent giữ
riêng; hủy/bỏ thay đổi không ghi dữ liệu tài khoản hoặc gửi lời mời.

## Verification và giới hạn

- Start gate live13:50:39Z: READY_TO_CLAIM, owner Tuấn/reviewer Trí.
- TypeScript, ESLint src/tests/scripts, architecture: Pass.
- Full Jest45 suites/852 tests Pass104.384s, không tăng timeout/runner.
-12 ca tăng thêm so với840: lịch/wheel và navigation/discard/cancel/bạn/
  checkbox/advanced. Có replay cancel mất ACK và kiểm không tăng version hai lần.
- PNG pixel28 cases Pass; không thay asset raster trong lần sửa.
- Android Hermes export Pass: entry-6b9be66504c961d8a08537ec28e3db94.hbc.
- Python cuối657 tests/91.638s:650 Pass,6 skipped,1 lỗi quyền symlink
  WinError1314, không assertion failure. Lượt đầu chạy khi file JSON báo
  cáo chưa có đã phát sinh4 checker failures; sau hoàn thiện tài liệu và
  chạy lại toàn bộ, cả4 đã hết. Không sửa checker/test hoặc approval gate.
- Kết quả Android export/Python/docs/diff cuối xem
  [EXPO_REPAIR_CHECKS](EXPO_REPAIR_CHECKS.json).
- Full lint vẫn vướng4 imports của file QA local cũ; không sửa file đó
  hoặc exclude kiểm tra để ghi Pass. Python lỗi symlink nếu tái hiện vẫn
  giữ Error, không skip hoặc đổi quyền hệ thống để vượt test.
- Ảnh lỗi Android trước sửa: Fail theo báo cáo người dùng. Sau sửa:
  **Expo Go/native visual Not run**, chưa có model/Android/fontScale hoặc
  ảnh app mới. Không tuyên bố pixel parity, TalkBack/font200/keyboard Pass
  từ test component hoặc Hermes export.

## Lượt kiểm thiết bị tiếp theo

Từ root chạy `npm --prefix mobile start -- --clear`, mở lại app mock.
Home → Tạo phòng → Tiếp tục thiết lập. Kiểm:

1. Back ngay form mới: Bỏ thiết lập/tiếp tục, đúng Home và giữ nháp.
2. Tạo → chọn khẩu vị → sửa lựa chọn → Back: dialog bỏ khẩu vị.
3. Receipt → sửa khẩu vị hoặc settings → Back không sửa/Back có sửa:
   đúng receipt, không tạo phòng khác; sau lưu settings cũng về receipt.
4. Receipt → Back/Về Home: ở lại không write; xác nhận hủy có màn kết quả,
   rồi Về Home. Thử timeout/ACK đọc lỗi bằng fixtures, không đổi intent.
5. Chọn bạn/tìm không thấy/xóa từ khóa/hủy/confirm: avatar và chip đúng tên.
6. Hẹn giờ: wheel kéo và TalkBack increment/decrement, lịch7 cột, chọn ngày/
   hủy/confirm, giữ buổi và số món, không giây và không ngày minh họa cứng.
7. Checkbox/history và advanced panel;320/360/412dp, font200%, Dark,
   keyboard/Back/safe area. Ghi expected/actual cùng ảnh sau sửa và device.

Chưa tự approve/Done/push. Trí review revision này và các ca native còn mở.
