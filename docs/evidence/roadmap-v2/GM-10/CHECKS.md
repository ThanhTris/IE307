# GM-10 — kiểm chứng

**Cập nhật sau khi nhận main (2026-10-16):** PR #122 `ffa6a75` đã merge `origin/main` `1862c86` bằng merge commit `58b2849`; xử lý duy nhất conflict ở `mobile/README.md`, giữ đủ route tests và baseline Expo. Bản kiểm trên merge commit đạt Expo baseline 5/5, route 17/17, mobile 19 suites/566 tests, Android export 1309 modules/3.1 MB, Python 550 pass + 6 skipped, repository/index/diff checks pass. Chi tiết và giới hạn tại [MAIN_SYNC_2026-10-16](MAIN_SYNC_2026-10-16.md). Merge gate live trả `READY_FOR_MERGE_REVIEW`; chưa Approved/Done.

Owner Tuấn, reviewer Trí; contract `food-v1/roadmap-v2/GM-10.1`, GM-05.1/GM-07.1 upstream. Tested revision: HEAD `30ecb5675104f13c64580018cad118647fb3d601` + source/test working tree chưa commit; [hashes](PATCH_MANIFEST.json). Windows, Expo SDK57/React Native0.86.3, Node24.20.0/npm11.19.0; mock fixtures, schema/dataset production N/A.

**Revision mới nhất để gửi review:** người dùng đã xác nhận kiểm tra bản sửa cuối ổn thỏa; [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md) ghi Expo Go Pass theo xác nhận chung bằng văn bản, không yêu cầu ảnh/video và không tự ghi Pass riêng từng fixture/a11y. [DATE_UI_REVIEW](DATE_UI_REVIEW.md) ghi ba sửa đổi ngày/giờ riêng, ngân sách card riêng, checkbox xanh. **17 suites/551 tests**, Python550 và Android export đạt; manifest18 source/test files. Check:expo online vẫn exit1 theo khuyến nghị patch nền, không tự đổi package. Log FINAL537/SCOPE_FIX/AUDIT là lịch sử; A6/A7/A8 ngoài lần đánh giá GM-10 theo chỉ dẫn người dùng. Chưa Approved/Done; [PR_BODY](PR_BODY.md) và [COMMIT_AND_PUSH](COMMIT_AND_PUSH.md) đã chuẩn bị.

## Gate và đầu vào

Start gate live `2026-10-15T13:38:44.813080+00:00`: READY_TO_CLAIM. GM-05/#66 và GM-07/#68 Done trên Project và có artifacts/HANDOFF; issue #71 nhận việc bởi Tuấn, không có comment bổ sung. GM-09 không là dependency; tạo nhánh độc lập từ main, không merge/copy PR121. Câu reviewer độc lập/local approval trong issue lịch sử áp dụng theo ADR-011/013 hiện hành. Không đổi GitHub, assignment, deadline hoặc approval.

Gate kiểm cuối live `2026-10-15T15:37:09.079507+00:00` [READY_TO_CLAIM](FINAL_GATE.txt); issue71 vẫn assignment:accepted/mtuan2491/comment0. Ba upstream merge commits GM-05/07 đều là ancestor HEAD; source/test manifest16/16 khớp. Không fetch/merge/commit/push, không chạy merge gate mới trong lần kiểm scope này.

Trước chỉnh UI ngày/giờ/budget/checkbox, gate live `2026-10-15T16:04:45.696281+00:00`: READY_TO_CLAIM. Không đổi contract GM-07 hoặc metadata task; chỉ presentation/draft fields và tests trong GM-10. Manifest hiện18 files sau thêm MealDateTimeFields và suite của component.

Trước sửa A1..A5: gate live `2026-10-15T15:15:15.102435+00:00` READY_TO_CLAIM. Không fetch/merge hoặc chạy merge gate trong lượt sửa phạm vi này; merge gate bên dưới là record lịch sử, không thay review source mới.

Sau phản hồi Expo Go trong bugs.md: start gate live đọc lại `2026-10-15T14:41:08.573208+00:00`, READY_TO_CLAIM. [BUG_REVIEW](BUG_REVIEW.md) trả lời từng mục và ghi sửa phân cấp địa điểm/switch/giờ theo buổi/biên nhận sau lưu. Yêu cầu giờ gợi ý 07:00/12:00/19:00 được người dùng giao ở lượt này; không thay meal enum, eligibility hoặc tự nới giờ khi empty. Các log không có tiền tố BUGFIX giữ lượt trước sửa; bảng kết quả dưới đây dùng lượt mới nhất.

