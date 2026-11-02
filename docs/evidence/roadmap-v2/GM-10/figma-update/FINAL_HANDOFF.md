# GM-10.2 — bàn giao UI thiết lập phòng và khẩu vị

Ngày 2026-11-02. Owner Tuấn, reviewer Trí (`ThanhTris`). Revision yêu cầu
`ui-figma-final/2026-10-25/GM-10.2`; source cuối
`c514bc0ae619957a8e982e72595c42ba8c493819`, nhánh
`codex/gm-10-figma-update` → `main`. Commit chuẩn bị bàn giao chỉ sửa docs.

Người dùng xác nhận “GM-10 đã hoàn thiện” sau bản sửa cuối; ghi nhận tại
[USER_ACCEPTANCE](USER_ACCEPTANCE.md). Đây là xác nhận chung của người
thực hiện, không tự ghi approval của Trí hoặc đổi Done trên Project.
Từng fixture/a11y/viewport chưa có kết quả thiết bị riêng vẫn giữ Not run.

## Bắt đầu nhận việc

1. Nhận source đã merge vào nhánh đích, kiểm SHA/review và Project Done
   theo gate của task nhận; không dùng tài liệu này để tự mở dependency.
2. Mở mock với `npm --prefix mobile start -- --clear` tại root, Expo Go
   SDK58: Home → Tạo phòng → Tiếp tục thiết lập → Chọn khẩu vị → Lưu/Bỏ qua.
3. Tái sử dụng `DishSetupFlow` và `DishSetupGateway` bên dưới. Kiểm đúng
   contract producer trước nối API; không viết lại UI hoặc cast draft
   dish-only sang legacy RoomContext có anchor/radius.

| Task nhận | Artifact và phần cần thực hiện tiếp |
| --- | --- |
| GM-24 | Dùng form/draft/validation hiện hành để nối thiết lập và preview pool dish-only theo artifact GM-07/16/18; map nullable budget/units, count 10–20 và shortage có xác nhận |
| GM-25 | Cấp gateway thật và auth/host-member guards; nối Home/create/join, own preferences và lobby GM-11 trên cùng room ID/version; không fallback mock khi adapter lỗi |
| GM-11 | Dùng callback `onLobby(room)` khi có lobby tương thích; nhận room handle đã ACK/readback. Không truyền `ui-room`/`MCK234` sang client thật hoặc đưa ready trở lại |
| GM-31 | Bổ sung cache/outbox/restore theo contract thực tế. Hiện intent/nháp chỉ trong bộ nhớ, chưa có cam kết giữ qua restart hoặc offline nhóm |
| GM-33/34 | Nhận lệnh mở, fixtures, checks và giới hạn dưới đây để kiểm Android/E2E/APK đúng stage; không dùng Hermes export thay kết quả thiết bị |

## Source và interface hiện hành

Các path dưới đây tính từ repo root:

| Artifact | Vai trò |
| --- | --- |
| `mobile/src/app/room/setup.tsx` | Route mỏng; mock dùng preview, real có auth/capability guard và chưa ghi phòng thật |
| `mobile/src/features/context/screens/DishSetupFlow.tsx` | Điều phối setup → preferences → receipt/closed; nhận `gateway`, `onExit`, `onLobby?`, `now?`, `requestId?`. QA controls là tùy chọn |
| `mobile/src/features/context/screens/DishSetupScreen.tsx` | Form buổi/giờ/số món/ngân sách/chống lặp/bạn |
| `mobile/src/features/context/services/dishSetup.ts` | SetupDraft, SetupRoom, UTC+7, helper giờ/buổi và validation |
| `mobile/src/features/context/services/dishSetupGateway.ts` | UI port read/write; consumer map DTO thật, không xem đây là wire schema mới |
| `mobile/src/features/context/hooks/useDishSetupFlow.ts` | Draft, lock/retry/ACK-readback và editor origin |
| `mobile/src/features/preferences/screens/DishPreferencesScreen.tsx` | Anything/taxonomy/multi-select/flavor/temperature/consent; `onChange`, `onBack`, `onSave(skip)` |
| `mobile/src/bootstrap/dishSetupPreview.ts` và `dishSetupCases.ts` | Mock và fixtures synthetic; thay bằng composition/adapter phù hợp khi tích hợp |

`read()` trả catalogue/friends đã được cấp quyền, connected,
canEditSettings, accountDefaults, ownRoomPreferences?, room?, settings?,
hasRecentHistory? và closedReason?. Chỉ expose lựa chọn thô của chính
người gọi; capability trên UI không thay quyền server.

`write()` nhận một trong ba intent:

- `settings`: requestId + draft, thêm room khi sửa; adapter phân biệt create/update.
- `preferences`: requestId + own preferences/consent + room.
- `cancel`: requestId + room; chỉ host, sau xác nhận người dùng.

`SetupRoom` gồm id/code/version/state `LOBBY|CLOSED`. Reply thành công
trả room; lỗi `REJECTED|UNKNOWN|STALE|CLOSED|SHORTAGE`, shortage có
available/requested. Consumer phải đối chiếu wire/version producer:

