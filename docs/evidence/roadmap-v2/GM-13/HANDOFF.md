# GM-13 — màn kết quả và chưa đồng thuận

Revision mới nhất của thẻ nơi bán theo yêu cầu người dùng:
[bố cục, kiểm tra và cách thử lại](OFFERING_CARD_REFINEMENT.md),
[source manifest](OFFERING_CARD_MANIFEST.json). Public props/callbacks không đổi.

Lượt rà soát/sửa local ngày 2026-10-18: [kết quả và cách thử Expo Go](RECHECK_2026-10-18.md),
[manifest revision mới](PATCH_MANIFEST_2026-10-18.json). Các số liệu ngày 2026-10-16
bên dưới giữ làm lịch sử. Chưa có approval hoặc xác nhận Android thực tế mới.

Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`). Contract task
`food-v1/roadmap-v2/GM-13.1`; API `food-v1/roadmap-v2/GM-07.1`, result policy
`decision-v2`. Nhánh `codex/gm-13-result-no-consensus`, base/HEAD chưa commit
`4a8cd642c8d908d9e6d2c75d19c0935a44cba042` + working tree theo PATCH_MANIFEST.json.
Không Approved/Done, chưa commit/push/merge.

## Đầu vào và phạm vi

Start gate live `READY_TO_CLAIM` tại `2026-10-16T07:24:23.474977+00:00`.
Đã fetch main; HEAD và origin/main khớp trước triển khai. Tokens/components
GM-05 từ `b66d9e3`; HANDOFF có bổ sung Expo Go `fe38c32`. Contracts GM-07 hiện
được cập nhật cuối tại `5b304c5`, giữ version .1; discovery supplement GM-18
từ `79ab027`. Hash input đang nhận ở manifest; gate không thay việc kiểm chạy.
Các phiên bản/commit ngắn trên chỉ truy vết input, không tạo approval mới.

Đây là UI-08/09 với dữ liệu tổng hợp; server/API thật, Maps/review/browser/
clipboard thật, cache/outbox/reconnect và APK không nằm trong nghiệm thu GM-13.
Không sửa shared tokens, API DTO, engine, HTML, backend, package hoặc lockfile.

## Chạy từ checkout

Trong thư mục `mobile`:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run check
npm run bundle:android
npm start -- --clear
```

Dùng Expo Go Android hỗ trợ SDK57 theo EXPO_BASELINE. Home → Công cụ kiểm thử →
Xem cấu trúc ứng dụng → Mở kết quả và chưa đồng thuận · GM-13. Routes trực tiếp:
`/gm13/result`, `/gm13/no-consensus`. URL Expo Go thêm `/--/gm13/result` vào
địa chỉ Metro, ví dụ `exp://<LAN-host>:8081/--/gm13/result` (không phải endpoint API).

Màn mặc định hiện kết quả PERFECT, phở/nơi bán mẫu, giá/đơn vị/nguồn/ngày kiểm/
lịch dự kiến/khoảng cách và actions. Nhãn Mô phỏng luôn có trên routes này.
Mở Công cụ kiểm thử GM-13 ở cuối màn để chọn tier, nơi bán trống/cũ/đóng/đổi/
không rõ/loading/error, lỗi/loading kết quả, lỗi external actions và đổi sang
chưa đồng thuận. Màn chưa đồng thuận có cả hai reason vòng 1/vòng 2. Refetch
giữ cùng resultId/winner/tier; chọn fixture khác chỉ là thao tác kiểm thử có nhãn.

Maps/review/browser/copy chỉ báo đã nhận thao tác mô phỏng; **không tuyên bố
đã mở Maps hoặc sao chép clipboard**. Thử chế độ lỗi rồi chọn browser/copy để
kiểm fallback; vẫn chỉ callback. Nút tạo phiên mới xóa receipt phòng tổng hợp
GM-09 trong bộ nhớ và mở form tạo mới; không tự tạo room, ready hoặc mang phiếu.
Android Back và brand về Home, không quay lại sửa phiếu ở phòng đã kết thúc.

## Artifacts và điểm nối

