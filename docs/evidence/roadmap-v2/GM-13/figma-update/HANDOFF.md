# GM-13.2 — bàn giao sau bước 1–6

Ngày2026-11-03, owner Tuấn, reviewer Trí. Nhánh
`codex/gm-13-figma-update`, base `7e24074` (GM-10/PR148 đã nhận).
Source revision `ui-figma-final/2026-10-25/GM-13.2`; input wire tham chiếu
GM-07.B và GM-07.B-supplement, không phải DTO/API mới đã publish.

Đọc [CHECKS](CHECKS.md), [manifest source](SOURCE_MANIFEST.json),
[ma trận thiết kế](../FIGMA_PARITY.md) và [kế hoạch](PLAN.md).
Chỉ UI mock/composition, chưa nghiệm thu Android/API/native map.

## Mở và kiểm trên Expo Go

Sửa nối route ngày2026-11-03: Home chính `/` đã truyền callback mở
`/dev/foundation` trong development. Trước sửa, chỉ `/dev/home` có
callback này nên Home chính không hiện công cụ kiểm thử. Nhãn
“Mô phỏng · GM-09 · dữ liệu mẫu” thuộc Home mock, không chỉ revision GM-13.

Từ repo root: `npm --prefix mobile start -- --clear`, Expo Go SDK58.
Vào Home mock → Công cụ kiểm thử → Xem cấu trúc ứng dụng → Mở kết quả
GM-13. Route `/room/result` mở vinh danh, Chạm để bỏ qua mở podium/map.
`/room/no-consensus` mở kết thúc R1; QA chọn kết thúc R2.

Tình huống kiểm thử kết quả mặc định đóng, có tìm kiếm/Xem tất cả; chỉ
development/mock. Bộ kết quả có1/2/3 món, đồng hạng2/đầu/cuối/tất cả,
thiếu ảnh/giá, legacy unscored, invalid, loading/finalizing/error/unknown.
Quán có ready/loading/empty/error, permission/deny/blocked/location-off,
offline/unsupported. Mock permission/retry có pending rồi dữ liệu mẫu;
không gọi GPS/Places/Maps/TikTok/YouTube thật. QA có Xem lại vinh danh và
Nhận kết quả mẫu; không có timer tự chốt phiên sản phẩm.

Đổi kịch bản reset flow mẫu; đổi state quán/retry giữ result/winner.
Sau đợt kiểm Expo, mock retry error/unknown/invalid nhận projection hợp
lệ và mở vinh danh lần đầu. Invalid ban đầu vẫn bị từ chối; chỉ bộ mẫu
trả dữ liệu hợp lệ mới khi bấm Thử lại, không nới validator của consumer.
Xem [UI_REFINEMENT.md](UI_REFINEMENT.md) cho các sửa đồng hạng/copy.
Tạo phòng mới chỉ bỏ receipt tổng hợp trong bộ nhớ, giữ tên khách và mở
`/room/create-entry` → thiết lập GM-10; không tạo phòng hoặc mang phiếu cũ.
Home/đóng/Back terminal dùng callback về Home, không quay sửa ballot.

## Điểm nối consumer

| Task nhận | Input/output cần dùng |
| --- | --- |
| GM-27 | `DishResultFlow` + `resultPresentation.ts`; cấp input versioned/read states/roster đã được phép/callbacks thật và cùng room/session context riêng |
| GM-30 | `NearbyState`, `ResultMapRenderer`, action targets trong `nearbyPresentation.ts`/`resultPresentation.ts`; cấp map thật/Google Places trực tiếp app, auth key restrictions/attribution/quota/permission và native evidence |
| GM-28/31 | Giữ persisted projection/capability qua history/cache; legacy thiếu score/Top3 không được backfill, outbox/durable restore chưa triển khai ở đây |
| GM-33/34 | Nhận fixtures/cách mở/checks để kiểm Android/E2E/APK; không lấy component tests hoặc export Hermes thay device cases |

`mobile/src/features/result/screens/DishResultFlow.tsx` nhận:

- `input`: scored-v4 với terminal projection, hoặc legacy-unscored-v1 với
  RoomResult cũ; `readState`, `members`, `artworkSources?`, `nearby?`,
  `renderMap?`, `isMock`, `celebrate?` và QA `controls?`.
- `onHome`, `onNewSession`, `onRetryResult` tách riêng; retry không là
  evaluate/finalize/new session.
- `onRetryPlaces`, `onRequestLocation`, `onOpenSettings` tùy capability;
  không có callback thì UI disabled, không tự xin GPS.
- `onExternalAction(maps|tiktok|youtube,target)` trả `{ok}` hoặc Promise;
  target chỉ resultId/dishId/dishName và public place tùy chọn.
