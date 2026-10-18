# GM-13 — kiểm màn Result/NoConsensus

Ngày tổng hợp: 2026-10-19. Task [GM-13 / issue #74](../../../../tasks/backlog/GM-13.md),
owner Tuấn (`mtuan2491`), reviewer cuối Trí (`ThanhTris`). Mode `expo-go`, màn
UI-08/09 với fixture tổng hợp; không phải nghiệm thu API/native integration.
Trạng thái bàn giao: chuẩn bị PR để trưởng nhóm review; chưa Approved/Done.

## Revision và môi trường

- Nhánh `codex/gm-13-result-no-consensus`, target dự kiến `main`.
- Code nền `4d2cce7c161b4f11ccad5448f46d54a1ab4a67e8` + patch theo SHA256 từng
  source/test trong [OFFERING_LOAD_MANIFEST](OFFERING_LOAD_MANIFEST.json).
  Commit chứa hồ sơ này bàn giao patch cuối; không tự điền SHA commit chưa tạo.
- Contract task `food-v1/roadmap-v2/GM-13.1`, API GM-07.1, policy `decision-v2`.
  Dataset: fixture GM-13, không production/verified seed. Không thay schema.
- Windows, Node 24.20.0/npm 11.19.0, Python 3.14; pandas/lxml/tzdata đã cài cho
  regression. Expo 57.0.30/Router 57.0.28, React 19.2.3/RN 0.86.3 theo lockfile;
  không đổi package/native module.
- Expo Go trên Android, SDK57 theo thông tin người dùng. Chưa có số phiên bản
  ứng dụng Expo Go và thông số máy GM-13 được xác nhận riêng.

## Kiểm thủ công do người dùng báo

Nguồn xác nhận ngày 2026-10-19 trong cuộc hội thoại sau sửa fixture, icon, ngắt
dòng và bỏ viền nhấn Maps: **“tôi đã kiểm tra trên expo go xong”**. Ghi nhận hoàn
thành lượt kiểm theo báo cáo tổng quát; người dùng không báo lỗi mới trước khi
yêu cầu bàn giao. Agent không trực tiếp thao tác điện thoại và không diễn giải
câu này thành Pass riêng mọi ca hoặc approval của trưởng nhóm.

Theo chỉ dẫn trực tiếp, **không yêu cầu ảnh/video** cho lần bàn giao này. Evidence
thủ công là xác nhận bằng văn bản cùng revision/fixture/cách tái lập. Merge,
quyết định nghiệm thu và chuyển Done do trưởng nhóm thực hiện.

Người dùng yêu cầu tra thiết bị từ issue trước. GitHub Project/issue live chưa
truy cập được. Hồ sơ local GM-09/10 ghi chưa cung cấp model/Android;
[GM-16 device check](../GM-16/MOBILE_DEVICE_CHECK.txt) ghi **OPPO Find X9,
CPH2797, Android 16**. Đây là máy của phép kiểm GM-16, chưa có căn cứ xác nhận
là máy của người dùng hoặc máy kiểm GM-13; không chép thành thông số đo mới.
Không lấy trạng thái Markdown/cache làm Project Done hiện hành.

| Mục trên điện thoại | Actual / nguồn | Trạng thái và giới hạn |
| --- | --- | --- |
| Mở app và kiểm bản sửa cuối trên Expo Go | Người dùng báo đã kiểm xong sau bản sửa cuối, không có báo lỗi mới | Đã kiểm theo báo cáo tổng quát; chưa phải review Approved |
| Từng tier/fixture, refetch, action, new/Home/Back | Có assertions tự động bên dưới; chưa có báo cáo từng ca | Chưa xác nhận riêng trên thiết bị |
| Light/dark, font200%, TalkBack, responsive/reduced motion | Chưa có báo cáo riêng cho GM-13 | Not run trong phiên agent; chưa xác nhận riêng từ người dùng |
| Model/Android/Expo Go app version GM-13 | SDK57 đã được nêu; model lịch sử chỉ có ở GM-16 | Chưa xác nhận riêng; không suy thiết bị từ task khác |

Các mục bắt buộc chưa có kết quả riêng cần trưởng nhóm đối chiếu khi nghiệm thu;
vẫn bàn giao PR để review, không tự ghi toàn bộ device AC Pass hoặc Done.

## Kết quả tự động trên source bàn giao

| Lệnh / phạm vi | Actual | Kết quả / output |
| --- | --- | --- |
| `npm run check:expo` | Installed dependencies khớp lockfile; bundled compatibility đạt, đã chạy lại trong lượt patch | Pass locked/offline; không kiểm patch online |
| `npm run check` | TypeScript strict, lint 0 errors/4 warnings sẵn trong API, 24 suites/669 tests, architecture guard | Pass — [log cuối](OFFERING_LOAD_MOBILE_CHECK.txt) |
| `npm run bundle:android` | Hermes `entry-377a8b0b1f57294508a182cd30f86015.hbc`, export thành công | Pass — [log](OFFERING_LOAD_ANDROID_BUNDLE.txt); chưa phải APK |
| Python full regression với pandas/lxml/tzdata | 550 tests, OK, không skipped | Pass — [log](OFFERING_LOAD_PYTHON.txt); Cell ERROR/HTTP429 là ca lỗi mô phỏng |
| Repo validator / check-docs / diff / hash source | Docs/links/JSON/task indexes hợp lệ; source khớp manifest | Pass — [log patch](OFFERING_LOAD_VALIDATION.txt); kiểm lại sau tổng hợp hồ sơ trước commit |

Sau tổng hợp CHECKS/HANDOFF đã chạy lại Python: **550 tests, OK, không skipped**
([output bàn giao](HANDOFF_PYTHON.txt)); repo validator/check-docs/diff và đối
chiếu hash source đạt ([output bàn giao](HANDOFF_VALIDATION.txt)). Không chạy
lặp mobile check vì source/test không đổi so với manifest đã đạt 669 tests.

Không sửa source sau lượt kiểm cuối; lần này tổng hợp CHECKS/HANDOFF và kết quả
người dùng báo. Không dùng output lịch sử 655/657 tests hoặc 6 skipped thay kết
quả bản cuối 669 tests mobile / 550 tests Python không skipped.

## Ma trận AC và tái lập

Chạy theo [HANDOFF](HANDOFF.md), mở `/gm13/result` và Công cụ kiểm thử GM-13.
Mọi fixture có nhãn mô phỏng; không dùng phòng/phiếu/dataset người dùng thật.

| Input / thao tác | Expected / assertion | Actual tự động | Android thật |
| --- | --- | --- | --- |
| PERFECT / CONSENSUS / COMPROMISE | Đúng winner/tier/reason; không lộ phiếu hoặc tự chọn winner | Pass; fixture đối chiếu domain, alternative có NO không thắng | Trong báo cáo chung, chưa tách kết quả từng ca |
| Ready/empty/stale/closed/changed/unknown | Giá/đơn vị/nguồn/ngày kiểm/lịch và thông báo đúng; empty khác lỗi | Pass: formatter/component/route tests | Như trên |
| Loading lần đầu | Winner còn nguyên; không thẻ quán/action/timestamp; refetch disabled | Pass | Như trên |
| Loading cập nhật | Giữ thẻ quán, nhãn Dữ liệu cũ và thời điểm cũ; refetch disabled | Pass | Như trên |
| Lỗi lần đầu | Không thẻ quán/timestamp; retry enabled; không kết luận empty thành công | Pass | Như trên |
| Lỗi cập nhật | Giữ dữ liệu/thời điểm cũ; retry bỏ nhãn cũ, cập nhật timestamp | Pass, gồm cache rỗng và timestamp null | Như trên |
| Refetch sau lỗi/cũ/đổi/đóng | Cùng winner/tier/resultId, chỉ đổi offering | Pass: assertions identity và callback | Như trên |
| Hai offering / item lệch winner | Metadata/giá/target riêng; bỏ item sai choice/dish/round row | Pass | Chưa xác nhận riêng |
| Maps/review/browser/copy thành công/lỗi/pending | Đúng public target, callback-only, fallback và khóa double action | Pass: spy/reject/pending/missing target | Trong báo cáo chung, chưa tách ca |
| Bốn nút action | Icon nhỏ, cùng nền/viền; Mở bằng / trình duyệt và Sao chép / địa chỉ | Source đã chỉnh; callbacks/labels đạt test; Jest không chứng minh layout thật | Người dùng báo kiểm xong sau bản sửa; chưa có kết quả riêng từng nút |
| No Consensus vòng 1/vòng 2 | Lý do trung tính, không winner/người NO/vòng ba | Pass: EMPTY_INTERSECTION/ALL_REMOVED | Trong báo cáo chung, chưa tách ca |
| New/Home/Android Back, mở routes từ tools | Form mới không carry receipt/phiếu; terminal Back về Home | Pass: route integration và BackHandler | Như trên |
| Light/dark/font200/TalkBack/responsive | Không cắt nội dung; touch48dp, labels/states rõ, font lớn một cột | Dark semantic color đạt; chưa đo layout/TalkBack thật | Chưa xác nhận riêng |

Loading fixtures giữ trạng thái để quan sát; chọn Fixture Có nơi bán để thoát.
Giá tham khảo, lịch dự kiến, khoảng cách đường chim bay từ điểm ăn chung; không
xác nhận còn hàng, chỗ ngồi hoặc quãng đường đi.

## Gate, giới hạn và người quyết định

Start gate lịch sử ngày 2026-10-16: READY_TO_CLAIM. Lượt local mới trả
`BLOCKED_PROJECT_UNVERIFIED` vì thiếu credential/quyền đọc Project; người dùng
đã cho phép sửa local trong cùng cuộc hội thoại. Đây không phải gate trước merge
đạt. CLI hiện không kết nối GitHub, `gh` báo credential không dùng được; không
có browser khả dụng. Không tự thay approval hoặc suy Done từ cache.

Trước merge, trưởng nhóm cập nhật ref và chạy
`python scripts/task_readiness.py --task GM-13 --gate merge --base-ref origin/main`,
đối chiếu GM-05/07 và artifact trên target, kiểm AC/DoD rồi quyết định nghiệm thu.
Lần bàn giao này không merge, không đổi Project/issue Done và không tự Approved.

Thử chuẩn bị stage bị chặn tạo `.git/index.lock` (Permission denied), nên agent
chưa stage/commit/push hoặc tạo PR được trong phiên này. Người dùng có thể chạy
script local `.work/gm13-submit.ps1` và xem nội dung PR `.work/gm13-pr-body.md`;
hai file là công cụ local đã ignore, không thuộc artifact app hoặc yêu cầu chạy
từ clone sạch. Script chỉ commit/push nhánh GM-13 và mở/reuse PR, không merge,
approve, tạo tag, đóng issue hoặc đổi Project. PR tạo mới ở chế độ draft để giữ
rõ gate/ca chưa xác nhận; trưởng nhóm quyết định review/ready/merge.

Maps/review/browser/copy thật, server/API, cache/outbox/reconnect, multi-device
và APK ngoài scope GM-13; giao GM-27/30/31 và QA tương ứng. Contrast shared palette
đã được GM-10 ghi giới hạn theo ownership GM-05; không tự thay palette hoặc tuyên
bố toàn bộ accessibility đạt.

Hồ sơ lịch sử: [rà soát 2026-10-18](RECHECK_2026-10-18.md),
[đổi bố cục thẻ](OFFERING_CARD_REFINEMENT.md),
[bốn load states/icon](OFFERING_LOAD_STATES.md). Xác nhận người dùng mới trong
CHECKS này bổ sung kết quả mở/kiểm app cho các hồ sơ trước; không thay kết quả
riêng từng ca chưa được báo.
