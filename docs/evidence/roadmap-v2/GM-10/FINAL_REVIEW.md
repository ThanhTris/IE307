# GM-10 — kiểm toàn bộ phạm vi, chuẩn đầu ra và checklist

**Record lịch sử trước date UI:** người dùng tiếp tục gửi bugs.md mới; [DATE_UI_REVIEW](DATE_UI_REVIEW.md) ghi sửa tách ngày/giờ, ngân sách riêng và checkbox xanh. Bản kiểm551 tests/18 hashes mới theo CHECKS; báo cáo537 tests/16 hashes bên dưới thuộc [PRE_DATE_UI_PATCH_MANIFEST](PRE_DATE_UI_PATCH_MANIFEST.json), không chứng minh UI mới đã được thử trên thiết bị.

Ngày 2026-10-15. Owner Tuấn, reviewer Trí. Branch `codex/gm-10-context-and-preferences`; HEAD `30ecb5675104f13c64580018cad118647fb3d601` + working tree chưa commit, contract `food-v1/roadmap-v2/GM-10.1`; [manifest source/test](PATCH_MANIFEST.json). Windows, Node24.20.0/npm11.19.0/Python3.12.14, Expo57.0.29/RN0.86.3. Dữ liệu mock GM-07; không schema/dataset production trong phạm vi màn mock.

Theo yêu cầu hiện tại của người dùng, **loại A6/A7/A8 khỏi lần đánh giá GM-10 này** vì đã phân cho nền chung/tích hợp ở GM khác. Giữ [audit](REQUIREMENTS_AUDIT.md)/[phân loại](SCOPE_FIX.md) và log cũ để truy vết; không chạy lại diagnostics dành cho ba mục đó, không sửa package/DTO/backend hoặc ghi chúng thành Pass. Không dùng các mục đã loại để yêu cầu GM-10 triển khai phần việc tương lai.

**Kết luận trong phạm vi:** các yêu cầu chức năng mock và A1..A5 đã đạt các kiểm tự động hiện có; đủ file/route/fixture/contract/CHECKS/HANDOFF để người dùng và Trí tái lập. Lượt này chưa phát hiện thêm lỗi chức năng GM-10. **Chưa xác nhận hoàn thành toàn bộ chuẩn Expo Go/QA UI**, do kiểm thiết bị sau sửa còn Not run; check tương thích Expo online mới nhất exit1 như bảng dưới. Không tự ghi Approved/Done hoặc nghiệm thu thay Trí.

## Đầu vào, nguồn yêu cầu và revision

