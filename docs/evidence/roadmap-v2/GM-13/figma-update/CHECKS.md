# GM-13.2 — checks bước1–6

Nhánh codex/gm-13-figma-update, base7e24074. Kết quả theo
[CHECKS.json](CHECKS.json), [manifest](SOURCE_MANIFEST.json).
Các STEP1–STEP5 ghi lượt kiểm từng phần; source cuối bước6 dùng manifest.

| Kiểm cuối | Kết quả |
| --- | --- |
| Full mobile |55 suites/936 tests Pass241.738s, không skipped |
| TypeScript/source lint/architecture |Pass, source lint0 warnings |
| npm ci + locked Expo |Pass,1287 packages đúng lockfile; SDK58.0.19, không đổi package/lockfile hoặc allowScripts policy |
| PNG pixel |34/34 Pass598.335ms |
| Android Hermes export |Pass: entry-a95133a3a64e4c8afd164689c5d8dc06.hbc; hash trong JSON |
| Python regression |657 tests/326.758s:650 Pass,6 skipped,1 WinError1314 khi setup symlink; không assertion failure |
| Full lint |Fail:4 imports trong QA local cũ,0 source errors,0 warnings |
| Repo/task indexes/diff |Pass sau hoàn thiện hồ sơ |
| Native/Expo Go/API/Places thật |Not run, không suy từ export |

Full mobile kiểm trước lượt reinstall cuối; không đổi source sau kiểm,
53 hashes còn khớp sau npm ci. Locked compatibility/export và full lint
chạy lại trên installation mới, không tự approve install scripts từ npm
warning hoặc nâng dependency. Không có package/config drift.

- Live start gate18:14:54Z ngày02/11 (03/11 UTC+7): READY_TO_CLAIM.
- Bước1:18 tests; bước2:28 component/shared tests và34 PNG tests.
- Bước3:20 tests cuối, kiểm cả GM-10; trước đó native animation có
  timeout, đã kiểm soát completion trong test điều hướng, không tăng
  timeout/đổi runner. Test motion riêng vẫn drive completion thủ công.
- Bước4:8 read-state/terminal/legacy cases trong lượt tập trung.
- Bước5:17 cases ở lượt đầu; thêm stale async response ở bước6.
- Router + real-mode guard:12 cases Pass67.366s trước full regression.
- Source TypeScript, lint src/tests/scripts và architecture đã kiểm;
  kết quả toàn bộ mobile, locked Expo, export, Python/docs/diff xem JSON.

Full lint gồm file QA local cũ có4 imports hỏng đã ghi ở GM-10; source lint
được báo riêng, không đổi ignore để che lỗi. Python symlink Windows nếu
tái hiện giữ Error, không sửa test hoặc đổi quyền OS.

Đây là UI mock, không có API/DB/native Places/map execution. SDK58 theo
lockfile hiện hành; không thay package, dependency hoặc schema. PNG
pixel/JSX assertions/export Hermes không thay native visual acceptance.

Bước7 Expo Go và từng AC thiết bị vẫn Not run. Đọc [HANDOFF](HANDOFF.md)
và [FIGMA_PARITY](../FIGMA_PARITY.md); không tự ghi Done/Approved/push.
