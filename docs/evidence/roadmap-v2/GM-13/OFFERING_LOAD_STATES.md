# GM-13 — tải nơi bán lần đầu và cập nhật dữ liệu cũ

Ngày 2026-10-19, sửa local theo yêu cầu trực tiếp của người dùng: chia fixture
lỗi nơi bán thành lần đầu/cập nhật, kiểm và chia loading tương ứng; thêm icon
nhỏ cho Maps, review, trình duyệt và sao chép địa chỉ. Loading cần chia vì hai
tình huống có dữ liệu hiển thị khác nhau, giống như lỗi lần đầu/lỗi cập nhật.

Revision: HEAD `4d2cce7c161b4f11ccad5448f46d54a1ab4a67e8` + working tree theo
[source manifest](OFFERING_LOAD_MANIFEST.json). Contract GM-13.1, API GM-07.1,
policy `decision-v2`; owner Tuấn, reviewer Trí giữ nguyên. Chưa commit/push thay
đổi trong lượt này, không tạo tag, không tự Approved/Done.

Start gate đã chạy lại, trả `BLOCKED_PROJECT_UNVERIFIED` vì thiếu credential
đọc Project. Tiếp tục sửa GM-13 local theo quyền người dùng đã cho trong cùng
cuộc hội thoại; không coi ngoại lệ local là gate đạt hoặc approval downstream.

## Căn cứ và phạm vi

- [GM-13 AC](../../../../tasks/backlog/GM-13.md): offering stale/closed/changed/no
  data, refetch và action callbacks; không reroll món đã chốt.
- [UI spec UI-08/10](../../../specs/UI_SPEC.md) và
  [thiết kế UI-10](../../../specs/UI_DESIGN_SPECIFICATION.md): thông báo lỗi,
  refetch/retry, thời điểm cache.
- [Food data spec](../../../specs/FOOD_DATA_SPEC.md): refetch đúng winner/context,
  cache không xác nhận quán đang bán; lịch thay đổi không đổi resultId.
- Issue/spec không bắt luôn giữ thẻ quán khi lỗi. Hai fixture mới của mỗi trạng
  thái cụ thể hóa yêu cầu người dùng và phân biệt chưa có dữ liệu với dữ liệu cũ.

## Kết quả mong đợi trên Expo Go

Reload app đang mở, vào `/gm13/result`, mở **Công cụ kiểm thử GM-13**.

| Nút fixture | Nội dung phải thấy | Cập nhật nơi bán |
| --- | --- | --- |
| Fixture Đang tải nơi bán lần đầu | Winner giữ nguyên; thông báo đang tải; chưa có thẻ quán/action nơi bán/thời điểm tải thành công | Disabled trong khi loading |
| Fixture Đang cập nhật nơi bán | Giữ thẻ Quán phở mẫu; nhãn Dữ liệu cũ; Dữ liệu lần tải trước với thời điểm cũ; banner đang cập nhật | Disabled trong khi loading |
| Fixture Lỗi tải nơi bán lần đầu | Winner giữ nguyên; banner chưa tải được; không có thẻ quán hoặc thời điểm tải; không hiển thị thông báo empty thành công | Bấm để mô phỏng tải thành công và hiện thẻ quán |
| Fixture Lỗi cập nhật nơi bán | Giữ thẻ Quán phở mẫu có nhãn Dữ liệu cũ và thời điểm cũ; banner chưa cập nhật được, chưa xác nhận thông tin mới | Bấm để mô phỏng cập nhật thành công, bỏ nhãn cũ và đổi thời điểm tải |

Các fixture loading cố ý giữ trạng thái để quan sát; chọn Fixture Có nơi bán để
thoát loading. Không mô phỏng một request mạng thật hoặc tự kết thúc bằng timer.
Mỗi lần retry giữ winner/tier/resultId; chỉ cập nhật offering và fetchedAt.
Fixture Không có nơi bán vẫn là response thành công rỗng, có thời điểm tải và
thông báo Chưa có nơi bán phù hợp riêng. Cache rỗng khi cập nhật lỗi vẫn có thời
điểm cũ và banner lỗi; không suy lỗi mạng thành kết luận không có quán.

Maps có icon ghim vị trí, review có bong bóng bình luận, trình duyệt có quả địa
cầu, sao chép có hai tờ chồng lên nhau. Dùng native Views với màu theme, ẩn icon
trang trí khỏi TalkBack; nhãn nút, callback, target công cộng, pending và khóa
double-click giữ nguyên. Không thêm package/native module hoặc thay lockfile.

