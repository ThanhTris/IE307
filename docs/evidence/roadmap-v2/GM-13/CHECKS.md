# GM-13 — kiểm màn Result/NoConsensus

Kiểm mới nhất sau khi trình bày lại thẻ nơi bán:
[OFFERING_CARD_REFINEMENT](OFFERING_CARD_REFINEMENT.md),
657 tests mobile và 550 tests Python đạt; visual/device review của bố cục mới còn Not run.

Kết quả mới nhất ngày 2026-10-18: [rà soát và sửa local](RECHECK_2026-10-18.md).
Phần ngày 2026-10-16 bên dưới là lịch sử, không thay xác minh gate/device hiện tại.

Ngày: 2026-10-16. Owner Tuấn (`mtuan2491`); reviewer Trí (`ThanhTris`).
Nhánh `codex/gm-13-result-no-consensus`, base/HEAD
`4a8cd642c8d908d9e6d2c75d19c0935a44cba042` + working tree theo
[PATCH_MANIFEST](PATCH_MANIFEST.json). Chưa commit/push/merge hoặc Approved/Done.
Contract task GM-13.1; API GM-07.1; result policy decision-v2. Fixture-only,
không sử dụng dataset production, phòng hoặc phiếu người dùng thật.

## Gate và môi trường

- Start gate đọc mới [Project #2](https://github.com/users/ThanhTris/projects/2) tại `2026-10-16T07:24:23.474977+00:00`: `GM-13: READY_TO_CLAIM`. Không lấy Closed/local/cache thay Done. Sau fetch, `git rev-list --left-right --count HEAD...origin/main` trả `0 0`. Gate này không phải approval GM-13.
- Windows, Node 24.20.0 / npm 11.19.0; Expo 57.0.30/RN 0.86.3 theo lockfile hiện hành. Không đổi package/lockfile hoặc thêm thư viện native.
- Python 3.14 với `tzdata` trong môi trường uv riêng ở cache `.work/uv-cache`; không cài vào Python hệ thống hoặc sửa dependency app. Các lỗi regression trước đăng nhập/thiếu timezone vẫn được ghi lịch sử trong REQUIREMENTS_AUDIT.
- npm ci lần đầu bị offline cache miss, lần online gặp idle timeout; retry `--offline=false --prefer-offline --maxsockets=4 --fetch-retries=2` hoàn tất 1064 packages. Không bỏ dependency validation.
- Bundle sandbox lỗi `spawn EPERM` khi gọi Hermes; chạy lại cùng lệnh ngoài sandbox Pass. Không đổi compiler/build config để vượt lỗi.

## Kết quả tự động

| Lệnh | Actual / assertion | Kết quả |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` với tùy chọn cache/retry nêu trên | Cài theo lockfile, không diff manifest/lockfile | Pass |
| `npm run check:expo` | Installed dependencies match lockfile, SDK bundled compatibility up to date; là locked/offline check, không phải kiểm online patch mới | Pass — [output](EXPO_CHECK.txt) |
| `npm run check` | TypeScript strict; lint 0 errors, 4 warnings có sẵn trong data/api; Jest 24 suites / 655 tests; architecture boundaries OK | Pass — [output](MOBILE_CHECK.txt) |
| `npm run bundle:android` | Android 1330 modules, Hermes `.hbc` xuất trong `mobile/dist/android`; đây là bundle JS/Hermes, chưa phải APK/native build hoặc device smoke | Pass — [output](ANDROID_BUNDLE.txt) |
| `uv run --no-project --cache-dir .work/uv-cache --with tzdata --python <Python3.14> python -m unittest discover -s tests -p 'test_*.py'` | 550 tests, OK, skipped=6; chạy ngoài sandbox để Temp hoạt động. Các thông báo ERROR/HTTP429 do test scenario, kết luận unittest exit0 | Pass — [output](PYTHON_REGRESSION.txt) |
| `python scripts/validate_repository.py` | Docs/links/JSON/task manifest/dependencies/FR traceability | Pass — [output](VALIDATION.txt) |
| `python scripts/task_readiness.py --check-docs` | Indexes khớp, không đổi task metadata | Pass — [output](VALIDATION.txt) |
| `git diff --check` và kiểm riêng files untracked | Không lỗi whitespace; no-index exit1 chỉ báo file mới khác file rỗng, lỗi whitespace có exit3 | Pass — [output](VALIDATION.txt) |

Metro local khởi động trên port8081; `GET /status` trả
`packager-status:running`, Android manifest trả hostUri. Đây là kiểm dev server,
chưa có request từ điện thoại hoặc xác nhận UI/device. Lần start đầu kết hợp
`--offline` với script `--lan` bị CLI từ chối; dùng `npm start -- --port 8081`
đúng script sẵn có, không sửa config.

## Ma trận scope và AC

| Input/thao tác | Expected | Actual tự động | Android thật |
| --- | --- | --- | --- |
| PERFECT/CONSENSUS/COMPROMISE | Đúng tier/reason, cùng winner và không lộ matrix | Pass: unit witnesses dùng domain trên phiếu tổng hợp có alternative bị NO; component render đúng copy | Not run |
| Nơi bán ready/empty/stale/closed/changed/unknown/loading/error | Thông báo đúng, refetch không reroll/pool change | Pass: rerender và preview refetch giữ resultId/winner/tier | Not run |
| Null/0/giá nhóm/thiếu đơn vị hoặc nguồn | Chưa có/Chưa rõ khi thiếu, không tự đổi giá nhóm thành giá/người | Pass: formatter/component tests | Not run |
| Khoảng cách 0/unknown/1500m | Có đơn vị và đường chim bay tới anchor; không lấy GPS/đường đi | Pass | Not run |
| Hai offering hoặc offering lệch winner choice | Không trộn metadata; loại item lệch và có refetch | Pass: giá/target riêng, same dish/choice/round row assertions | Not run |
| Maps/review/browser/copy thành công/lỗi/pending | Đúng public target, callback-only, bắt lỗi và khóa double action | Pass: spy target, reject promise, missing target disabled | Not run |
| NoConsensus EMPTY_INTERSECTION/ALL_REMOVED | Lý do trung tính, không winner/người NO/vòng ba | Pass; result sai loại không bị gán là no consensus | Not run |
| New/Home/Android Back | Phiên mới không carry dữ liệu phòng mẫu; terminal Back về Home | Pass: route modules thật và BackHandler test callback | Not run |
| Home tools → Foundation → Result → NoConsensus | Mở đúng routes và banner mô phỏng | Pass: route integration | Not run |
| Dark/light, 320–599dp, font200, TalkBack, reduced motion | Không tràn/cắt nút, nhãn đọc rõ; không animation bắt buộc | Unit dark semantic color Pass; không có animation trong feature. Không suy layout/device từ Jest | Not run |

## Kiểm Expo Go còn bắt buộc

Chưa có adb/Android device được kết nối trong môi trường agent. Theo HANDOFF,
mở app trên Expo Go Android SDK57, đi tới `/gm13/result`, kiểm các fixture, actions,
new/Home/Back, rồi `/gm13/no-consensus` với hai reason. Kiểm light/dark, font200,
TalkBack, màn nhỏ/lớn và reduced motion; ghi model/OS/Expo/revision/thao tác/expected/
actual. Màn mock chưa thay nghiệm thu API/native GM-27/30 hoặc QA GM-33.

Contrast shared primary của GM-05 đã được GM-10 audit ghi chưa đạt NFR-06; giữ
ownership, chưa tự sửa palette hoặc kết luận contrast/a11y Pass. Không tuyên bố
ảnh/nguồn tổng hợp là dữ liệu verified hoặc lịch là tồn hàng trực tiếp.

**Chưa đủ điều kiện Done:** device AC còn Not run và cần Trí review revision
thật. Chưa chạy merge gate vì chưa yêu cầu merge; trước merge phải cập nhật ref,
chạy `--gate merge --base-ref origin/main` và kiểm upstream/AC theo workflow.