Main sau đó nhận PR121/GM-09 và PR118/GM-23 do Trí merge. Đã backup patch rồi cập nhật base sang30ecb56, giải quyết xung đột navigation/route tests, không tạo commit riêng. Check trước cập nhật đạt444 mobile tests/Python550/72.116s là lịch sử; kết quả cuối bên dưới chạy lại trên base mới. Gate merge live `2026-10-15T14:01:58.359101+00:00`: READY_FOR_MERGE_REVIEW với target30ecb56; [output](MERGE_GATE.txt). Gate không thay approval hoặc Expo Go acceptance.

## AC và assertion

| AC / case | Input / expected | Actual / evidence | Kết quả |
| --- | --- | --- | --- |
| Origin khác nơi bán; temperature khác cay; sở thích mềm không NO | PoolDish origin/venue hiển thị riêng, chọn hot + spicy none; body chỉ UserPreferences | Context dùng origin/venue/address thật từ fixture; component tests kiểm hot và flavor.none độc lập, không có votes/origin trong submission | Pass tự động |
| Host xác nhận anchor/buổi/giờ, manual/denied/outside/empty/stale | Không gọi preview khi chưa confirm; không gửi raw GPS; member chỉ đọc | A1 chỉnh lại cùng room/version và xác nhận/preview mới, A2 giữ reload sau stale→save, A4 distance anchor/unknown đã có regression. A7 success-empty supplement cần adapter GM-24/25 | Pass tự động scope mock; native cần kiểm lại |
| Giá unknown, rỗng theo buổi, reset-ready | Null hiện Chưa có giá, vẫn giữ món; empty không tự nới giờ/radius; context reset cả nhóm | Unit price0/group/nullable và component null-price4 món/empty query immutable; ready fixture kiểm2→0 sau context save | Pass tự động |
| avoidRecent/history consent | Host sửa avoidRecent chung; own consent mặc định false, đổi reset own ready, bỏ qua mềm không mất consent | DTO đúng, không history thật; tests caller ready=false/peer=true sau preferences, hero reset và skip giữ consent=true | Pass tự động |
| Thời gian UTC+7 | 05/11/15/18/22 boundary và late-night; reject invalid/past; custom không buffer, ăn ngay buffer một lần | Unit roundtrip/leap-day/timezone, component custom23:30/timeHint, retry payload giữ ISO/ID/version | Pass tự động |
| Pending/unknown/ACK/stale/refetch | Không double write, retry intent khi đã delivered, snapshot sau ACK lỗi khóa Continue và chỉ đọc lại | A3 receipt skip→timeout→retry dựa ownPreferences snapshot, giữ consent/payload/id/version; A2 giữ reload. Chỉnh context mới refetch version, không mở lại intent accepted cũ | Pass tự động |
| Routes và bàn giao | Shell → Context → Preferences → Back, giữ cùng mock room; callbacks inject được | A5 Home ở form/receipt đi '/', Back vẫn về context, pending/unknown khóa Home. Re-edit sau Back giữ category đã lưu, không tạo phòng mới. A8 production mode/copy thuộc GM-25; chưa commit/review | Pass routes tự động; bàn giao chưa nghiệm thu |
| Phản hồi bugs.md | Phân cấp khu vực/điểm; switch; giờ theo buổi; multiple categories; preview chỉ xem; anti-repeat; lưu/skip có kết thúc rõ | Thêm giờ kế tiếp UTC+7 kiểm trước/đúng/sau mốc và qua tháng/năm/leap; component/route kiểm snack/custom, area không có anchor, nhiều category, edit sau receipt/version mới, anti-repeat qua route, skip và callback phòng chờ chỉ khi inject | Pass tự động; native layout chờ kiểm lại |
| bugs.md mới: date/time + budget + confirmation | Ngày/giờ riêng, bộ chọn ngày theo token, budget riêng card; checkbox xanh nhưng vẫn cần xác nhận thủ công | Picker Hôm nay/Ngày mai/server day/qua năm, trước/sau7 ngày/clamp, nhập ngày dở không đổi giờ, disabled; đổi ngày/giờ/budget bỏ checked/preview; payload/retry UTC+7 cũ tiếp tục đạt | Pass tự động; bố cục/màu native cần thử lại |
| Expo Go sau bản sửa cuối | Hai màn và controls trong scope mock | Người dùng xác nhận “tôi đã kiểm tra và ổn thỏa”; [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md). Chưa có metadata thiết bị hoặc kết quả riêng từng fixture/a11y | **Pass theo xác nhận chung của người dùng; phần chưa xác nhận riêng chờ Trí đối chiếu, chưa Done** |

