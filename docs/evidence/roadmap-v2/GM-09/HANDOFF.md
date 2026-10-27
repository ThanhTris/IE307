# GM-09 — bàn giao màn Home / create / join

## Bàn giao hiện tại để Trí review — 2026-10-15

Người dùng đã xác nhận kiểm GM-09 thành công và hoạt động trên Expo Go sau bản sửa cuối. [Biên bản kiểm thủ công](MANUAL_DEVICE_CHECK.md) là evidence văn bản theo chỉ dẫn hiện tại, không yêu cầu ảnh/video cho lần bàn giao này. Chưa có model/Android/Expo Go và kết quả riêng light/dark/font200/TalkBack/keyboard/Back/từng fixture; biên bản giữ rõ giới hạn, Trí đối chiếu trước nghiệm thu.

Nhánh `codex/gm-09-home-create-and-join-room`, target `main`; base HEAD `6735694` + working tree, contract GM-09.1, component props GM-05.1/client GM-07.1. [Manifest source/test cuối](REVIEW_PACKAGE_MANIFEST.json) bổ sung cả AppButton và shared component tests, không dùng manifest patch box-only làm bản hiện hành. Kiểm tự động cuối: mobile462 tests và Python550 tests không skipped, Android export Pass; xem [CHECKS](CHECKS.md). Phiên chuẩn bị này chỉ sửa tài liệu/manifest, không sửa source/test.

Owner Tuấn, reviewer Trí. Người dùng sẽ commit/push nhánh và tạo PR bằng [body đã chuẩn bị](PR_BODY.md); hiện chưa thực hiện các thao tác đó. Trí là người duy nhất được review cuối, merge và chuyển task Done trên Project. Không ghi Approved/Done hoặc tự chuyển task Markdown; xác nhận UI hoạt động của người dùng không được coi là approval của Trí.

### Cách commit/push và mở PR

Lệnh PowerShell đầy đủ ở [COMMIT_AND_PUSH.md](COMMIT_AND_PUSH.md), gồm danh sách stage đúng phạm vi và body PR; người dùng chạy các lệnh, agent chưa stage/commit/push.

Từ root, kiểm `git branch --show-current` đúng nhánh trên; dùng `git diff --check` và `git diff --stat`, chỉ stage source/test GM-09 cùng evidence và report. Kiểm `git diff --cached --stat` trước commit. Commit mới giữ hashes source/test trong manifest; lấy SHA bằng `git rev-parse HEAD` để ghi trên PR khi cần. Không amend hoặc force-push.

Push bằng `git push -u origin codex/gm-09-home-create-and-join-room`; tạo PR target `main`, title `feat(gm09): complete Home and room entry UI`, body từ `docs/evidence/roadmap-v2/GM-09/PR_BODY.md`. Nếu nhánh đã có PR, push sẽ cập nhật PR đó; lúc đọc remote ngày 2026-10-15 chưa có nhánh cùng tên/PR mở. Chọn Trí review theo quy trình nhóm; không merge, auto-merge, tự đóng issue hoặc đổi Status/Done.

Trước merge, Trí cập nhật origin/main, chạy gate merge theo AGENTS và kiểm CI/diff/revision cuối. Tài liệu lịch sử dưới đây giữ nguyên kết quả từng thời điểm; phần nào ghi chưa có xác nhận thiết bị được thay thế bởi biên bản mới ở đầu file, trong đúng giới hạn đã nêu.

## Bản sửa hiện tại sau phản hồi hai CTA không bấm được — 2026-10-15

Phản hồi Expo Go của người dùng xác nhận patch box-only trước đó làm cả hai CTA mất phản hồi. AppButton hiện tại đã bỏ pointerEvents override, giữ Pressable mặc định; nhãn stretch toàn chiều ngang, chuyển padding vào nhãn và minHeight46dp cộng border1dp mỗi cạnh của khung48dp. Cả khoảng trống và chữ nằm trong native bounds của nhãn, xử lý nhấn vẫn qua một callback tại khung. Props/contract GM-05.1/GM-09.1, palette và guard disabled/loading không đổi. Revision `6735694` + working tree hiện tại; kết quả mới ở [CHECKS](CHECKS.md), không dùng log/hash patch box-only làm evidence cho bản này.

