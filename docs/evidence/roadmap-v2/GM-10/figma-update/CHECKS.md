# GM-10.2 — checks bước1–6

**Đọc trước khi nhận việc:** [FINAL_HANDOFF](FINAL_HANDOFF.md) là bàn giao hiện hành sau các lượt sửa Expo. Phần dưới giữ kết quả bước 1–6 để truy vết, không thay hướng dẫn mới về picker, save settings hoặc hủy phòng.

**Điều chỉnh mới nhất:** [BEHAVIOR_REFINEMENT](BEHAVIOR_REFINEMENT.md) thay chỉ dẫn về save settings/footer và ghi bổ sung tương tác. Các kết quả bên dưới giữ nguyên cho source lịch sử; xem checks revision mới.

Baseline1939d35, owner Tuấn/reviewer Trí, branch codex/gm-10-figma-update.
Kết quả tại working tree bước6, không là nghiệm thu thiết bị hoặc quyền merge.

| Kiểm tra | Kết quả |
| --- | --- |
| Start gate live10:15:53Z | READY_TO_CLAIM, Project không dùng fallback |
| npm ci / locked Expo58 | Pass; không đổi package/lockfile, Expo kiểm offline |
| TypeScript / ESLint src-tests-scripts / architecture | Pass trên source bước6 trước full regression |
| Steps2/3/4 |5/7/9 tests Pass ở từng bước, xem STEP2–STEP4 |
| Flow step5 |10 tests Pass15.391s; thêm member/dialog ở bước6 |
| Flow kiểm cuối trước full run |11 tests Pass13.416s, giữ timeout runner |
| PNG pixel |28 cases Pass542.328ms;14 glyph mới và14 baseline GM-09 |
| Full mobile cuối |44 suites/840 tests Pass123.925s, giữ runner/timeouts |
| Android Hermes export |Pass, entry-5d339fe0f6185fa2c67947a081adfef9.hbc; không phải APK hoặc device acceptance |
| Full npm lint |Fail:4 imports cũ trong mobile/.work/gm10Audit.test.tsx; source/tests/scripts lint Pass, không sửa file QA local hoặc exclude config để che lỗi |
| Python regression |657 tests/121.642s:650 Pass,6 skipped,1 error WinError1314 tạo symlink trong test_catalogue_projection; không assertion failure |
| Native/visual/Expo Go sau sửa | Not run; thực hiện bước7, không lấy Jest/export thay thế |
| RPC/auth/transaction nhiều máy | Ngoài nghiệm thu UI mock, chưa chạy adapter B thật |
| Repository/task indexes/diff |Pass sau cập nhật tài liệu; kiểm lại trước commit |

Python dùng dependency QA tương thích3.15 trong `.work/gm10-python-deps`;
không sửa assertion/test/OS privileges để vượt symlink. Log local ignored
`.work/gm10-steps-python.log`. Kết quả này thay lỗi thiếu jsonschema/tzdata
của lượt lập kế hoạch, không thay đổi evidence lịch sử.

Lượt full đầu839/840: assertion GM-09 vẫn đòi nút mở thiết lập disabled,
đã đổi expected thành enabled vì callback GM-10 hiện được nối. Full cuối
đạt840/840, không đổi assertions bảo mật/legacy hoặc tăng timeout.

Log local full mobile `.work/gm10-mobile-full-final.log`/JSON results, PNG
`.work/gm10-alpha-check.log`. Không commit raw PNG tham chiếu/log local.
Mỗi source commit của bước1–5 đã kiểm trước commit; bước6 ghi kết quả cuối
sau khi full checks hoàn tất. [Manifest source](SOURCE_MANIFEST.json) pin49
file bằng SHA256 (text chuẩn LF), gồm source/tests/script/assets thực sự đã
kiểm; raw refs/log/build nằm local ignored. Không tự ghi Done/Approved hoặc push.

[CHECKS.json](CHECKS.json) giữ kết quả máy đọc. Bước6 đã hoàn tất kiểm tự
động trong phạm vi source; các lỗi môi trường được giữ Fail, không đổi
chúng thành Pass hoặc suy đã đủ điều kiện merge/Done.