- [Task GM-10](../../../../tasks/backlog/GM-10.md), [issue #71](https://github.com/ThanhTris/IE307/issues/71): đọc lại live, updatedAt 2026-10-12T08:49:55Z; comment0, assignment:accepted, assignee mtuan2491. Không có yêu cầu chức năng mới so với lượt trước. Lịch/reviewer lịch sử trong issue áp dụng theo AGENTS/ADR-011/013 hiện hành.
- [TASK_OUTPUT_REQUIREMENTS](../../../project/TASK_OUTPUT_REQUIREMENTS.md), [TASK_OUTPUT_CHECKLIST dòng GM-10](../../../project/TASK_OUTPUT_CHECKLIST.md), task-id-map verification `expo-go`, TEAM_WORKFLOW/DoD; UI_SPEC/UI_DESIGN_SPECIFICATION, CATALOG_PREFERENCES_SPEC, CONTEXT_HISTORY_SPEC, ROOM_SPEC, FOOD_DATA_SPEC và NFR liên quan. Không suy từ HTML hoặc metadata file sang nghiệm thu app.
- Gate Project live `2026-10-15T15:37:09.079507+00:00`: [READY_TO_CLAIM](FINAL_GATE.txt), chỉ xác nhận gate input GM-05/07. Kiểm ancestry trên HEAD: GM-05 merge9e9f5ba, GM-07 merge0711782 và9f71bba đều exit0. Artifact tokens/contracts và HANDOFF upstream có trên nhánh; không dùng cache/Issue Closed thay Done.
- 16/16 source/test hashes khớp manifest. Lượt kiểm này không sửa source/tests hoặc task frontmatter. Không fetch/merge/commit/push, không đổi GitHub/Project/approval. Merge gate cũ trong CHECKS là lịch sử; trước merge cần cập nhật ref và chạy lại theo workflow riêng.

## Đối chiếu từng acceptance criterion

| AC GM-10 | Đối chiếu code / assertions thực thi | Kết quả trong phạm vi |
| --- | --- | --- |
| Nguồn gốc khác nơi bán, nhiệt độ khác cay, sở thích mềm không NO | Preview hiển thị origin/venue riêng; UserPreferences có cuisine/category/temp/flavor độc lập, không votes/origin tự tạo. Tests hot + spicy.none, nhiều category/toggle/hero/skip và payload exact | Pass tự động |
| Host xác nhận public anchor và buổi/giờ; manual/denied/outside/empty/stale rõ | Không preview/save khi thiếu anchor/xác nhận; sửa làm mất xác nhận/preview; deny vẫn chọn tay; vùng không anchor/outside/unknown/empty/stale có thông báo; member read-only; stale giữ reload và khóa save tới refetch | Pass tự động; thao tác/vùng bấm native cần kiểm lại |
| Giá unknown Chưa có giá; empty sửa context/reset ready, không auto widen | Null không thành0 và không mất món; giữ unit giá nhóm; empty không đổi giờ/radius; context save reset tất cả ready, own preferences chỉ reset caller; Chỉnh lại bối cảnh lấy version mới cùng room và tạo intent mới | Pass tự động |
| Controls avoidRecent/history consent qua interface, chưa GPS/history thật | Host sửa avoidRecent, preferences xem giá trị chung; consent mặc định false, hero/skip giữ consent; chỉ gọi updateContext/updatePreferences, không history API/GPS/provider thật | Pass tự động + kiểm source |
| HANDOFF ghi input/output/cách kiểm và revision thật | Hai screen đúng path; có repo/types/callbacks, route/provider mẫu, 13 scenario rõ nhãn và giới hạn; SHA25616 files, lệnh chạy, logs và consumers trong HANDOFF/CHECKS | Đủ artifact/tài liệu; chưa có commit/review hoặc nghiệm thu thiết bị |

Kiểm bổ sung theo yêu cầu người dùng và audit: giờ chip sáng07:00/trưa12:00/tối19:00 lần tới UTC+7, Ăn nhẹ giữ giờ; custom không buffer, ăn ngay +15 phút một lần; boundary/ngày sai/quá giờ/leap/qua tháng/năm; budget nullable/invalid; distance m/km/unknown từ anchor. A1..A5 đã được đưa vào suite chính: context edit lần hai sau preferences write, stale→save→reload, skip→timeout→retry receipt/consent/payload, distance và Home khác Back ở form/receipt.

## Chuẩn đầu ra và checklist GM-10

| Mục bắt buộc | Đầu ra/điểm mở hoặc bằng chứng | Tình trạng |
| --- | --- | --- |
| ContextScreen.tsx và PreferencesScreen.tsx hoạt động theo stage screens | Home → Công cụ kiểm thử → Chọn điểm ăn và khẩu vị; `/gm10/context` → xác nhận/preview/lưu → `/gm10/preferences`; `/shell` cũng mở được, direct routes có provider mẫu | Module/routes và integration tests Pass; mở trên thiết bị sau sửa chưa xác nhận |
| Public anchor/radius/desiredAt/buổi/budget/cuisine/đặc tính/consent/avoidRecent | Các fields/controls hiện trên hai màn; vùng → điểm → bán kính phân cấp; cả nhãn switch và trạng thái chọn rõ; onHome/onBack tách, pending/unknown khóa điều hướng | Pass source/interaction; layout thật Not run |
| Ca tối thiểu manual/denied/outside/empty/stale/null price/buổi-giờ/reset-ready | Suite component/unit/routes kiểm độc lập các trường hợp; fixture controls để Trí/người dùng thử lại trên Expo | Pass tự động |
| Loading/error/validation/locked/expired/member/possible delivery | Initial read có loading/retry; thời gian/phòng không hợp lệ chặn write; callback/ACK/refetch tách; double press không ghi trùng, payload/id/version retry giữ nguyên; snapshot lỗi chỉ thử read | Pass source/ca tự động hiện có, không suy đã đo network/device |
| HANDOFF + CHECKS + tested revision/environment/log | Thư mục evidence roadmap-v2/GM-10, manifest và logs FINAL ở dưới; phần Not run ghi rõ thay vì điền Pass | Có, đúng stage; model/Android/Expo Go chưa được cung cấp |
| Reviewer tái lập trên revision được bàn giao | Code còn working tree chưa commit, manifest ghi bytes thật, có lệnh chạy và entry rõ | Đọc/kiểm local được; commit/PR/review Trí chưa thực hiện, không giả approval |

## Yêu cầu chung project/UI trong phạm vi màn mock

| Nhóm yêu cầu | Đối chiếu | Kết luận / giới hạn |
| --- | --- | --- |
| Expo + TS strict, routes mỏng, feature/domain/data tách | npm run check gồm tsc/lint/architecture. Screens không import bootstrap/fixtures, chỉ nhận repository/catalogue/actions/callbacks; mock construction ở bootstrap | Pass tự động/source |
| Nhận input/version upstream, không dựng lại nền | Dùng GM-05 tokens/shared UI và GM-07 Pick<ApiClient>/DTO; đúng output paths/GM-10.1; package/lock/shared/data/domain/backend không đổi | Pass kiểm ancestry/diff/manifest |
| Server authoritative, requestId/expectedVersion, readiness chủ động | Intent khóa pending/unknown/ACK; refetch sau save; sửa mới dùng version mới; không tự ready/start/lobby thật. Ready seeding chỉ ở fixture Nhóm đã sẵn sàng | Pass scope mock; không là SQL/RLS/API nhiều máy |
| Privacy/secret/no raw GPS/phiếu | Form dùng public anchorId; không log console/fetch/env/service_role/raw coordinates trong GM-10; ownPreferences riêng caller, không đọc phiếu người khác; không gọi AI/provider thật | Pass kiểm source/DTO; quyền BE giữ scope task BE |
| Safe area, keyboard, một cột/chiều rộng giới hạn, danh sách phù hợp | SafeAreaView, KeyboardAvoidingView và ScrollView; maxWidth600; row wrap; preview bounded8 món, fixture catalogue1 cuisine/3 categories. Dùng component nền touch min48 và labels/selected/disabled/busy | Có trong source; không chứng minh không tràn ở 320–599/font200 hoặc native hit testing |
| Light/Dark, font scaling, TalkBack, reduced motion | useShellTheme lấy token hệ thống, text giữ font scaling mặc định, chip có dấu chọn/label và accessibilityState; không thêm animation tùy biến cần tắt | Native sau sửa **Not run**; không ghi contrast đã Pass ở lần kiểm đã loại A6 |
| Output stage expo-go | Android export/Hermes đạt; real routes có interaction tests; có entry/cases bằng văn bản | Chưa thay được việc mở Expo Go thật. API/native/restart nhiều máy thuộc task sau, không bắt GM-10 làm thay |

## Các lệnh đã chạy lại và actual

| Kiểm | Kết quả mới nhất | Log |
| --- | --- | --- |
| `cd mobile; npm.cmd run check` | Exit0; TS strict/lint/architecture Pass, **16 suites/537 tests**,43.418s, 4 lint warnings upstream | [FINAL_MOBILE_CHECK](FINAL_MOBILE_CHECK.txt) |
| Python unittest discovery | Exit0; **550 tests/116.894s, OK, không skipped**; Cell ERROR là fixture kiểm failure path | [FINAL_PYTHON_REGRESSION](FINAL_PYTHON_REGRESSION.txt) |
| `npm.cmd run bundle:android` | Exit0;1293 modules; Hermes entry-50112a65020a7d455cb5e67d0411c8a4.hbc,3MB; không phải APK/native smoke | [FINAL_ANDROID_BUNDLE](FINAL_ANDROID_BUNDLE.txt) |
| `npm.cmd run check:expo` online | **Exit1**: CLI đề xuất expo ~57.0.30 thay57.0.29 và expo-router ~57.0.28 thay57.0.27. Package/lockfile giữ đúng base, không tự nâng nền trong GM-10. Installed SDK metadata vẫn ghi router ~57.0.27; đây là kết quả khuyến nghị mới từ CLI, không chuyển log thành Pass | [FINAL_EXPO_COMPATIBILITY](FINAL_EXPO_COMPATIBILITY.txt) |
| Project readiness | READY_TO_CLAIM, live Project, owner/reviewer đúng; không phải approval code | [FINAL_GATE](FINAL_GATE.txt) |
| Repo/indexes/diff/manifest/protected scope | Kết quả và exit codes tại log kiểm cuối; giữ metadata, không staged/unmerged paths | [FINAL_REPOSITORY_CHECK](FINAL_REPOSITORY_CHECK.txt) |

Không chạy lại các diagnostics API/contrast đã được loại khỏi scope theo yêu cầu người dùng; logs cũ không bị xóa và không ghi thành Pass. Các file FINAL là lượt kiểm hiện tại, các file SCOPE_FIX/BUGFIX/AUDIT/MOBILE_CHECK trước đó giữ lịch sử.

## Phần còn thiếu trước xác nhận nghiệm thu UI

1. **Expo Go sau sửa:** chưa có xác nhận mới của người dùng cho GM-10 hiện tại. Agent không có adb trong PATH hoặc phiên Android trực tiếp để tự thử. Cần thao tác thực tế hai màn/cases tối thiểu, Home/Back, edit context lần hai, save/skip/retry, Light/Dark/font200/TalkBack/keyboard/vùng bấm; ghi từng mục Pass/Fail/Not run. Xác nhận GM-09 hoặc bugs.md trước sửa không thay phép kiểm này.
2. **Check tương thích nền mới nhất:** lưu exit1 để Trí/người phụ trách nền đối chiếu patch khuyến nghị; không sửa package/lockfile không thuộc GM-10 hoặc dùng check offline thay kết quả online. Không kết luận app chắc chắn lỗi từ khuyến nghị này, cũng không kết luận check đạt.
3. **Bàn giao Git/review:** khi người dùng yêu cầu mới commit/push; Trí review/merge/Done. Không có review approval tự tạo trong tài liệu này.

Theo chỉ dẫn người dùng, xác nhận thiết bị bằng văn bản là đủ, **không yêu cầu ảnh/video**. Tóm tắt cần ghi: revision/manifest, model/Android/Expo Go nếu biết, từng thao tác→expected→actual. Các mục chưa thử giữ Not run. Đây là kết quả kiểm phạm vi, không phải quyết định nghiệm thu của Trí.