- `renderMap` nhận public places, selectedPlaceId và callback chọn quán.
  Mock illustration chỉ khi isMock; real không có renderer không thay
  bằng ảnh map mẫu. Maps link là hỗ trợ, không thay map trong app.

Scored projection theo spec có tối đa3 topDishes, score/rank/winner do
producer persist. UI kiểm dense rank, ID duy nhất, một winner rank1 và
deep-match locked winner; không tự tính ballot/sửa response hoặc reroll.
Supplement cần exact ACK cohort, score không vượt2×cohort; baseline B
thiếu cohort chỉ kiểm range khả dụng, không tự điền từ roster. Decoder/
schema/runtime/cohort thật vẫn phải được consumer xác minh trước tích hợp.
Room ID cho routing nhận từ context riêng, không chèn vào terminal DTO v4.

NO_CONSENSUS chỉ hợp lệ khi winner null/top[] và reason/round tương ứng.
Loading/error/unknown/invalid không tự thành chưa đồng thuận. Không lộ
phiếu cá nhân, seed hoặc người NO. Giá chỉ dùng locked priceReference có
amount/currency/unit/source/time hợp lệ; không đọc catalogue hiện tại,
fallback giá cũ hoặc chuyển thành giá/người. Artwork null không bịa URI;
3 ảnh món Figma chỉ được bootstrap mock cấp riêng qua artworkSources.

Places bị ràng buộc cùng resultId/winnerDishId, khác identity bị ẩn. Dữ
liệu cached cần flag/nhãn; loading/error khác successful empty. Tọa độ/
khoảng cách thiếu là null, không0. Action chống bấm trùng và bỏ feedback
trả chậm sau unmount/đổi result. Lỗi quán/action giữ nguyên winner.

## Thay route và giữ legacy

Default `/room/result` và `/room/no-consensus` dùng DishResultEntry →
DishResultPreview → DishResultFlow. Real mode qua auth/capability guard,
không fallback mock hoặc dựng kết quả giả khi chưa nhận adapter GM-27.

Development/mock `?legacy=1` giữ `resultPreview` + ResultScreen/
NoConsensusScreen/model/offering cũ để regression và versioned consumers.
Flag không vượt real-mode guard. Các file cũ còn consumer tests/QA nên
chưa xóa; không phải màn mặc định dish-only. Consumer nhận named exports
DishResultFlow/Screen mới, không dùng RoomResult legacy để ép Top3.

GM-05 ResultPodium thêm presentation=podium; variant cards mặc định giữ
cho consumer cũ. Motion được đưa vào shared useDialogMotion; hook GM-10
giữ export alias compatibility. Không đổi package/lockfile/API/SQL/engine.

## Đối chiếu và phần bổ sung thiết kế

Đã dùng PNG local theo quyền người dùng. MCP file gốc trả không có edit
access; chưa xác minh variables/revision live. SOURCE.md + script tọa độ
và manifest pin6 assets nhỏ, không dùng whole screenshot làm UI.

- Mẫu hai món cùng4 điểm nhưng rank1/2 được sửa thành1/1 trong fixture.
- Cùng rank cùng chiều cao; vị trí bục2–1–3 là ánh xạ visual theo Figma,
  không đổi dữ liệu/rank/order persisted hoặc chọn lại winner.
- Nhãn winner đặt riêng trong layout để không bị card Cùng ăn che.
- Số hạng/medal dùng dark brand trên xanh sáng để tăng tương phản; CTA
  dùng primary. Giữ layout/nền/màu trang trí của mẫu, không dùng cam cũ.
- Overlay dùng scrim xanh và motion có sẵn; không thêm blur/native package.
  Góc bục/spacing/hiệu ứng và tỷ lệ ảnh vẫn cần so trực tiếp ở bước7,
  không tuyên bố pixel parity từ component hoặc asset checks.
- Thêm fallback null/legacy, denial/settings/offline/capability, cached,
  invalid và async feedback theo cùng notice/button pattern.
- Text dài/chữ lớn cuộn được; header/CTA touch48. Các kết quả a11y,
  Dark/Reduce Motion và geometry trên thiết bị vẫn cần bước7 xác nhận.

## Việc còn lại — bước7

Kiểm vinh danh/tap/Back, tất cả tie/1/2/3, R1/R2 NO_CONSENSUS,
invalid/loading/retry, map permission/loading/empty/error và Tạo phòng
mới/Home. So412dp cùng Figma, thêm320/360dp, font200%, TalkBack, Dark,
Reduce Motion/safe area; ghi device/build/commit/expected/actual/ảnh.

Fix và commit theo nhóm lỗi, rồi cập nhật source hashes/checks. Trước
merge cần ref main/gate/upstream revision và review Trí; không tự Done,
approve, merge hoặc push. Native/API chưa kiểm giữ Not run.
