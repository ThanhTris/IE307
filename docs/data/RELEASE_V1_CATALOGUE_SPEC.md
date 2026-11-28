# Catalogue món cho release v1 — yêu cầu bắt buộc

Chủ dự án Trí chốt ngày 2026-11-21. Đây là **nguồn yêu cầu cao nhất cho dữ liệu món của bản lên Google Play và App Store**. Khi tài liệu khác ghi ngưỡng thấp hơn (ví dụ "mỗi bữa ≥ 20 món" trong [DISH_FILTER_DATA_REQUIREMENTS](DISH_FILTER_DATA_REQUIREMENTS.md)), làm theo tài liệu này. Cách ghi trường, mã và ID vẫn theo DISH_FILTER_DATA_REQUIREMENTS và [filter_taxonomy_v2.json](../../data-preparation/config/filter_taxonomy_v2.json).

Kiểm bằng một lệnh, chạy offline:

```sh
python scripts/release_catalogue_check.py --bundle <đường dẫn dishes.json của bundle>
```

Chỉ khi lệnh trả `Release catalogue floor: PASS` (exit 0) thì catalogue mới đủ để GM-51 phát hành. Ngưỡng trong script và trong tài liệu này phải giống nhau; đổi một bên thì đổi cả hai.

## 1. Ai làm gì

| Task | Người | Phần việc | Trạng thái 2026-11-21 |
| --- | --- | --- | --- |
| [GM-41](../../tasks/backlog/GM-41.md) | Vinh | Thêm món, gắn bữa, nhóm, miền, vị, nhiệt độ, giá, kèm nguồn | Needs Update |
| [GM-47](../../tasks/backlog/GM-47.md) | Tâm | Mô tả và ảnh có quyền dùng cho **mọi** món | Needs Update |
| [GM-51](../../tasks/backlog/GM-51.md) | Tâm | Gộp hai phần trên thành bundle production, import có kiểm soát lên staging và production | In Progress, bị chặn đến khi GM-41 và GM-47 Done |

Trí review cả ba. GM-51 chỉ bắt đầu phát hành khi GM-41 và GM-47 Done lại trên Project #2.

**Làm song song theo đợt.** Vinh giao món mới theo đợt khoảng 50 món: một file CSV biên tập và danh sách `dishId` mới. Tâm nhận từng đợt để làm mô tả và ảnh, không chờ đủ 250 món. Mỗi đợt ghi trong CHECKS của task tương ứng: số món, ngày, commit.

## 2. Ngưỡng số lượng

| Mục | Tối thiểu | Cách đếm |
| --- | ---: | --- |
| Tổng số món | **250** | Mỗi `dishId` đếm một lần |
| Bữa sáng / trưa / tối | **60 mỗi bữa** | `mealSlots` chứa `breakfast` / `lunch` / `dinner` |
| Ăn vặt | **80** | `mealSlots` chứa `snack` |
| Mỗi nhóm bữa chính (6 nhóm) | **10 mỗi nhóm** | Món có bất kỳ family nào của nhóm **và** có ít nhất một bữa chính |
| Mỗi nhóm ăn vặt (8 nhóm) | **10 mỗi nhóm** | Món có bất kỳ family nào của nhóm **và** có `snack` |
| Mỗi miền (Bắc, Trung, Nam, Tây) | **25 mỗi miền** | `cuisineIds` chứa ID miền |
| Mỗi vị (6 vị) | **15 mỗi vị** | Xem bảng vị bên dưới |
| Mô tả | **100% món** | `description` không rỗng |
| Ảnh | **100% món** | Có ảnh hoặc ảnh minh họa có quyền, xem mục 5 |
| Ảnh chụp | **≥ 90% cả bộ và mỗi nhóm hiển thị** | Số món không có ảnh chụp tối đa bằng 10% số món (làm tròn xuống), tính cho cả bộ và từng nhóm trong 6 nhóm bữa chính, 8 nhóm ăn vặt (Trí chốt 2026-11-27) |
| Giá quan sát | Khuyến nghị ≥ 80% món | Ít nhất một `priceReferences` cho món |

Một món được tính cho nhiều bữa, nhiều nhóm, nhiều miền và nhiều vị cùng lúc, miễn mỗi giá trị có nguồn.

| Vị trên màn hình | Điều kiện trong `flavor` |
| --- | --- |
| Cay | `spicy.present = true` |
| Chua / Chua cay | `sour.present = true` |
| Ngọt | `sweet.present = true` |
| Mặn / Đậm đà | `salty.present = true` và `salty.intensity` là `medium` hoặc `high` |
| Thanh đạm | `salty.present = true` và `salty.intensity = low` |
| Béo / Ngậy | `fatty.present = true` |

