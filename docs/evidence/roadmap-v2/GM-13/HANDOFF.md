# GM-13 — bàn giao Result, nơi bán và No Consensus

Ngày 2026-10-19. Task [GM-13 / #74](../../../../tasks/backlog/GM-13.md), owner Tuấn
(`mtuan2491`), reviewer cuối Trí (`ThanhTris`). Nhánh
`codex/gm-13-result-no-consensus`, target `main`. Bàn giao code/tài liệu để gửi
PR; review, merge và Done do trưởng nhóm thực hiện, không tự ghi approval.

Revision nền `4d2cce7c161b4f11ccad5448f46d54a1ab4a67e8` + patch theo
[source manifest](OFFERING_LOAD_MANIFEST.json); commit chứa hồ sơ này bàn giao
patch cuối. Contract `food-v1/roadmap-v2/GM-13.1`, API GM-07.1, policy
`decision-v2`. Không đổi wire DTO/schema/engine/package/lockfile/native module.
Dataset là fixture tổng hợp GM-13, không verified/production data.

[CHECKS](CHECKS.md): 669 tests mobile, 550 tests Python không skipped, Android/
Hermes export đạt. Người dùng báo đã kiểm xong trên Expo Go sau bản sửa cuối;
theo chỉ dẫn trực tiếp không yêu cầu ảnh/video. Kết quả từng ca/a11y và thông số
thiết bị chưa xác nhận riêng giữ rõ trong CHECKS; không biến xác nhận chung thành
review Approved hoặc mọi device AC Pass.

Hồ sơ sau tổng hợp cũng đã qua regression 550 tests không skipped và validator/
check-docs/diff/hash; output mới tại [HANDOFF_PYTHON](HANDOFF_PYTHON.txt) và
[HANDOFF_VALIDATION](HANDOFF_VALIDATION.txt). Source/test không đổi so với lần
kiểm mobile 669 tests.

## Phạm vi và đầu vào

UI-08: winner/tier/reason, offering đúng winner/context, giá/đơn vị/nguồn/ngày
kiểm/lịch/khoảng cách, empty/stale/closed/changed/unknown, tải lần đầu/cập nhật,
refetch và action callbacks. UI-09: lý do No Consensus trung tính, tạo phiên mới/
kết thúc; không vòng ba, carry votes hoặc lộ người NO.

Artifacts GM-05 nhận từ tokens/components `b66d9e3`, bổ sung Expo Go `fe38c32`;
contracts GM-07 từ `5b304c5`, discovery supplement GM-18 từ `79ab027` theo hồ sơ
nhận đầu vào. Các commit chỉ truy vết, không thay xác minh upstream Done và
artifact trên target trước merge. Expo SDK57 theo
[baseline hiện hành](../../../project/EXPO_BASELINE.md) và lockfile nhánh.

## Chạy từ checkout

Trong thư mục `mobile`:

```powershell
npm ci --no-audit --no-fund
npm run check:expo
npm run check
npm run bundle:android
npm run start:go -- --clear --port 8081
```

Expo Go tương thích SDK57 qua Wi-Fi. Home → Công cụ kiểm thử → Xem cấu trúc ứng
dụng → Mở kết quả GM-13. Routes: `/gm13/result`, `/gm13/no-consensus`. Link trực
tiếp `exp://<LAN-host>:8081/--/gm13/result`. Điện thoại phải truy cập được Metro;
chỉ `/status` thành công chưa chứng minh tải bundle được trên điện thoại.

Người dùng đã mở app qua Wi-Fi sau xử lý môi trường trong cuộc hội thoại.
Script/tunnel `.work` là công cụ local không commit; source bàn giao không phụ
thuộc script đó. Không công bố URL tunnel tạm thời hoặc thay native module.

## Màn và fixture

Result mặc định: PERFECT, Phở bò mẫu và Quán phở mẫu. Thẻ quán tách tên/trạng
thái, giá/nguồn giá, địa chỉ/khoảng cách, lịch/cảnh báo, nguồn/ngày kiểm và bốn
action. Các nút có icon nhỏ, cùng nền/viền trung lập, không chọn sẵn Maps. Nhãn
xuống dòng Mở bằng / trình duyệt và Sao chép / địa chỉ; TalkBack vẫn dùng nhãn
đầy đủ kèm tên quán.

Mở Công cụ kiểm thử GM-13 cuối màn để đổi tier và fixture nơi bán, lỗi/loading
kết quả, mô phỏng lỗi actions hoặc No Consensus. Đổi fixture là chọn input kiểm
thử; màn sản phẩm không tự reroll kết quả.

| Fixture nơi bán | Dữ liệu và hành vi |
| --- | --- |
| Có nơi bán / Không có nơi bán | Response thành công có quán hoặc rỗng; có fetchedAt; empty khác lỗi mạng |
| Nơi bán cũ / Đóng cửa / Đổi thông tin / Chưa rõ dữ liệu | Banner tương ứng; giữ món đã chốt, unknown không tự điền nguồn/lịch/giá |
| Đang tải nơi bán lần đầu | items rỗng, fetchedAt null; không thẻ quán/action/timestamp; refetch disabled |
| Đang cập nhật nơi bán | Giữ items/fetchedAt cũ, banner và nhãn Dữ liệu cũ; refetch disabled |
| Lỗi tải nơi bán lần đầu | Không dữ liệu; banner lỗi, retry enabled; không hiện empty thành công |
| Lỗi cập nhật nơi bán | Giữ dữ liệu có nhãn/thời điểm cũ; retry enabled; cache không phải thông tin vừa tải thành công |

Loading không có timer; chọn Fixture Có nơi bán để thoát. Refetch từ trạng thái
khác chuyển ready/timestamp mẫu mới, giữ winner/tier/resultId. No Consensus có
EMPTY_INTERSECTION vòng 1 và ALL_REMOVED vòng 2, không winner/phiếu/người NO.
Tạo phiên mới xóa receipt phòng tổng hợp GM-09 trong bộ nhớ, mở form tạo mới;
không tự tạo room/ready hoặc mang phiếu. Back/brand/kết thúc về Home, không về
sửa phiếu ở phiên đã chốt.

## Artifacts và điểm nối

| Artifact | Cách dùng / output | Task nhận |
| --- | --- | --- |
| `mobile/src/features/result/screens/ResultScreen.tsx` | Inject result/context/offerings, readState và callbacks; render kết quả đã chốt | GM-27/30 |
| `mobile/src/features/result/screens/NoConsensusScreen.tsx` | Inject RoomResult không winner, reason hợp lệ, callbacks new/Home | GM-27 |
| `mobile/src/features/result/model.ts` | OfferingState/ResultOffering, public target, formatters/guards; types presentation nội bộ | GM-27/30 |
| `mobile/src/features/result/components/ResultOfferingCard.tsx` | Thẻ/nhãn cache/icon/pending/feedback; không gọi provider | GM-27/30 |
| `mobile/src/bootstrap/resultFixtures.ts`, `resultPreview.tsx` | Composition fixture, tier/10 trạng thái nơi bán, công cụ mô phỏng có nhãn | GM-27/33/39 |
| `mobile/src/app/gm13/result.tsx`, `no-consensus.tsx` | Routes mỏng; screen feature không import fixture | GM-27/33 |
| Tests component/resultScreens, integration/resultRoutes, unit/resultModel | Tier/identity/metadata/null/cache/retry/callback/route/Back assertions | GM-27/30/33 |
| [CHECKS](CHECKS.md), [manifest](OFFERING_LOAD_MANIFEST.json), [load states](OFFERING_LOAD_STATES.md) | Revision/output/xác nhận người dùng/giới hạn/cách tái lập | Trưởng nhóm và consumer |

### GM-27 — kết quả và nơi bán thật

Inject `RoomResult` từ response đã validate. Screen kiểm quan hệ tier/reason/
winner, không thay transport/auth/membership/eligibility hoặc suy NO từ public
DTO. Witnesses đối chiếu domain chỉ ở tests, không đưa ballots vào UI.

`OfferingState = {status, items, fetchedAt}` giữ public contract. Status có
ready/loading/error/stale/closed/changed/unknown; ready + items rỗng là empty.
Initial loading/error truyền `items: []`, `fetchedAt: null`; refresh loading/error
giữ items/fetchedAt lần thành công trước, kể cả cache rỗng. Có item đúng winner
hoặc fetchedAt thì screen ghi dữ liệu lần trước; timestamp null vẫn Chưa rõ.
`isCached` chỉ là prop nội bộ card, không thêm wire field.

Mỗi item cùng dishId/choiceId/winnerRoundDishId; item sai bị bỏ và có banner.
Giá/địa chỉ/source/metadata từng offering giữ riêng. Refetch không gọi submit,
không đổi snapshot pool/resultId/tier, không biến cache/lịch thành xác nhận đang
bán. Repository GM-27 quản lý request/cache thật và fetchedAt.

`ResultOffering = {offeringId, dish: PoolDish, source, checkedAt, schedule,
availability: scheduled|unknown|closed}`. GM-07 PoolDish/GM-18 OfferingCard chưa
có đủ source/lịch/ngày kiểm: map từ artifact duyệt hoặc truyền null, không suy
từ tên/giá. Nhiều offeringIds cần resolve từng nơi bán, không tự lấy ID đầu.
Giá group giữ đơn vị nhóm, 0 khác null; distance là mét đường chim bay từ public
anchor, không phải đường đi/GPS cá nhân.

### GM-30 — native actions

Inject `onExternalAction(action, target)` với maps/review/browser/copy, return
`{ok:boolean}` sync/async. Throw/ok=false hiện fallback trung tính. Target chỉ
roomId/resultId/winnerRoundDishId/choiceId/dishId/offeringId/venueId/venueName/
address/anchorId công cộng, không token/GPS/votes. Thiếu target khóa action;
pending khóa các nút item và ref guard ngăn double action.

GM-13 chỉ callback mô phỏng, chưa mở Maps/review/browser hoặc sao chép clipboard
thật. GM-30 xử lý allowlist/scheme/native response và fallback; không dùng search
URL làm bằng chứng nơi bán verified.

### QA, GM-39 và rollback

GM-33/34 nhận routes/fixture/steps/giới hạn tại CHECKS; unit/bundle không thay
Android–API/native build. GM-39 đọc đối chiếu screens/manifest, không tự áp dụng
HTML chưa duyệt vào app. Không migration/publish dataset/package mới; rollback
bằng revert commit GM-13 qua quy trình nhóm, không reset DB hoặc sửa lịch sử
nhánh đã chia sẻ.

## Việc còn lại của trưởng nhóm

Start gate lịch sử READY_TO_CLAIM không thay live gate hiện tại. Lượt local mới
`BLOCKED_PROJECT_UNVERIFIED`; quyền sửa local không miễn gate trước merge. Sau
cập nhật target chạy
`python scripts/task_readiness.py --task GM-13 --gate merge --base-ref origin/main`,
đối chiếu GM-05/07, contract/output/HANDOFF và commits trên target.

Trưởng nhóm review revision cuối, đối chiếu các mục chưa xác nhận riêng trên
thiết bị (light/dark/font200/TalkBack/responsive/từng ca), quyết định nghiệm thu/
merge/Done. Không yêu cầu ảnh/video cho lần bàn giao này; không tự Approved, đóng
issue hoặc đổi Project. API/native actions thật, persistence và multi-device
thuộc task tích hợp sau, không thêm vào scope nghiệm thu GM-13.

Stage/commit trong phiên agent hiện bị chặn ghi `.git/index.lock`; GitHub CLI/
Git network không khả dụng, không có browser để thay thế. Chưa commit/push/tạo
PR mới được. Đã chuẩn bị `.work/gm13-submit.ps1` (chỉ parse kiểm cú pháp, chưa
chạy) và `.work/gm13-pr-body.md` cho terminal người dùng; không phải artifact
bắt buộc của app và không commit thư mục `.work`. Script kiểm đúng nhánh,
không nhận staged changes có sẵn, stage riêng scope GM-13, commit nếu có thay
đổi, push không force, rồi mở/reuse PR. PR mới ở draft do gate/ca còn chờ xác
nhận. Nếu có PR đang mở cùng head/base, script cập nhật title/body từ bản chuẩn
bị thay vì tạo trùng, giữ trạng thái review hiện có. Không merge, tạo tag,
approve, đóng issue hoặc đổi Done.