Nhấn `r` ở terminal Metro để reload đầy đủ (không chỉ Fast Refresh). Nếu đang có receipt, chọn lại fixture **Bình thường** trong Công cụ kiểm thử để xóa phòng mẫu trước khi kiểm hai CTA: ở trạng thái active cả hai nút khóa là hành vi có chủ đích. Chạm trái/giữa/phải trong nền **＋ Tạo kèo ăn** → Create → Back; làm tương tự **Tôi có mã phòng** → Join. Kiểm ngoài nền nút/scroll không mở form. Xác nhận tổng thể của người dùng đã bổ sung tại [biên bản](MANUAL_DEVICE_CHECK.md); không tự ghi kết quả chi tiết chưa được báo.

## Lịch sử bổ sung vùng nhận chạm bằng box-only — đã thay thế

Người dùng báo từ Expo Go rằng nút tạo phòng/nhập mã chỉ bấm được trên chữ. Bản sửa trên HEAD `6735694` + working tree đặt `pointerEvents="box-only"` tại AppButton trong `mobile/src/shared/ui/components.tsx`, để khung nút là đích chạm duy nhất trên cả nhãn và khoảng trống. Đây là sửa dùng chung được yêu cầu trong GM-09, producer GM-05, reviewer Trí; giữ props GM-05.1 và contract GM-09.1. Consumers dùng AppButton hiện có nhận cùng hành vi; không cần thay layout/screens hoặc thêm dependency. Hash và kết quả kiểm tại [CHECKS bổ sung](CHECKS.md).

Sau khi Metro nhận bản sửa, nhấn `r` ở terminal để reload Expo Go. Tại Home, chọn fixture Bình thường và không có phòng active: chạm trong nền bên trái chữ, giữa chữ, bên phải chữ của **＋ Tạo kèo ăn**; mỗi lần phải mở Create, quay lại rồi thử **Tôi có mã phòng** phải mở Join. Kiểm thêm ngoài nút/scroll không kích hoạt và các trạng thái disabled/loading vẫn khóa thao tác. Chưa có kết quả trên thiết bị cho bản sửa này; không suy Pass từ 460 tests hoặc Android export. Mọi ảnh/video cũ chỉ áp revision đã kiểm trước đó.

## Revision hoàn thiện hiện hành — 2026-10-15

Tested revision HEAD `6735694` + working tree, contract `food-v1/roadmap-v2/GM-09.1`, [manifest](COMPLETION_PATCH_MANIFEST.json). [Audit/patch plan/kết quả](COMPLETION_REVIEW_2026-10-15.md), [CHECKS hiện hành](CHECKS.md). Merge main của lượt trước đã được người dùng hoàn tất tại `6735694`; không còn phiên merge đang dở. Lượt hoàn thiện này chưa commit/push, không tự Approved/Done. Owner Tuấn, reviewer Trí.

### Mở từ checkout có dependencies theo lockfile

```powershell
cd mobile
npm ci --no-audit --no-fund
npm start
```

Expo Go Android: `/` → **＋ Tạo kèo ăn** hoặc **Tôi có mã phòng** → `/room-preview` → **‹ Quay lại** → **Quay lại phòng mô phỏng**. `/shell` giữ điều hướng GM-12/GM-16 đã nhận từ main; `/foundation` → component mẫu GM-05. Không cần backend, auth thật, quyền GPS/camera hoặc dữ liệu verified để kiểm scope mock.