**Mọi món phải thuộc ít nhất một nhóm hiển thị khớp với bữa của nó.** Món chỉ có bữa chính thì cần một family của 6 nhóm bữa chính; món chỉ có `snack` thì cần một family của 8 nhóm ăn vặt. Bản 1.2.0 đang vi phạm ở Salad, Bánh cuộn, Bánh cuốn (family ăn vặt nhưng không có `snack`) và Burger (family `burger` không thuộc nhóm nào). Sửa bằng cách gắn đúng bữa hoặc family có nguồn, không thêm nhóm mới.

## 3. Trường của mỗi món

| Trường | Bắt buộc | Quy tắc |
| --- | --- | --- |
| `name` | Có | Tên tiếng Việt phổ biến, viết hoa chữ đầu. Không trùng món đã có (so cả `aliases`) |
| `aliases` | Không | Tên gọi khác vùng miền |
| `mealSlots` | Có, ≥ 1 | Chỉ `breakfast` `lunch` `dinner` `snack`. Món ăn được cả bữa chính lẫn ăn vặt thì gắn cả hai |
| `categoryIds` | Có, ≥ 1 | ID family trong `filter_taxonomy_v2.json`; phải rơi vào một nhóm hiển thị đúng bữa (mục 2) |
| `cuisineIds` | Nên có | ID miền; món phổ biến nhiều miền thì gắn nhiều |
| `flavor` | Nên có | Đủ 5 khóa `spicy sour sweet salty fatty`, mỗi khóa `{present, intensity}`; không biết thì `null`/`unknown` |
| `temperature` | Nên có | `hot` `warm` `cold` `ambient`; không biết thì `unknown` |
| `description` | **Có** | Mục 4 |
| `artwork` | **Có** | Mục 5 |
| Giá (`priceReferences`) | Nên có | Giá một dòng menu thật: `value`, `currency`, `unit`, `sourceRef`, `checkedAt`. Không quy ra giá/người |
| `sourceRef` / `fieldSources` | Có | Mỗi giá trị phân loại trỏ tới nguồn thật |

## 4. Mô tả

- Tiếng Việt, 1–2 câu, khoảng 80–220 ký tự, tả món là gì và ăn thế nào.
- **Tự viết lại bằng lời của mình** từ nguồn; không chép nguyên câu của nguồn.
- Không nói về một quán cụ thể, không nói thành phần chắc chắn có hoặc không có, không tuyên bố an toàn dị ứng, ăn chay hay halal.
- Mỗi mô tả có `sourceRef` tới trang đã dùng để viết.
- Nguồn đang ghi `usageRights=unknown` phải được Tâm xác nhận ở GM-51 trước khi bundle sang phạm vi production.

## 5. Ảnh