- ACK cần readback cùng ID/code, version không thấp hơn ACK; preferences
  cần own snapshot, cancel cần CLOSED trước hiện kết quả hủy.
- UNKNOWN giữ nguyên requestId/body, khóa sửa/Back và retry cùng intent.
  ACK nhưng read lỗi thì chỉ đọc lại, không gửi lại write.
- STALE giữ nháp, yêu cầu refresh trước lưu; CLOSED chặn tiếp tục.
  Shortage chỉ giảm sau xác nhận host và không dưới 10.
- Không tự ghi mặc định tài khoản khi sửa snapshot phòng; Bỏ qua/Anything
  giữ consent người dùng đã chọn. Null/unknown không thành giá 0 hoặc
  intensity đoán; flavor là ưu tiên mềm, không phải phiếu NO.

## Hành vi phải giữ khi tích hợp

- Ăn ngay tính buổi UTC+7: 07–08h sáng, 11–13h trưa, 19–21h tối
  (bao gồm toàn bộ giờ kết thúc); còn lại ăn vặt. Cho phép đổi thủ công.
- Từ Ăn ngay mở lịch mặc định sau 15 phút. Đang hẹn thì Sửa giữ giờ đã
  chọn. Đổi buổi hẹn: 07:00/12:00/18:00, ăn vặt giữ giờ; giữ ngày tương
  lai, nếu mốc đã qua chuyển lần kế tiếp. Không tự save/start từ đổi giờ.
- Sửa thiết lập từ receipt: lưu xong đi tới Khẩu vị cùng phòng; Back/bỏ
  sửa quay đúng origin. Hủy phòng cần xác nhận và ACK/readback CLOSED;
  chỉ sau đó host có Về trang chủ ở màn hủy. Member không được hủy.
- Tách backdrop fade và panel slide; giữ Reduce Motion, touch48, font
  scaling, TalkBack semantics và keyboard/safe area hiện có.
- QA development chia case theo setup/preferences, mặc định đóng, tìm
  mã/tên và Xem thêm; đổi fixture xóa mock/nháp, khóa khi kết quả chưa rõ.
- Không bịa taxonomy/giá/ảnh, không thêm vị trí/quán/coverage/ready làm
  điều kiện tạo pool; ranking nâng cao chưa được client này implement.

Chi tiết thay đổi: [BEHAVIOR_REFINEMENT](BEHAVIOR_REFINEMENT.md).
Assets nhỏ có provenance tại `mobile/assets/brand/preferences/SOURCE.md`;
PNG tham chiếu local không phải dependency để app chạy.

## Routes và compatibility

Entry mock `/room/create-entry` mở `/room/setup`. `/room/context` và
`/room/preferences` không roomId/legacy flag chuyển sang flow mới.
`legacy=1` hoặc roomId giữ consumer cũ đã có tests; dev dùng `dev/*`.
ContextScreen/PreferencesScreen cũ chưa xóa vì còn real/QA callers.
Task nhận chuyển các caller/import/tests trước khi bỏ source đó; không
xóa API/migration/engine v2/v3 chỉ vì UI mới đã có.

Không có nối lobby thật, invite delivery, dữ liệu bền, API integration,
DB activation hoặc thay package/lockfile trong bàn giao GM-10 này.

## Verification và review

[Checks source cuối](BEHAVIOR_REFINEMENT_CHECKS.json),
[manifest SHA256](BEHAVIOR_REFINEMENT_MANIFEST.json),
[checks chuẩn bị bàn giao](FINAL_REVIEW_CHECKS.json).

- Source cuối: 47 suites/878 Jest tests Pass, TypeScript/lint
  src-tests-scripts/architecture Pass, PNG 28/28 và Android Hermes export
  Pass; không tăng timeout. Không chạy lại mobile cho commit chỉ sửa docs.
- Full lint còn 4 imports trong QA local cũ; Python còn lỗi quyền symlink
  Windows, không assertion failure. Giữ Fail trong checks, không che lỗi.
- Không có metadata thiết bị, ảnh sau sửa hoặc kết quả riêng font200%,
  TalkBack/Dark/Reduce Motion/viewport; xác nhận chung của người dùng
  được ghi riêng, không tự tick mọi AC thiết bị.
- Đã fetch `origin/main` = `1939d3506a8ee88a95031033caa7a9137cd65e43`;
  source hiện bao gồm main này, không cần merge thêm tại thời điểm kiểm.
- Merge gate live `2026-11-02T16:39:40.226755+00:00`:
  READY_FOR_MERGE_REVIEW. Checker không thay review PR/commit upstream,
  test tích hợp thật hoặc quyết định nghiệm thu/merge của Trí.

Trước merge, reviewer cập nhật main/gate và kiểm diff/revision cuối.
Sau merge, consumers lấy commit merge thực tế từ PR; không dùng số schema,
Issue Closed hoặc handoff này làm bằng chứng deployed DB/API khớp source.
