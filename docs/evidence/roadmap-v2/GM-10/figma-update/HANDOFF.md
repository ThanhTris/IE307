# GM-10.2 — bàn giao sau bước1–6

**Đọc trước khi nhận việc:** [FINAL_HANDOFF](FINAL_HANDOFF.md) là bàn giao hiện hành sau các lượt sửa Expo. Phần dưới giữ kết quả bước 1–6 để truy vết, không thay hướng dẫn mới về picker, save settings hoặc hủy phòng.

**Điều chỉnh mới nhất:** [BEHAVIOR_REFINEMENT](BEHAVIOR_REFINEMENT.md) thay chỉ dẫn về save settings/footer và ghi bổ sung tương tác. Các kết quả bên dưới giữ nguyên cho source lịch sử; xem checks revision mới.

**Bản sửa sau lượt Expo đầu:** [EXPO_REPAIR](EXPO_REPAIR.md) sửa dialog,
điểm quay về editor/receipt, xác nhận hủy phòng mẫu, lịch7 cột/wheel, chip
bạn/checkbox và advanced panel. Có bổ sung cancel vào UI port; chỉ mock
implement, không đổi BE. Đọc checks/manifest của bản sửa trước phần baseline
bên dưới. Expo sau sửa chờ kiểm lại, không ghi visual/native Pass.

Owner Tuấn; reviewer Trí. Ngày2026-11-02, branch
`codex/gm-10-figma-update`, base1939d35 (đã nhận GM-09/PR147).
Không tự nghiệm thu, đổi Project status, merge hoặc push.

## Mở màn mới

Repo root: `npm --prefix mobile start -- --clear`, Expo Go tương thíchSDK58.
Trong mock mode: Home → Tạo phòng → Tiếp tục thiết lập → buổi/giờ/số món/
ngân sách/ưu tiên/bạn → Chọn khẩu vị → chọn hoặc Bỏ qua → xác nhận mẫu.
Route `/room/setup` giữ các màn trong cùng flow để Back không dựng phòng
khác. Có sửa lại khẩu vị/thiết lập trên cùng handle/version đã xác nhận.

Cuối form có **Tình huống kiểm thử** trong development/mock. P01–P11,
R01–R15, min10/max20, shortage15/7, mất ACK, ACK/đọc lỗi, stale, taxonomy
rỗng và member. R11/R12/P05/P06 cần bấm CTA để mô phỏng write tương ứng;
R06/R07 dùng picker native nhập giờ/phút và lịch. Đổi fixture xóa nháp/phòng
mẫu, kể cả chọn lại cùng fixture. Nút đổi fixture khóa khi intent chưa rõ.

Mock dùng bộ nhớ, không là tạo phòng/lời mời thật hoặc lưu bền qua restart.
Không có adapter lobby dish-only tương thích trong nhánh: cuối flow có
receipt rõ ràng, không ghép handle mẫu sang MockApiClient legacy hoặc dựng
lobby giả. Consumer inject `onLobby` khi đã có màn/version phù hợp.

## Interface consumer

| Input/output | Nghĩa và trách nhiệm consumer |
| --- | --- |
| `DishSetupFlow` | Nhận gateway, onExit, onLobby tùy chọn, clock/requestId factory; QA controls không bắt buộc |
| `DishSetupGateway.read` | Own/account defaults, catalogue, friends, connected, canEditSettings, room/settings; không roster/raw preferences người khác |
| `write(settings)` | UI draft dish-only, requestId, room ID/version nếu đang sửa; adapter phân biệt tạo/sửa và giữ idempotency |
| `write(preferences)` | Own preferences + consent riêng phòng, room/version; không tự update mặc định tài khoản |
| ACK | Readback phải khớp room ID/code và version không thấp hơn ACK; preferences cần own snapshot trước bước tiếp |
| UNKNOWN | Giữ nguyên intent/requestId, khóa sửa/back và retry cùng intent; outbox qua restart chưa được triển khai |
| STALE/CLOSED/SHORTAGE | Tải lại trạng thái/chặn phòng đóng/xác nhận available-requested theo spec, không auto giảm dưới10 |

UI draft không là GM-07.B wire DTO. TypeScript client hiện tại vẫn food-v1;
GM-24/25 phải nhận và xác minh adapter B, contract/manifest, taxonomy,
budget đơn vị, clock, durable IDs và quyền host/member thật. Không cast
draft thành RoomContext, bịa anchor/radius, hoặc coi mock assertions là RPC.
Real route mới chỉ hiện guard/capability notice, không khởi tạo gateway mẫu.

## Thay route và giữ compatibility

- GM-09 `/room/create-entry` nhận callback tới setup chỉ trong mock.
- Mock `/room/context` hoặc `/room/preferences` không roomId/legacy flag
  chuyển tới `/room/setup`, không seed location discovery/room legacy.
- Dev home/shell mở compatibility bằng `legacy=1`; roomId gắn caller
  legacy vẫn giữ đường đã nhận. Layout chỉ bật provider cũ cho các ca đó.
- Chưa xóa ContextScreen/ContextDraftFields/PreferencesScreen legacy và
  useRoomSetup/roomSetupPreview: real GM-24/25, compatibility QA và tests
  còn consumer. Không còn dùng chúng cho entry mock dish-only mới.
- Không xóa API/engine/migration hoặc thay package/lockfile/token nền.

## Khác biệt thiết kế có chủ đích

Figma PNG do người dùng cấp là tham khảo được phép bổ sung. Giữ xanh/kem,
Inter/token/component đã nhận; thiếu trạng thái thì dùng notice/dialog/CTA
đồng nhất. Chi tiết trong [FIGMA_PARITY](../FIGMA_PARITY.md).

- Picker ngày/giờ native có trường nhập và lịch thay wheel Figma; không thêm
  package native. Consent/riêng tư/nhiệt độ nâng cao được bổ sung gọn.
- Bánh/Âu đổi thành Bánh cuốn/Ý theo ID thật; Bún/Phở chọn hai IDs canonical.
- Mặc định ngân sách nullable/không giới hạn; không suy ra giá0 hoặc đổi
  observation món thành giá/người. Vị chua/cay unknown intensity, không
  tự đoán medium/high. Nhẹ/đậm đà là ưu tiên salty low/high, có giải thích.
- Bổ sung member read-only, stale/ACK unknown, readback fail, taxonomy rỗng;
  callback phòng chờ không được gọi trước xác nhận/snapshot hợp lệ.
-14 glyphs khẩu vị lấy từ export, alpha/antialias và contain26x26, có
  provenance/script. Whole PNG chỉ dùng đối chiếu, không làm UI screenshot.

## Việc còn lại ở bước7

Expo Go và ảnh app cùng viewport412dp, 320/360dp, font200%, TalkBack,
keyboard/caret/picker/Back/safe area và Dark capability: **Not run**.
Kiểm đúng các preset và chụp expected/actual, sửa sai khác hoặc để Trí chốt.
Chưa xác minh revision/variables live vì MCP bị từ chối; không ghi AC này Pass.
Kiểm tra tự động hiện hành xem [CHECKS](CHECKS.md); gate trước merge vẫn
phải fetch/main + Project Done/artifact review, không suy từ start gate.