**100% món có ảnh hoặc ảnh minh họa có quyền** (Trí chốt 2026-11-26, [quyết định trên PR #217](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7181026504)). Mỗi món ưu tiên một ảnh chụp **đúng món đó** (nhìn ra được món). Món chưa tìm được ảnh chụp có quyền thì dùng ảnh minh họa theo nhóm món (xem "Ảnh minh họa theo nhóm" bên dưới). Cả hai loại đều đủ các trường của `artwork`:

| Trường | Yêu cầu |
| --- | --- |
| `url` | Địa chỉ ảnh dùng trong app (xem "Lưu trữ" bên dưới) |
| `usageRights` | `licensed`, `public_domain` hoặc `granted`. Không chấp nhận `unknown`, `denied` |
| `license` | Tên license, ví dụ `CC BY-SA 4.0`, `CC0 1.0`, hoặc `Ảnh nhóm tự chụp` |
| `attribution` | Tên tác giả và nguồn, ví dụ `Ảnh: Nguyễn Văn A / Wikimedia Commons, CC BY-SA 4.0`. Chỉ được để trống khi `public_domain` |
| `sourceRef` | Trang gốc của ảnh (trang file Wikimedia, không phải link ảnh trực tiếp) |

**Được dùng:** CC0, public domain, CC BY, CC BY-SA (giữ ghi công và license), ảnh thành viên nhóm tự chụp (ghi người chụp; lưu xác nhận cho phép dùng trong CHECKS).

**Không được dùng:** ảnh không rõ license; ảnh có điều kiện NC (phi thương mại) hoặc ND (không chỉnh sửa, vì app sẽ cắt và nén); ảnh từ Google Images, Foody, ShopeeFood, GrabFood, trang quán hay mạng xã hội khi chưa có văn bản cho phép; ảnh do AI tạo.

**Không dùng ảnh do AI tạo (bắt buộc, Trí chốt 2026-11-25).** Mọi ảnh chụp trong catalogue phải là ảnh chụp thật của món (ảnh minh họa theo nhóm theo đoạn riêng bên dưới, cũng không được tạo bằng AI): không dùng ảnh do AI tạo, và không dùng ảnh đã chỉnh bằng AI làm đổi món hoặc thêm chi tiết không có thật (cắt, xoay, chỉnh sáng, nén vẫn được). Luật này áp dụng cho mọi ảnh, gồm ảnh Wikimedia, ảnh từ nguồn khác và ảnh nhóm tự chụp. Người kiểm ảnh ghi kết quả vào trường `aiCheck` của từng ảnh chụp trong hồ sơ ảnh của GM-47:

| Trường `aiCheck` | Nội dung |
| --- | --- |
| `cameraExif` | Ảnh gốc có EXIF máy ảnh hay điện thoại không (`true`/`false`) |
| `uploadedAt` | Ngày tải lên nguồn (ngày upload trên Commons, hoặc ngày chụp với ảnh tự chụp) |
| `aiCategory` | Trang nguồn có danh mục hoặc nhãn AI-generated không (với Commons: danh mục và template của file) |
| `verdict` | `real_photo` khi đạt; ảnh không đạt thì không đưa vào bundle |
| `checkedBy`, `checkedAt` | Người kiểm và thời điểm |

Từ chối ảnh thuộc danh mục AI-generated, ảnh không rõ nguồn gốc, ảnh có dấu hiệu AI (chữ méo, vật thể biến dạng, chi tiết lặp bất thường) và khung hình cắt từ video khi không xác minh được người đăng là chủ video. Ảnh không có EXIF thì kiểm thêm người tải lên và trang nguồn; còn nghi ngờ thì thay ảnh khác. Ảnh nhóm tự chụp phải giữ file gốc có EXIF làm bằng chứng trong `permissionEvidence`.

### Ảnh minh họa theo nhóm

- **Giới hạn (Trí chốt 2026-11-27):** tối đa 10% số món (làm tròn xuống) của cả bộ và của mỗi nhóm hiển thị được dùng ảnh minh họa. Kiểm bằng `python scripts/release_catalogue_check.py --bundle <bundle> --require-photo-ratio`. Danh sách và cách bổ sung: [PHOTO_GAP_2026-11-27](../evidence/roadmap-v2/GM-47/PHOTO_GAP_2026-11-27.md).
- **Tìm ảnh:** được dùng Google (lọc Creative Commons) làm công cụ tìm; chỉ nhận ảnh khi trang gốc có license cho phép dùng thương mại và chỉnh sửa, hoặc có văn bản cho phép. Đúng món chưa đủ để được dùng.
- **Khi nào dùng:** chỉ cho món chưa tìm được ảnh chụp có quyền. Ảnh minh họa dùng chung cho các món cùng nhóm. Có ảnh chụp thật thì thay theo UUID món và cập nhật ghi công.
- **Nguồn được phép:** nhóm tự vẽ, icon có sẵn trong app, hoặc nguồn CC0. Không dùng ảnh web chưa có quyền để làm minh họa, không tạo bằng AI. Bộ đầu tiên của GM-47 dựng từ Material Design Icons trong gói `@expo/vector-icons` của app (Apache-2.0), có chữ "MINH HỌA" trên ảnh.
- **Metadata:** đánh dấu là ảnh minh họa, không phải ảnh món, để GM-64 hiển thị đúng: `linkedArtwork[dishId].kind = category_illustration` kèm `groupCode`; `artwork.attribution` bắt đầu bằng "Ảnh minh họa nhóm".
- **Bằng chứng:** thay cho `aiCheck`, hồ sơ minh họa (`manifest.json`) ghi nguồn, tác giả, license, ghi công, kích thước và SHA của từng tệp; license yêu cầu kèm văn bản thì để file license trong gói bàn giao. CHECKS ghi danh sách món đang dùng ảnh minh họa.

**Kỹ thuật:** cạnh ngắn ≥ 600 px, tỉ lệ gần 4:3, xuất WebP hoặc JPEG ≤ 200 KB mỗi ảnh. Ghi tổng dung lượng trong CHECKS.

**Món không tìm được ảnh chụp hợp lệ:** tạm dùng ảnh minh họa theo nhóm và báo Trí danh sách để quyết tự chụp hoặc xin phép. Bản nộp phải đạt giới hạn 10% ở trên (thay quyết định 2026-11-26 là không bắt buộc đủ ảnh chụp). Không đưa vào bundle production món không có ảnh nào.

## 6. Nguồn dữ liệu

Nguồn hợp lệ là trang công khai truy cập lại được: menu quán (ảnh menu hoặc trang menu), trang du lịch của cơ quan nhà nước, báo, sách ẩm thực, Wikipedia (chỉ để đối chiếu, nên có thêm nguồn khác). Mỗi giá trị ghi URL và ngày kiểm.

**Không phải nguồn:** kiến thức của mô hình AI, suy đoán từ tên món, nguồn không mở lại được. AI agent hỗ trợ tìm kiếm và nhập liệu thì mỗi giá trị vẫn phải có URL người kiểm mở lại được. Không có nguồn thì để `null`/`unknown` và **không đưa món đó vào** nếu thiếu `mealSlots` hoặc family.

## 7. Phiên bản và vị trí file

- Giữ nguyên bundle đã merge: 1.1.0 (GM-40), 1.2.0 (`supabase/seed/catalogue/gm41/`), overlay 1.2.1 (GM-47). Không ghi đè các thư mục đó.
- Bundle mới dùng version mới (đề xuất `1.3.0`) đặt ở thư mục mới, ví dụ `supabase/seed/catalogue/release-v1/`, có manifest và SHA-256 như GM-41.
- Giữ UUID của 72 món hiện có. Món mới sinh UUID theo cùng công thức GM-41 (`stable_id('dish', 'gm41:' + registryKey)`); đổi tên hiển thị thì giữ `registryKey`.
- CSV biên tập của đợt mới thêm vào `data-preparation/editorial/`, mỗi dòng một quan sát có `sourceRef`.
- Ảnh không commit vào git. Lưu trữ theo mục 9.

## 8. Điều kiện xong

**GM-41 Done lại khi:**
1. `python scripts/release_catalogue_check.py --bundle <bundle mới>` PASS mọi mục trừ mô tả và ảnh (phần của GM-47).
2. `filter_taxonomy.py --validate` cho CSV mới, `dish_catalogue.py --check` và `dish_filter_coverage.py --check` đạt.
3. Import và readback trên QA đạt; tạo được phòng 20 món cho cả bốn bữa.
4. CHECKS ghi số món từng đợt, kết quả các lệnh trên và commit.

**GM-47 Done lại khi:** cùng lệnh kiểm, chạy kèm `--require-photo-ratio`, PASS mục mô tả, ảnh và tỉ lệ ảnh chụp trên bundle đã gộp; mọi ảnh có bằng chứng license trong CHECKS; CHECKS ghi số ảnh chụp, số món dùng ảnh minh họa và danh sách các món đó; tổng dung lượng ảnh được ghi.

**GM-51 phát hành khi:** lệnh kiểm PASS **toàn bộ** trên bundle production (không còn `test_demo`), quyền dùng nguồn mô tả đã xác nhận, readback trên staging khớp hash và số món.

## 9. Quyết định của Trí (2026-11-23)

- **Lưu trữ ảnh: đã chốt.** Bucket công khai trên Supabase Storage của từng môi trường. Trí thiết lập bucket qua GM-52 (staging và production); Tâm bàn giao tệp ảnh và gắn `url` theo UUID món. Khoảng 250 ảnh × 200 KB ≈ 50 MB, nằm trong gói miễn phí. Không trỏ thẳng ảnh Wikimedia vì có thể đổi hoặc chặn. Mỗi món có ảnh hoặc ảnh minh họa theo mục 5, đủ chất lượng, kèm một bản nhỏ cho danh sách (GM-47, GM-64).
- **Hiển thị ghi công trong app: đã chốt.** Thêm màn "Nguồn ảnh" trong Hồ sơ liệt kê tên món, tác giả, license và nguồn của mọi ảnh; giữ ghi công sẵn có ở màn món thắng (WinnerCelebration). Người làm: Tuấn, trong [GM-64](../../tasks/backlog/GM-64.md). Không hiện ghi công trên thẻ bầu chọn.
- **Phân việc ảnh:** Tâm giữ danh sách món thiếu ảnh và kiểm ảnh đúng món, tác giả, license; việc tìm hoặc chụp chia theo 6 lô bàn giao của Vinh trong `data-preparation/editorial/release-v1/`. Món không tìm được ảnh chụp hợp lệ thì dùng ảnh minh họa theo nhóm và báo Trí danh sách (thay cách xử lý "chụp riêng hay bỏ món" trước đây, quyết định 2026-11-26); không dùng ảnh không rõ license.

## 10. AI agent không được làm

- Không tự tạo món, nhãn, giá, mô tả hay ảnh khi không có nguồn để đủ số lượng. Không tạo hay đề xuất ảnh món bằng AI.
- Không hạ ngưỡng trong `scripts/release_catalogue_check.py` để qua kiểm tra; đổi ngưỡng cần Trí xác nhận và sửa cả tài liệu này.
- Không sửa bundle hay manifest đã merge, không import vào DB ứng dụng hay production; chỉ QA cô lập theo runbook GM-03.
- Không tự chuyển GM-41, GM-47 hay GM-51 sang Done.