## Lệnh / kết quả cuối

| Kiểm | Actual / output | Trạng thái |
| --- | --- | --- |
| `cd mobile; npm run check` | Exit0; strict typecheck/lint/architecture đạt, 4 lint warnings upstream; **17 suites / 551 tests**, Jest31.72s; [lượt UI mới](DATE_UI_MOBILE_CHECK.txt). FINAL/SCOPE_FIX/BUGFIX/MOBILE là log trước sửa date UI | Pass |
| `npm run check:expo` online | **Exit1**, CLI mới nhất đề xuất expo~57.0.30/router~57.0.28, hiện khóa57.0.29/57.0.27; [output](FINAL_EXPO_COMPATIBILITY.txt). Không tự nâng package nền trong GM-10. Log Dependencies up to date cũ không thay kết quả mới | Cần đối chiếu dependency nền, không ghi Pass |
| `npm run bundle:android` | Exit0;1294 modules; Hermes `entry-d800cda8a975418a37e3c87ec743464c.hbc`; [output](DATE_UI_ANDROID_BUNDLE.txt); không đổi package/config | Pass export, chưa là mở app |
| Python regression sau date UI | **550 tests/124.926s, OK, không skipped**, [output](DATE_UI_PYTHON_REGRESSION.txt). Lượt đầu bắt trúng link khi tài liệu đang tạo; đã hoàn tất artifacts rồi chạy lại full regression. Không sửa test/validator để né lỗi | Pass lượt cuối |
| Repo validator/indexes/diff/manifest/protected scope | [Lượt date UI](DATE_UI_REPOSITORY_CHECK.txt);18 hashes khớp manifest chính, PRE_DATE_UI_PATCH_MANIFEST giữ16 hashes trước sửa; package/shared/API/backend và task metadata giữ nguyên, không staged/unmerged paths | Pass |

Hai lỗi lint trung gian về setState trong effect/purity được giải quyết bằng tách form mount từ snapshot đã tải và callback/network state có identity, clock chỉ đọc trong event handler. Không tắt rule hoặc thay config. Kết quả cuối thay các lượt trung gian; tests không chứng minh thuật toán BE hoặc native hit testing.

## Kiểm thiết bị bằng văn bản

Người dùng xác nhận đã kiểm tra bản sửa cuối và ổn thỏa; [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md) lưu nguyên văn, revision và giới hạn. Không tự điền model/Android/Expo Go hoặc kết quả từng case chưa được cung cấp. Chỉ dẫn hiện tại không yêu cầu ảnh/video UI; xác nhận GM-09 không dùng cho GM-10. Các mục bắt buộc chưa có kết quả riêng cần Trí kiểm/đối chiếu trước nghiệm thu; chỉ Trí review cuối, merge và chuyển Done.

## Kiểm hồ sơ trước commit

Lượt chuẩn bị tài liệu không đổi source/test/package/contract hoặc metadata task. [PRE_COMMIT_REPOSITORY_CHECK.txt](PRE_COMMIT_REPOSITORY_CHECK.txt) lưu kết quả validator, indexes, diff và đối chiếu manifest sau khi hoàn tất các file Markdown. Không chạy lại mobile/bundle chỉ vì đổi tài liệu; các log DATE_UI ở trên vẫn là kết quả trên đúng 18 source/test hashes.

Đã chạy lại `python -m unittest discover -s tests -p "test_*.py"` sau chuẩn bị hồ sơ: **550 tests/99.928s, OK, không skipped, exit0**; [PRE_COMMIT_PYTHON_REGRESSION.txt](PRE_COMMIT_PYTHON_REGRESSION.txt). Hai lượt sandbox trước đó lỗi81 do quyền ghi/cleanup thư mục tạm Windows, kể cả khi đổi TEMP vào workspace: [lượt đầu](PRE_COMMIT_PYTHON_INITIAL.txt), [lượt đổi TEMP](PRE_COMMIT_PYTHON_TEMP_RETRY.txt). Lượt cuối chạy ngoài sandbox đạt; không sửa code/test/validator hoặc bỏ test để vượt lỗi. Những log lỗi môi trường được giữ để truy vết, không ghi chúng thành Pass.
