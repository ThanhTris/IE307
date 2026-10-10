# GM-03 — Phần test cho chủ dự án

Task này là taxonomy/hợp đồng dữ liệu, chưa thêm màn hình. Test bằng terminal và JSON; không cần Expo Go, Android SDK hoặc Supabase/MongoDB. Mở đúng checkout `sanbox`: `C:\Users\ADMIN\.codex\worktrees\1043\Project`. [Báo cáo](REPORT.md), [dictionary](../../../data/FOOD_DATA_DICTIONARY.md).

## 1. Kiểm tra đúng branch và contract

```powershell
Set-Location 'C:\Users\ADMIN\.codex\worktrees\1043\Project'
git branch --show-current
```

Mong đợi `sanbox`. Trong Explorer mở đúng checkout đó; đổi thư mục terminal không tự đổi folder của VS Code.

Mở [dataset mẫu](../../../../tests/fixtures/food-v1/gm03-dataset.json). Kiểm `contractVersion=food-v1.gm03-draft.1`, `kind=fixture`, `status=draft`; có 4 món, 2 chi nhánh TEST, 5 offering và nguồn fixture-only. Giá/tọa độ/lịch là dữ liệu tổng hợp; không dùng đi ăn. Artwork và thành phần chưa biết để null.

## 2. Chạy test của task 3

```powershell
Set-Location 'C:\Users\ADMIN\.codex\worktrees\1043\Project\mobile'
npm.cmd test -- --runTestsByPath tests/catalogueContract.test.ts
```

Mong đợi `PASS tests/catalogueContract.test.ts`, exit 0. Test kiểm template/fixture hợp lệ, lỗi có path, tên trùng, nhầm category/cuisine, unknown, giá âm/đơn vị, ref sai, lịch qua đêm/ngày sai, source/license/reviewer và chặn fixture publish. Jest Windows sandbox EPERM cần runner có quyền thư mục temp; không sửa app hoặc bỏ test để né.

Kiểm toàn bộ mobile:

```powershell
npm.cmd run check
```

Mong đợi typecheck/lint không lỗi, 6 suites/150 tests đạt, `Domain boundary OK`. GM-02 vẫn trong regression, QR/manual/SQLite code không đổi. Không cần `npm run android` cho task dữ liệu này.

## 3. Những điểm cần đọc để review

| ID | Mở/kiểm | Kết quả mong đợi |
| --- | --- | --- |
| D-01 | Dish `dish-rice` và offering `off-rice-a` | Origin Nam không phải nơi bán; branch A được tham chiếu riêng |
| D-02 | `dish-combo.categoryIds` và case category-conflict | Có lẩu+nướng; lựa chọn loại món của hai người không tự veto nhau |
| D-03 | `off-rice-a` so với `off-rice-b` | Nóng/không cay ở A, ambient/cay cao ở B nằm riêng; không ghép profile/giá giữa hai quán |
| D-04 | Offering `off-grill-a` và `off-hotpot-b` | Giá null giữ null; giá group 300000 không tự đổi thành giá/người |
| D-05 | Schedule `schedule-venue-a`/`schedule-rice-a` | Ca qua đêm có offset=1, giờ quán khác giờ món, unknown khác closed |
| D-06 | Cases overnight-valid, offering-end-exclusive, next-day-exception | Expected do người soạn đặt cho 00:30/01:00/ngày đóng cửa; chưa là thuật toán chạy |
| D-07 | Cases seed-replay, unknown-meal, out-of-radius-empty | Cùng seed/input có cùng expected snapshot; meal không có/radius sai giữ pool rỗng |
| D-08 | Template trong seed/templates | Envelope rỗng/draft; không coi là seed được publish |
| D-09 | Chạy test source/freshness/publish | Fixture/thiếu reviewer/source rights/child hết hạn bị chặn ở preflight; không có network/database |

## 4. Thử lỗi có thể khôi phục

Để thấy validator bắt lỗi của file đầu vào, ghi lại giá gốc của `offerings[0].price.min` (45000) trong dataset mẫu. Tạm đổi thành -1 và chạy lại lệnh test task 3. Mong đợi test “complete fixture is structurally valid” báo Fail; lỗi validator có code NUMBER/path `$.offerings[0].price.min`. Đổi lại 45000 rồi chạy lại, mong đợi Pass. Đây là thay đổi file fixture local; không commit giá thử lỗi. Các test negative đã sẵn có nếu bạn không muốn sửa file.

Khi review ghi lại lệnh, Pass/Fail, case ID, expected/actual; không gửi nguồn có token hoặc dữ liệu cá nhân. Contract/alias/units chưa phù hợp thì sửa draft và chạy lại test trước khi GM-05/GM-08/GM-11 dùng. Phản hồi test không tự thay review độc lập/Done. Catalogue 60–80 món và nguồn thật chưa được chứng minh từ 4 món mô phỏng.