Theo yêu cầu tiếp theo cùng lượt: hai nhãn nhìn thấy ngắt dòng chủ động thành
`Mở bằng / trình duyệt` và `Sao chép / địa chỉ` (dấu `/` là xuống dòng); nhãn
TalkBack vẫn là câu đầy đủ. Bốn nút cùng nền surface/viền line, không ưu tiên
Maps. Viền nhấn Maps trước đây chỉ là lựa chọn trình bày, không phải selected
state hoặc yêu cầu của AC/spec; không có hành động được chọn sẵn.
Chiều rộng cơ sở của nút tăng theo fontScale để giữ các cụm từ; khi thiếu chỗ
các nút xuống hàng, fontScale từ 1.5 dùng một cột.

## Bàn giao cho GM-27/30

Public props `ResultScreen`, `OfferingState`, DTO và callback contract không đổi.
Initial load/error truyền `items: []`, `fetchedAt: null`. Refresh load/error giữ
items/fetchedAt của lần thành công trước (có thể là danh sách rỗng). Screen suy
cache từ items đúng winner hoặc fetchedAt; dữ liệu cũ có timestamp null được
ghi Chưa rõ, không tự tạo thời gian. `isCached` chỉ là prop trình bày nội bộ card.
GM-27 phải quản lý vòng đời request/cache thật; GM-30 tiếp tục inject callbacks
cho đúng public offering/context. GM-13 vẫn chỉ callback mô phỏng, chưa mở Maps,
review/browser hoặc sao chép thật.

## Kiểm tra tự động

| Kiểm | Actual | Kết quả |
| --- | --- | --- |
| Ba suites GM-13 trước bổ sung ca timestamp null | 51 tests: phân biệt 4 fixture, retry/cached empty, callback và winner bất biến | Pass |
| `npm run check` | 24 suites / 669 tests, gồm ca timestamp null; TypeScript, lint 0 errors/4 warnings có sẵn trong API và architecture guard | Pass — [output](OFFERING_LOAD_MOBILE_CHECK.txt) |
| `npm run check:expo` và typecheck sau chỉnh nhãn timestamp | Installed dependencies khớp lockfile và bundled compatibility, tsc không lỗi | Pass; kiểm locked/offline, không kiểm patch online |
| `npm run bundle:android` trên source cuối | Android/Hermes export; chưa phải APK hoặc device smoke | Pass — [output](OFFERING_LOAD_ANDROID_BUNDLE.txt) |
| Python full regression với pandas/lxml/tzdata đã cài | 550 tests, OK, không skipped; Cell ERROR/HTTP429 là test lỗi mô phỏng | Pass — [output](OFFERING_LOAD_PYTHON.txt) |
| Repo validator, check-docs, diff whitespace và hash source | Docs/links/JSON/task indexes hợp lệ; source khớp manifest | Pass — [output](OFFERING_LOAD_VALIDATION.txt) |

Repo validator, check-docs, diff/whitespace và hash source được kiểm lại sau khi
ghi hồ sơ. Không thay metadata task hoặc sinh lại indexes. Full Python đã chạy
cho thay đổi logic; sửa ngắt dòng/viền nút sau đó được kiểm lại bằng mobile check
và Android export, không chạy lặp Python cho thay đổi trình bày này.

**Not run:** visual review mới trên điện thoại, light/dark, font200 và TalkBack.
Người dùng đã mở được app trước thay đổi này; chưa xác nhận bốn fixture/icon mới
đạt trên thiết bị. Không dùng tests/bundle làm nghiệm thu Android hoặc API thật.

Cập nhật bàn giao ngày 2026-10-19: người dùng đã báo “tôi đã kiểm tra trên expo
go xong” sau patch cuối và không yêu cầu ảnh/video. [CHECKS](CHECKS.md) và
[HANDOFF](HANDOFF.md) ghi xác nhận tổng quát mới, nguồn tham chiếu thiết bị và
những ca chưa xác nhận riêng; các dòng Not run phía trên là kết quả tại thời
điểm agent thực hiện patch, không phủ nhận báo cáo người dùng sau đó. Không tự
chuyển xác nhận chung thành Pass riêng mọi ca hoặc approval/Done.