- `mobile/src/features/result/screens/ResultScreen.tsx`: props bắt buộc result/context/offerings/onRefetch/onHome/onNewSession; readState loading/error/ready; onExternalAction tùy consumer. Không import mock, không gọi API hoặc selector.
- `mobile/src/features/result/screens/NoConsensusScreen.tsx`: nhận RoomResult không winner với reason hợp lệ; onHome/onNewSession, không expose phiếu hoặc người NO.
- `mobile/src/features/result/model.ts`: ResultOffering/OfferingState, ExternalActionHandler/PublicOfferingTarget và formatter. Đây là presentation contract nội bộ feature, không phải thay đổi wire DTO.
- `mobile/src/bootstrap/resultFixtures.ts` / `resultPreview.tsx`: fixture/composition riêng; nhãn/công cụ preview không có khi consumer dùng hai screens trực tiếp. Không export fixture từ feature public index.
- Hai routes mỏng, Foundation link và ba test suites riêng. Xem REQUIREMENTS_AUDIT để truy vết nguồn/AC.

### GM-27 — dữ liệu kết quả/nơi bán thật

Inject `RoomResult` từ response đã validate. Screen chỉ kiểm quan hệ tier/reason/
winner để tránh hiển thị kết quả sai loại; không thay transport guard/auth/
membership/eligibility hoặc tự chứng minh winner không có NO từ public DTO.
Fixture witnesses được đối chiếu với domain chỉ trong tests.

`OfferingState = {status, items, fetchedAt}`. `items` cùng dishId/choiceId/
winnerRoundDishId; item lệch bị bỏ qua và có cảnh báo/refetch. Mỗi item giữ metadata
của chính nó, không trộn giá/quán/nguồn. `status` có ready/loading/error/stale/
closed/changed/unknown; ready với items rỗng là empty. `fetchedAt` do repository
cung cấp, không biến cache thành xác nhận đang bán. Refetch chỉ thay offering
state, không gọi submit hoặc đổi snapshot pool/kết quả.

`ResultOffering = {offeringId, dish: PoolDish, source, checkedAt, schedule,
availability: scheduled|unknown|closed}`. GM-07 PoolDish và GM-18 OfferingCard
chưa cung cấp đầy đủ metadata lịch/nguồn/ngày kiểm; GM-27 phải map từ artifact
thực tế đã duyệt hoặc truyền null. Không tự suy source/lịch từ tên/giá, không
bịa field wire. Nếu GM-18 có nhiều offeringIds trong một card, cần resolve đúng
offering/metadata/địa chỉ trước tạo presentation item, không chọn tùy tiện ID đầu.
Giá group giữ đơn vị nhóm, 0 khác null; distance là mét đường chim bay từ anchor.

### GM-30 — native actions

Inject `onExternalAction(action, target)` với action maps/review/browser/copy,
return `{ok:boolean}` sync/async; throw hoặc ok=false hiện fallback trung tính.
Target chỉ gồm roomId/resultId/winnerRoundDishId/choiceId/dishId/offeringId/
venueId/venueName/address/anchorId công cộng; không token, GPS hoặc votes.
Thiếu identity/địa chỉ/anchor chặn action và thông báo, không search “gần đây”.
URL/scheme/host allowlist, browser/clipboard/native result và cold/warm thật do
GM-30 thực hiện. UI khóa actions của item khi pending và không gửi hai lần.

### GM-39 và QA

Hai screens, routes, fixture và manifest cho GM-39 đọc đối chiếu HTML; không tự
áp dụng thiết kế HTML chưa duyệt vào app. GM-33/34 nhận scenario/steps và giới hạn
thiết bị trong CHECKS; mock/unit/bundle không thay Android–API hoặc native build.

## Còn chờ nghiệm thu

Xem CHECKS: Expo Go Android, font200/TalkBack/responsive/reduced motion thực tế
chưa được xác minh tại lượt này. Không có adb/device sẵn trong môi trường agent.
Contrast màu shared GM-05 đã được GM-10 ghi nhận, cần owner GM-05/Trí xử lý theo
ownership; patch này không tự thay palette hay ghi accessibility Pass. Không
Done khi AC bắt buộc còn Not run; Trí review revision thật trước nghiệm thu.