- Home dùng cùng AppHeader/CTA/AvatarRow/tokens GM-05 như UI GM-12 đã Done. Active room nằm trước hero; friends tải sau session, lỗi friends chỉ có retry riêng và không chặn tạo/vào. Mất session vẫn khóa entry; phản hồi phiên trước không được hiển thị ở phiên mới.
- Create: nhập tên, chọn anchor, chỉnh buổi/giờ/radius/budget, xem **BỐI CẢNH PHÒNG** rồi **Tôi xác nhận điểm ăn, buổi và giờ** → **Tạo phòng mô phỏng**. Tóm tắt từ các giá trị đang chọn; không giả giờ/bữa khi chưa có discovery. Retry unknown giữ nguyên intent; sau ACK khóa gửi dù callback chưa chuyển màn.
- Join: tên + mã, **Vào phòng →** → xác nhận. Mã route `?code=gcd234` chỉ điền trước; khi code prop/route đổi trong màn đang mở, hủy xác nhận cũ nhưng giữ tên. Không thay intent pending/unknown/ACK bằng code mới, không auto-join. QR chỉ action interface, deny/unavailable/error quay lại manual.
- **Công cụ kiểm thử** có Bình thường / Tải chậm / Trống / Mất mạng / Đầy phòng / Đã khóa / Hết hạn / Mất phiên / Ngoài vùng / Giới hạn / Dữ liệu cũ. Muốn xem lỗi create/join, mở form trước rồi đổi fixture. Đổi fixture xóa receipt mẫu và remount form; cần mở lại disclosure để đổi tiếp. Trên Create có giả lập GPS-denied và cập nhật discovery/clock mẫu.
- Receipt dùng snapshot để hiển thị context và khóa callback bước sau khi snapshot đang tải/lỗi; retry snapshot không tạo/vào lại. **Chọn khẩu vị** / **Xem bước phòng chờ** là seam chưa nối GM-10/11, thông báo bằng copy cho người dùng; không ready/start thật.

### Interface task sau nhận

| Consumer | Interface có sẵn | Việc consumer còn chịu trách nhiệm |
| --- | --- | --- |
| GM-25 | Export `HomeScreenProps`, `CreateRoomScreenProps`, `JoinRoomScreenProps`, `RoomEntryReceiptScreenProps`; `RoomEntryRepository`, `RoomEntryReceipt` | Compose API/auth thật, session lifecycle, refetch/version/consent/history, không fallback mock; thay copy/nhãn mock theo mode tích hợp, giữ layout |
| GM-25 / GM-28 | Home `onFriends`, `onInbox`, `onProfile` tùy chọn; `onOpenFoundation` không bắt buộc | Nối navigation thật; thiếu callback ở bản mock chỉ hiện sheet, không gửi invite hoặc sửa profile |
| GM-25 / GM-31 | Create/Join `createRequestId?: RequestIdFactory`, hook giữ ID/payload cùng intent retry, khóa sau ACK | Inject ID generator và durable intent/outbox/session isolation theo task riêng; default `newPreviewRequestId` chỉ dành mock, không dùng làm entropy/security production |
| GM-30 | Join `initialCode`, `onScan: CameraAction`, `onEntered(receipt)` | Parse/allowlist URL, native auth/cold-warm/duplicate handling, permission/camera thật; code prop chỉ là mã đã parse, không phải raw URL |
| GM-10 / GM-11 / GM-25 | Receipt `onPreferences(receipt)` / `onLobby(receipt)` với `{roomId,code,version,role}` từ response | Nối screen artifacts đã bàn giao, refetch snapshot trước writes dùng version mới; không coi receipt là state server còn hiệu lực mãi |
| GM-39 | Ba screens + RoomEntryFrame, tokens và các state mẫu | Đọc code/version/HANDOFF để cải thiện HTML theo scope; task GM-09 không áp prototype chưa duyệt vào app |

GM-25 phải chọn real/mock ở composition root, không nhập `bootstrap/roomPreview` vào production. Screens không import mock factory/data; mock factory chỉ ở bootstrap. Chưa có camera/GPS/native link, cache/outbox bền, nhiều máy hoặc API room thật trong revision này.

### Kết quả và việc còn nghiệm thu

14 suites / 460 mobile tests; typecheck/lint/architecture Pass (4 warnings cũ). Expo dependency check và Android Hermes export Pass. Python550 tests OK, 6 skipped. Native UI/font200/TalkBack/keyboard/device screenshots **Not run** vì chưa có device/ADB hoặc xác nhận mới của người dùng. Không ghi Done khi AC Expo Go còn thiếu; reviewer Trí đối chiếu revision và kiểm trên thiết bị. `GM-09-report.md` được giữ nguyên untracked; không stage tự động các thay đổi lượt này.

## Lịch sử trước lượt hoàn thiện

## Bổ sung nhận main — 2026-10-15

