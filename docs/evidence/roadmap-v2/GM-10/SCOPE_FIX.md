# GM-10 — sửa các lỗi thuộc phạm vi sau audit

Ngày 2026-10-15, branch `codex/gm-10-context-and-preferences`, base `30ecb5675104f13c64580018cad118647fb3d601` + working tree chưa commit, contract GM-10.1. Người dùng yêu cầu phân loại và sửa phần GM-10; gate live `2026-10-15T15:15:15.102435+00:00` READY_TO_CLAIM. Đây là sửa source sau [audit trước sửa](REQUIREMENTS_AUDIT.md); không thay approval của Trí.

## Phân loại trách nhiệm và thay đổi

| Audit | Trách nhiệm | Xử lý trong lượt này |
| --- | --- | --- |
| A1 chỉnh lại bối cảnh sau lưu | GM-10: hành vi form và reload snapshot | Thêm Chỉnh lại bối cảnh sau ACK + snapshot. Reload cùng roomId, lấy version/context mới và remount form tạo draft/intent mới. Phải xác nhận + preview lại; giữ khóa intent cũ chống double-write. Kiểm có preferences write xen giữa hai lần context save, expectedVersion mới và ready reset. |
| A2 stale làm mất nút tải lại | GM-10: state lỗi và action phục hồi | Lưu error code preview riêng với text validation. VERSION_CONFLICT/CONTEXT_CHANGED khóa form/preview/save tới Tải lại bối cảnh; bấm save không làm mất lý do/action. Reload bỏ state cũ, yêu cầu xác nhận lại. |
| A3 receipt sai sau skip→timeout→retry | GM-10: summary từ own snapshot | Biên nhận tính Gì cũng được từ ownPreferences snapshot đã đọc, không dùng biến any của draft cũ. Payload/requestId/version vẫn giữ nguyên khi retry; consent được giữ, không gửi write lần hai để sửa copy. |
| A4 thiếu khoảng cách anchor | GM-10: trình bày field có sẵn | Render distanceM thành m/km theo vi-VN và nhãn đường chim bay từ điểm ăn chung. Vắng/null/không hữu hạn/âm là Chưa có khoảng cách; 0 thật vẫn là0. Không gọi GPS/tính route hoặc tự thêm dữ liệu. Khoảng cách thật do GM-18/24/25 cung cấp/kiểm. |
| A5 Home đang chạy Back | GM-10: props và route wiring | Thêm onHome tùy chọn, tách khỏi onBack ở frame và cả hai screens/loading/receipt. Routes dùng router.dismissTo('/'); caller không truyền onHome thì brand disabled. Pending/possible delivery khóa cả Home/Back. Không gọi leave/cancel API ngoài scope mock. |
| A6 contrast primary | Nền dùng chung GM-05 + Trí chốt xử lý | Không sửa shared palette/components/tokens trong GM-10. Giữ phát hiện 3.103/2.750 <4.5 và bàn giao để xử lý chung; đây không phải tính năng đợi GM-39 HTML. Không tự miễn NFR hoặc coi đã Pass contrast. |
| A7 success-empty reasonCodes của GM-18 | GM-24/25: adapter khi nối discovery API thật | Giữ contract/mock GM-07 hiện tại; consumer phải nhận supplement GM-18 và dịch reasonCodes vào trạng thái UI đúng. Response ngoài vùng/chưa rõ lịch không được gộp thành thiếu món theo buổi. Không yêu cầu GM-18 sửa output vốn đã có reasonCodes. Hai diagnostics này còn Fail trên màn hiện tại và được ghi giới hạn tích hợp, không xem là acceptance của API. |
| A8 copy/mode và IDs production | GM-25: composition production | Màn GM-10 vẫn là mock đúng nhãn. Khi nối thật cần inject mode/copy, auth/repository/catalogue/navigation và durable IDs; production không import/fallback fixture. Điểm onHome đã thêm trong A5; không thay package/DTO/schema hoặc bật API/native ở lượt này. |

A6 là vấn đề kế thừa upstream, A7/A8 là việc consumer tích hợp cần hoàn tất; không phân loại tất cả thành GM-10 chỉ vì xuất hiện ở cùng màn. Ngược lại, A1..A5 là lỗi/trình bày của màn mock nên sửa ngay ở producer GM-10. Việc chưa có lobby navigation trong provider mẫu vẫn thuộc GM-11/GM-25, không tạo lobby giả để lấp bước chuyển màn.

## Artifacts và giới hạn

Kết quả kiểm trên source/test bytes mới:

| Kiểm | Actual / evidence | Kết quả |
| --- | --- | --- |
| npm run check | Strict typecheck/lint/architecture, 4 warnings upstream; **16 suites /537 tests**, Jest46.283s; [log](SCOPE_FIX_MOBILE_CHECK.txt) | Pass |
| Audit diagnostics giữ nguyên assertions | A1..A5 **5 Pass**; A7 OUT_OF_COVERAGE/AVAILABILITY_UNKNOWN success-empty **2 Fail**, 11.24s; [log](SCOPE_FIX_DIAGNOSTICS.txt) | Đúng phân loại: 5 lỗi GM-10 đã sửa; còn 2 case tích hợp A7, không ghi Pass cho chúng |
| Android export |1293 modules, Hermes entry-50112a65020a7d455cb5e67d0411c8a4.hbc; [log](SCOPE_FIX_ANDROID_BUNDLE.txt) | Pass export, chưa native smoke |
| Python regression |550 tests/157.587s, OK, không skipped; [log](SCOPE_FIX_PYTHON_REGRESSION.txt) | Pass |
| Repo/indexes/diff/protected scope/manifest | [Log](SCOPE_FIX_REPOSITORY_CHECK.txt), main manifest16 hashes mới khớp; shared/package/API/backend và task metadata không đổi, không staged/unmerged paths | Pass |

Lượt check đầu còn một assertion cũ yêu cầu preview enabled sau stale; đã thay bằng yêu cầu reload/khóa preview cho stale, giữ các assertions không-write/no-widen/time unchanged và thêm recovery-to-save. Sau đó chạy lại full check đạt537/537, không tăng timeout/tắt rule để bỏ lỗi.

Source: ContextScreen, PreferencesScreen, SetupFrame, roomSetup distance formatter và hai thin routes GM-10. Regression nằm trong unit/component/routes suite chính; không sửa assertions để chấp nhận các lỗi audit. Test stale cũ được đổi từ kỳ vọng preview enabled sang yêu cầu reload, vì stale giờ chủ động khóa form tới refetch.

[PATCH_MANIFEST](PATCH_MANIFEST.json) ghi bytes source/tests mới. [AUDIT_PATCH_MANIFEST](AUDIT_PATCH_MANIFEST.json) giữ hashes trước sửa; [AUDIT_REPRO](AUDIT_REPRO.txt) là kết quả lịch sử trước sửa, không phải trạng thái của source mới. Các logs SCOPE_FIX là lượt mới nhất; BUGFIX/AUDIT/MOBILE_CHECK cũ giữ để truy vết.

Không commit/push, không đổi task metadata/Project/Approved/Done; chỉ Trí review cuối và merge/Done. Expo Go sau sửa A1..A5/light-dark/font200/TalkBack/keyboard/Back/vùng bấm: **Not run** trong phiên agent. Cần người dùng kiểm lại bằng văn bản; không bắt ảnh/video. A6 chưa giải quyết, A7/A8 chưa tích hợp; không tuyên bố toàn bộ app/Android–API đã đạt.
