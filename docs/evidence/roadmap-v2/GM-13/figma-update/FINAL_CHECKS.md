# GM-13.2 — kiểm revision bàn giao cuối

Source implementation `9373b804003c1a576e6de65cdd76823eeda364dd`, base
`7e24074ac473c54d31c5c336df09d5a3a0e682c5`. Sau đó cập nhật docs và
regression tests cho nút QA development; product source giữ nguyên.
Hashes cuối ở [FINAL_SOURCE_MANIFEST](FINAL_SOURCE_MANIFEST.json).
Kết quả máy đọc ở [FINAL_CHECKS.json](FINAL_CHECKS.json).

## Kết quả cuối

Windows, Node24.20.0/npm11.19.0, Python3.15, Expo58.0.19 theo lockfile.
Package/lockfile không thay đổi; npm ci đã kiểm ở bước6, compatibility
được kiểm lại lượt cuối. Không nâng package hoặc đổi runner/timeouts.

| Kiểm | Actual |
| --- | --- |
| Full mobile | **56 suites/946 tests Pass**,0 fail/skipped;380.129s; suite counts chi tiết trong JSON |
| TypeScript | Pass sau cập nhật regression test |
| ESLint src/tests/scripts | Pass,0 warnings |
| Architecture | Pass |
| Locked Expo offline | Installed dependencies khớp lockfile/SDK bundled map; Pass, không phải online latest check |
| PNG pixels |34/34 Pass,1.633s |
| Android Hermes export | Pass, entry-389e6cf38073a3672f9a2d41c37ad4b7.hbc,3713317 bytes; không phải APK |
| Source manifest |56 files khớp hash; product source9373b80 + bản sửa regression test trong commit bàn giao |
| Full lint | Fail4 import errors/0 warnings, chỉ QA local cũ mobile/.work/gm10Audit.test.tsx; sourceErrors0 |
| Python regression |657 tests:650 Pass,6 skipped,1 Error,0 assertion failures;179.186s |
| Repo validator/task indexes/diff | Pass sau hoàn thiện hồ sơ; không là approval/runtime test |

Bundle SHA256:
`89a980c59be2e2e1b4428c93e6fb07af0b587a1a60b530f36bcc12f28dbea53a`.

Lượt full mobile đầu có2 assertions cũ yêu cầu Home không có nút QA.
Hành vi development đã được sửa tại7571025 theo lỗi người dùng. Đã
đồng bộ test để kiểm công cụ mặc định đóng, không lộ fixture controls;
thêm release-mode test xác nhận không có nút QA. Giữ kiểm navigation và
business assertions, không đổi UI đã kiểm Expo.3 cases tập trung Pass,
sau đó full946 tests Pass; không dùng lượt943/945 làm kết quả cuối.

Hermes export đầu không ghi được file trong temp của sandbox; cùng lệnh
chạy với quyền môi trường đầy đủ đạt. Không sửa code để né lỗi compiler.

Full lint4 imports cũ: expo-router/build/global-state/router-store và
../src/app/gm10/{_layout,context,preferences} trong file QA local ignored.
Không xóa file người dùng hoặc đổi ignore để che lỗi. Python Error là
WinError1314 khi setup symlink trong test_stage_refuses_symlink_output,
trước khi vào hàm được kiểm; không sửa test bảo vệ symlink/quyền Windows.
Các6 skipped giữ đúng kết quả runner, không gộp thành Pass.

## Lệnh tái lập

Từ mobile:

```powershell
npm test -- --json --outputFile ../.work/gm13-final-mobile-verified.json
npm run typecheck
npx eslint src tests scripts --max-warnings 0
npm run check:architecture
$env:EXPO_OFFLINE='1'
npm run check:expo
node --test tests/brandAssetTransparency.test.mjs
npx expo export --platform android --output-dir ../.work/gm13-final-android
npm run lint
```

Từ repo root, dùng Python environment có dependencies theo dự án:

```powershell
python -m unittest discover -s tests -p 'test_*.py'
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff --check
```

Raw logs/builds giữ local ignored; JSON đã commit ghi counts từng suite,
hash source/bundle và kết quả Fail/Not confirmed để reviewer tái lập.
Các CHECKS.json/SOURCE_MANIFEST.json cũ giữ snapshot bước6, không sửa
hash hoặc số936 để giả thành evidence của source mới.

Expo Android13: [DEVICE_CHECKS](DEVICE_CHECKS.md), xác nhận tổng quát từ
người dùng; TalkBack/font200%/visual theo từng viewport chưa xác nhận.
Không có API/Places/map/native APK execution trong bộ UI mock này.

## Gate và upstream

Đã `git fetch origin` ngày2026-11-03. `origin/main` vẫn là7e24074; là
ancestor của implementation9373b80, không có commit main chưa nhận.
Merge gate live14:56:07Z: READY_FOR_MERGE_REVIEW, owner Tuấn/reviewer Trí,
chỉ đọc Project/artifact, không ghi approval/status/PR và không tự merge.

Trước reviewer merge cần kiểm ref/gate lại nếu main hoặc Project đổi;
consumer phải nhận đúng contract/commit của task mình, không dùng gate
GM-13 làm bằng chứng API/DB/native của các task tích hợp đã đạt.
