# GM-09 — đối chiếu yêu cầu và hoàn thiện, 2026-10-15

Hồ sơ lịch sử của lượt hoàn thiện trước khi sửa vùng chạm AppButton. Kết quả source/test cuối và xác nhận kiểm Expo Go của người dùng xem [CHECKS hiện hành](CHECKS.md), [biên bản văn bản](MANUAL_DEVICE_CHECK.md) và [manifest bàn giao](REVIEW_PACKAGE_MANIFEST.json). Chỉ dẫn hiện tại dùng xác nhận văn bản, không yêu cầu ảnh/video cho lần bàn giao GM-09 này; các yêu cầu ảnh/video và trạng thái chưa có xác nhận trong nội dung cũ dưới đây không thay thế cập nhật mới. Chưa có approval/merge/Done của Trí từ hồ sơ này.

Yêu cầu hiện tại của người dùng: kiểm GM-09, các task nhận đầu ra và UI đã Done, rồi hoàn thiện code nhất quán với các UI đó. Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`); contract `food-v1/roadmap-v2/GM-09.1`. Base HEAD `6735694` sau merge main `ce7b87a`. Không tự commit/push/Approved/Done hoặc đổi Project.

## Nguồn đã đối chiếu trước code

- AGENTS.md, TEAM_WORKFLOW/DEFINITION_OF_DONE, task GM-09/#70, UI_SPEC/UI_DESIGN_SPECIFICATION/ROOM_SPEC, COMPONENT_MAP và prototype hiện hành. Issue #70 có `assignment:accepted`, không có comment bổ sung.
- Gate live `2026-10-15T09:40:29.914287+00:00`: `READY_TO_CLAIM`. Project ghi GM-09 In Progress, assignee mtuan2491; task Markdown còn backlog/proposed, không tự đồng bộ metadata để khớp board.
- Project #2 đọc live cùng lượt: UI nền GM-02/#63, GM-05/#66 và UI sau GM-12/#73 **Done**; GM-11/#72 và GM-39/#107 In Progress; GM-10/#71, GM-13/#74, GM-14/#75 Todo. Không suy Done từ ID lớn hơn hoặc Issue Closed.
- Đã đọc HANDOFF GM-05/07/12, component preview và VoteScreen/FinalRoundScreen; giữ AppHeader/AppButton/FormField/Chip/StatusNotice/ContextSummary/SheetDialog, tokens light/dark GM-05. GM-12 là tham khảo về component, khóa pending/ACK và state có nhãn; không đưa luồng voting vào Home.
- Prototype/brief GM-39 chưa được Project ghi Done; không áp revision HTML mới như mẫu app đã duyệt. Mẫu cũ sai numeric code/online status không thay contract/spec hiện hành.

## Đầu ra cho task sau

| Task nhận | Yêu cầu đối với GM-09 | Phạm vi giữ ở GM-09 |
| --- | --- | --- |
| GM-25 | Dùng lại Home/Create/Join, inject repository/auth/navigation; không viết lại layout hoặc fallback fixture trong production | Screens nhận repository và callbacks; xuất props dễ dùng, tách lỗi phụ friends khỏi entry; request/receipt theo GM-07 |
| GM-30 | QR/manual/incoming code, không tự join/ready; denied/manual và cold/warm | Camera action interface; route nhận code mới vào form và yêu cầu xác nhận; không xin quyền, parse URL allowlist hay gọi camera thật |
| GM-39 | Đọc ba screens + tokens/HANDOFF/version làm đầu vào prototype | Giữ component/tokens đã Done; ghi layout/state/callback và giới hạn để đối chiếu |
| GM-10/11 | Handoff từ xác nhận tạo/vào sang preferences/lobby | Receipt `{roomId,code,version,role}` và callbacks; không tự dựng screens chưa bàn giao, ready/start hay leave/cancel RPC |

## Patch/test plan

- Home: giữ hero/CTA/avatar mẫu, active room dễ thấy, token/spacing thống nhất GM-05. Tải friends sau session nhưng lỗi friends không chặn tạo/vào phòng; action friends/inbox/profile có callback tùy chọn cho task nhận. Loading/error/empty rõ, không suy presence từ quan hệ bạn bè.
- Create: dùng ContextSummary GM-05 để kiểm lại anchor/bữa/giờ/bán kính trước xác nhận; không bịa giờ/buổi khi chưa có discovery. Giữ nullable budget, server time + buffer một lần, retry cùng payload/requestId.
- Create/Join: khóa sau ACK, không gửi lần hai khi callback chưa chuyển màn; pending khóa controls/back; uncertain giữ payload và requestId. Kiểm requestId có thể inject khi task tích hợp thay composition, không import fixture vào screens.
- Join route: code mới khi route đang mở thay form một cách tường minh, không giữ xác nhận cho code cũ và không auto-join; camera chỉ interface/placeholder, manual luôn có.
- Receipt: copy cho người dùng, không đưa tên field/task kỹ thuật vào luồng; không bật bước kế tiếp khi snapshot chưa tải hoặc lỗi. Giữ callback đúng dữ liệu nhận từ adapter.
- File ownership: screens/home, feature rooms, bootstrap/routes GM-09, tests liên quan và evidence GM-09. Không sửa shared UI/tokens, contracts/client/mock, package/lockfile, backend hoặc các screens GM-12.
- Kiểm hành vi mới bằng component/route tests (friends failure/retry, pending→ACK chống gửi trùng, context summary, incoming code mới không auto-join, callback seams). Chạy mobile check, Expo dependency check/Android export, repo validator, Python regression, check-docs và diff. Kiểm output upstream bất biến và ghi hashes patch mới riêng, không ghi đè manifest/evidence lịch sử.
- Expo Go Android/light-dark/font200/TalkBack/keyboard/hardware Back cần kiểm trực tiếp; máy chưa có ADB. Đã hỏi khả năng kiểm trên thiết bị; không dùng Jest/bundle làm bằng chứng native, không tự chốt Done nếu AC này còn Not run.

## Kết quả thực thi

- Hoàn thiện 9 file code/test đúng scope, hashes tại [manifest hiện hành](COMPLETION_PATCH_MANIFEST.json). Không thay các file upstream được bảo vệ hoặc `GM-09-report.md`.
- Home đã tách session/friends, có retry riêng và bỏ response phiên cũ; không suy online. Navigation có callbacks cho consumer, không bắt truyền action tooling.
- Create đã có ContextSummary dùng lại GM-05 trước xác nhận; lỗi giờ vẫn yêu cầu sửa giờ, không bịa clock/bữa khi discovery pending. Style dùng spacing16/gap20/maxWidth600 cùng bộ mẫu; không thêm màu/token mới.
- Create/Join đã khóa pending/ACK và inject RequestIdFactory; unknown retry giữ nguyên payload/ID. Join cập nhật incoming code idle, xóa xác nhận cũ nhưng giữ tên; không thay intent đang pending/unknown/ACK hoặc tự join.
- Receipt đổi copy kỹ thuật sang ngôn ngữ người dùng và khóa bước tiếp khi snapshot chưa hợp lệ. Navigation sang GM-10/11 vẫn qua callbacks, không dựng lại task khác.
- Mobile check Pass: 14 suites / **460 tests**, Jest22.015s; typecheck/eslint/architecture đạt, 4 lint warnings có sẵn. [Output](COMPLETION_MOBILE_CHECK.txt).
- Expo dependency check Pass; Android1284 modules/Hermes export Pass, [output](COMPLETION_ANDROID_BUNDLE.txt). Đây là bundle, không là APK hoặc mở Expo Go.
- Python regression Pass: **550 tests**, 53.212s, 6 skipped. [Output](COMPLETION_PYTHON_REGRESSION.txt). Python Windows với tzdata riêng trong `.work` được ignore; không đổi dependency dự án.
- Native Expo Go Android/visual screenshots/dark/font200/TalkBack/keyboard/hardware Back chưa kiểm trực tiếp. Thiếu device/ADB và chưa nhận xác nhận mới từ người dùng; ghi **Not run**, không tự Done/Approved.
- Các lỗi lint trung gian khi điều chỉnh memoization và type của fixture test đã được sửa rồi chạy lại check thành công; không tắt rule, tăng timeout hoặc đổi package để đạt.

Kiểm validator/index/diff/manifest/gate cuối ghi tại [COMPLETION_REPOSITORY_CHECK.txt](COMPLETION_REPOSITORY_CHECK.txt). Hướng mở và seam downstream hiện hành tại [HANDOFF](HANDOFF.md).

Kết quả cuối: validator/check-docs/diff/protected paths exit0, 9 hashes khớp manifest, không còn unmerged path hoặc staged thay đổi. Gate merge đọc Project live lúc `2026-10-15T09:55:54.210926+00:00` trả `READY_FOR_MERGE_REVIEW` với origin/main `ce7b87a` vừa fetch. Đây là gate dependency/artifact, không thay review/Expo Go acceptance. `GM-09-report.md` còn untracked và không bị sửa.

## Kiểm trực tiếp còn cần trước nghiệm thu

Ghi model/Android/Expo Go/revision, viewport và ảnh/video thực tế khi có thiết bị; không điền Pass từ kết quả tự động:

1. Mở Home ở light/dark và font200, xem greeting/CTA/avatar/active receipt; thử session lost và friends empty, đảm bảo cuộn/nhãn TalkBack.
2. Home → Create: tên trống/sai; chọn điểm tay/bán kính/buổi/giờ/budget; context summary đúng; đổi context phải xác nhận lại. Kiểm keyboard và hardware Back, pending không cho gửi trùng.
3. Home → Join: mã chữ/số hợp lệ/không hợp lệ, xác nhận riêng; QR denied → manual, không xin camera thật. Route có code chỉ điền, không auto-join; route parameter đổi phải xác nhận lại.
4. Trên form mở Công cụ kiểm thử, kiểm Tải chậm/Trống/Mất mạng/Đầy phòng/Đã khóa/Hết hạn và retry. Đổi fixture xóa phiên mẫu, không là xử lý mất mạng production.
5. Create/Join thành công → receipt → Home → resume; không tạo phòng thứ hai, không tự ready/start. Receipt snapshot lỗi khóa bước tiếp và có retry.

Phần native chưa có kết quả mới; task giữ trạng thái do con người quản lý trên Project. Không tự ghi Done.