Đã hòa giải merge HEAD `606f040` với main `ce7b87a`: giữ Home `/` và toàn bộ luồng GM-09; shell `/shell` nhận điều hướng bình chọn GM-12 và công cụ GM-16, giữ guard development/env của GM-16. Bổ sung thông báo cho hai ErrorCode upstream `NOT_RECIPIENT` / `INVITE_CANCELLED`; không sửa contract. Test route giữ cả hai nhánh. Xem [kết quả tích hợp](MERGE_MAIN_2026-10-15.md). Merge commit chưa tạo; `GM-09-report.md` vẫn untracked, ngoài staging. Hồ sơ ngày 2026-10-13 bên dưới là lịch sử của revision trước, không là hashes/evidence của bản tích hợp mới.

## Bàn giao trước khi nhận main

Owner Tuấn (`mtuan2491`), reviewer Trí. [Issue #70](https://github.com/ThanhTris/IE307/issues/70), branch `codex/gm-09-home-create-and-join-room`. Contract `food-v1/roadmap-v2/GM-09.1`. Tested revision: HEAD `9e9f5ba67899ea162b79b5c6ac17cd5479c505da` **+ working tree chưa commit**, ngày 2026-10-13 UTC+7; hashes tại [PATCH_MANIFEST.json](PATCH_MANIFEST.json).

Nhận GM-05.1 từ PR #109 (merge `9e9f5ba`), GM-07.1 từ PR #104 (`0711782`)/#105 (`9f71bba`). Hai dependency Done trên Project và code nằm trên base. Start gate `READY_TO_CLAIM` do local proposed; issue có `assignment:accepted`. Kiểm lại live ngày 2026-10-13 trước patch UI. Không thay task metadata/Project. [Plan](PLAN.md), [kết quả](CHECKS.md), [đối chiếu mẫu và thay đổi UI](UI_REWORK.md).

## Mở và kiểm

```powershell
cd mobile
npm ci --no-audit --no-fund
npm start
```

Expo Go Android cùng LAN, SDK 57. Home `/` → **＋ Tạo kèo ăn** (`/create-room`) hoặc **Tôi có mã phòng** (`/join-room`); success đến `/room-preview`. `/shell`, `/foundation`, `/components` giữ công cụ nền. Không cần env/auth/backend hay quyền camera/vị trí.

- Create: nhập tên, chọn điểm công cộng/radius/buổi, xem giờ UTC+7 hoặc nhập `YYYY-MM-DD HH:mm`, budget để trống hoặc VNĐ/người; xác nhận context rồi tạo. Ăn ngay lấy giờ server mẫu +15 phút **một lần**, retry giữ nguyên payload/requestId. Đổi context bỏ xác nhận; quá giờ phải cập nhật/đổi giờ.
- Join: tên + mã 6 chữ/số theo GM-07, chuẩn hóa trim/uppercase; **Vào phòng →** chỉ mở xác nhận. Nút điền mẫu dùng code exported `GCD234`; response code/roomId/version lấy từ adapter. Deep link `/join-room?code=gcd234` không tự join.
- Mở **Công cụ kiểm thử** ở cuối màn để đổi fixture: Bình thường / Tải chậm / Trống / Mất mạng / Đầy phòng / Đã khóa / Hết hạn / Mất phiên / Ngoài vùng / Giới hạn / Dữ liệu cũ. Lỗi lifecycle xuất hiện khi submit; Trống ở Home/discovery. Đổi fixture xóa phiên mẫu và remount màn, nên mở lại disclosure để đổi tiếp. Trên Home, link cấu trúc nằm trong disclosure; trên Create, thử GPS-denied/cập nhật giờ mẫu cũng ở đó.
- QR chỉ gọi action interface và mô phỏng denied; luôn quay lại manual. Receipt chỉ xác nhận mẫu + context; callbacks sang khẩu vị/lobby chưa nối màn task khác. Home và direct create/join giữ receipt đang có.

## Seams cho task nhận

| Artifact | Cách dùng / task nhận |
| --- | --- |
| `mobile/src/features/home/screens/Gm25HomeScreen.tsx` | Inject `repository`, `sessionToken`, `activeRoom`, callbacks create/join/resume/foundation; GM-25. Avatar preview tối đa 5, không suy online từ Friend.status=active. |
| `mobile/src/features/rooms/screens/Gm25CreateRoomScreen.tsx` | Inject repository + `onEntered(RoomEntryReceipt)`; `CreateRoomRequest` đúng GM-07, không thêm room title/lat/lng; GM-10/25. |
| `mobile/src/features/rooms/screens/Gm25JoinRoomScreen.tsx` | `initialCode`, `sampleCode` chỉ mock, `onScan: CameraAction`, `onEntered`; GM-25/30 thay camera/link tại composition, giữ explicit confirmation. |
| `mobile/src/features/rooms/screens/RoomEntryReceiptScreen.tsx` | `onPreferences(receipt)` / `onLobby(receipt)` nhận `{roomId, code, version, role}`; GM-10/11/25. Chưa setReady/start. |
| `services/roomEntry.ts`, `hooks/useRoomEntry.ts` trong feature rooms | Narrow `Pick<ApiClient,…>`, validation/timezone/error copy; read hủy response cũ, write chống bấm trùng/late response. |
| `mobile/src/bootstrap/roomPreview.tsx` | Factory mode `'mock'` tường minh + store RAM + controls. GM-25 thay wiring/session/requestId và nhãn mock theo task integration; không dùng store mẫu làm cache/persistence production. |

## Kết quả và giới hạn

- UI mới: Home có hero món ăn/CTA/avatar; Create nhóm buổi/giờ, điểm ăn và ngân sách; Join có xem mã 6 chữ/số và khung QR minh họa. Dùng palette/spacing/type GM-05 khớp UI_DESIGN_SPECIFICATION, không thay tokens hoặc contract. Fixture/tools thu gọn; mock luôn có nhãn.
- Mobile revision UI hiện hành: typecheck/lint/Jest/architecture Pass; 10 suites / 343 tests, 4 warnings cũ GM-07. Android Hermes export Pass. [Output](UI_REWORK_MOBILE_CHECK.txt), [bundle](UI_REWORK_ANDROID_BUNDLE.txt). Metro/manifest ở lượt trước là evidence lịch sử, chưa kiểm lại trong lượt UI này.
- Expo Go Android, ảnh/video, dark/font200/TalkBack/keyboard/hardware Back trên thiết bị: **Not run**, chưa có thiết bị/adb hoặc xác nhận mới từ người dùng. Owner Tuấn và reviewer Trí kiểm trước nghiệm thu.
- Python 3.12.14 hiện hành: 544 tests, **Fail (1 failure, 5 errors)**; encoding probe và taxonomy locking Windows đã ghi ở GM-07. Không sửa data/runner trong GM-09; cần maintainer/Trí xử lý hoặc kiểm Linux/WSL. [Output](UI_REWORK_PYTHON_REGRESSION.txt).
- Không đổi package/lockfile/shared UI/DTO/schema/luật phiếu; không thêm provider, GPS/camera/native module. Không có RPC thật, lobby/preferences/social thật, SecureStore/outbox hay dataset verified; các phần này thuộc task nhận sau.
- `.agents/` tự tạo đã xóa hoàn toàn khỏi workspace theo yêu cầu ngày 2026-10-13; không tạo rules/skills thay thế. Chỉ dùng AGENTS/task/spec/workflow và artifact hiện hành trong project. `prompt.txt` không bị sửa. Không commit/push/Approved/Done; việc bàn giao này không thay review Trí.
# GM-09 Home Figma implementation supplement — 2026-10-27

The current working tree updates the Home screen against [approved frame 330:3067](figma/330-3067-home.png), including the official G mark, headline, friends-dining banner, create/join tiles, quick-friends section and bottom navigation. It reuses GM-05 shared components (`AppHeader`, `AppButton`, `AvatarRow`, `BrandBanner`, `AppBottomNavigation`) and keeps existing session/repository/navigation callbacks. Figma asset provenance and hashes are in [`mobile/assets/brand/SOURCE.md`](../../../../mobile/assets/brand/SOURCE.md).

Automated evidence: targeted Jest 3 suites / 46 tests, typecheck and architecture guard pass; lint has four existing API-file warnings; Android JS export passes with 1,407 modules/40 assets. **The updated Home has not been visually rechecked on Android emulator**, so treat Figma parity as implementation-aligned but visually unverified. This supplement does not mark GM-09 Done or replace the reviewer/device acceptance.

# GM-09 handoff — Home, create and join
