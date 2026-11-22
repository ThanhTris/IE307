# GM-41 — Kiểm catalogue release v1

Đợt bổ sung ngày 2026-11-22 theo [yêu cầu của Trí](https://github.com/ThanhTris/IE307/issues/170#issuecomment-7064323455) và [đặc tả release v1](../../../data/RELEASE_V1_CATALOGUE_SPEC.md). Kiểm từ main `9bfd66f9ab1a1000c05d54a907dd24c3d48f98a5` với phần bổ sung trong working tree. SHA-256 của `dishes.json` là `a15b5dbe4b1982a3bf22bba07de556653b82640474943726e8f5d9db6661b3c3`.

| Tiêu chí | Kết quả bản 1.3.0 |
| --- | --- |
| Tổng ≥250 và giữ 72 UUID | Pass. 253 món, gồm 181 món mới và 72 món từ bản 1.2.0. Tên, alias, ID khảo sát và giá quan sát cũ được giữ. |
| Sáng, trưa, tối ≥60 và ăn vặt ≥80 | Pass. Sáng 68, trưa 100, tối 72 và ăn vặt 114. |
| Mỗi nhóm hiển thị ≥10 | Pass. Sáu nhóm bữa chính có 13–35 món mỗi nhóm. Tám nhóm ăn vặt có 11–22 món mỗi nhóm. |
| Mỗi miền ≥25 | Pass. Bắc 29, Trung 27, Nam 36, Tây 43. Một món có thể có nhiều miền với nguồn phù hợp. |
| Mỗi vị ≥15 | Pass. Cay 21, chua 18, ngọt 48, đậm đà 21, thanh đạm 15, béo 20. Nhãn thanh đạm dựa trên nguồn ghi nêm nhạt hoặc mặn nhẹ của công thức cụ thể. |
| Mọi món có nhóm hiển thị khớp bữa | Pass. Đã bổ sung nhóm bánh mì kẹp cho Burger. Salad, Bánh cuộn và Bánh cuốn có bằng chứng cho bữa ăn nhẹ. |
| Nguồn, giá và nhiệt độ | Pass cấu trúc và nguồn tới từng quan sát mới. 137 món có giá (54%, khuyến nghị ≥80%). Tổng 352 quan sát giá. 36 món có nhiệt độ. |
| Import và readback QA | Pass. 253 thẻ đúng hash và nội dung. Kiểm rollback khi gây lỗi, reimport idempotent và khôi phục release trước. |
| Bốn phòng 20 món | Pass. Mỗi bữa tạo được một phòng với JWT khách thật. Snapshot pin bản 1.3.0, đúng hash, đủ 20 ID khác nhau và mỗi món đúng bữa. |
| Mô tả và ảnh có license | Fail ở cổng phát hành gộp. Có 39/253 mô tả đang chờ xác minh quyền nguồn, 0/253 ảnh hợp lệ. Tâm xử lý ở GM-47. |
| Staging và production | GM-51 gộp và phát hành sau khi GM-41 và GM-47 được nghiệm thu. Lượt này kiểm QA local. |

## Các đợt biên tập

Cả sáu đợt cùng xuất phát từ main `9bfd66f`. Revision của working tree được đối chiếu bằng hash từng CSV trong manifest và evidence QA.

| Đợt | Ngày kiểm | Món mới | Dòng quan sát |
| --- | --- | ---: | ---: |
| 01 | 2026-11-22 | 52 | 70 |
| 02 | 2026-11-22 | 36 | 47 |
| 03 | 2026-11-22 | 34 | 46 |
| 04 | 2026-11-22 | 21 | 38 |
| 05 | 2026-11-22 | 32 | 40 |
| 06 | 2026-11-22 | 6 | 13 |

- [Báo cáo độ phủ sinh lại](../../../data/DISH_FILTER_COVERAGE.md) và [kết quả checker chính thức](RELEASE_V1_FLOOR.json). Lệnh checker trả exit 1 với đúng hai mục GM-47 kể trên. Ngưỡng phát hành giữ nguyên.
- [28 assertions trên QA](QA_RESULTS_RELEASE_V1.json). Python 3.12.14, Node 24.15.0, Supabase CLI 2.120.0, PostgreSQL 17.11, 51 migration qua 0065. Lượt đầu bị chặn bởi publish port wildcard trên Docker Desktop. Lượt cuối áp bind loopback cho container QA riêng và xác nhận binding thật bằng runner gốc. Đã dọn worker, container, volume và network thuộc lượt kiểm.
- Rà HTTP phát hiện URL menu New World cũ, URL công thức phở gà và URL GenK gặp lỗi. Đã thay các nguồn này trước lượt QA cuối. Hai PDF Hyatt đọc được qua bản được lập chỉ mục, còn HTTP trực tiếp từ máy QA trả 403. Các quan sát menu là giá theo nguồn, cần xác nhận lại trước khi dùng như giá hiện tại.
- Kiểm offline đạt với sáu CSV, các bundle 1.1.0/1.2.0/1.3.0, báo cáo độ phủ hiện hành và lịch sử, repository validator, task indexes và `git diff --check`. Bộ Python regression báo 730 test, 6 skip.
- Nguồn truy cập công khai nhằm đối chiếu dữ liệu. Việc mô tả một kiểu chế biến có vị mặn nhẹ chỉ cung cấp nhãn khẩu vị để xếp ưu tiên, không xác nhận giá trị dinh dưỡng, an toàn dị ứng hay việc một quán đang bán. Vị thiếu bằng chứng giữ `null`/`unknown`; giá theo dòng menu có thể là giá lưu trong snapshot.

## Lịch sử bản 1.2.0 ngày 2026-11-20

Main tại `850a6882d88d316330fd6867f8a9822293b0e406`. Bundle 1.2.0 có SHA-256 `57edc91164e953929b3868c8ea9567705af6cba96523b2350219108a69621b78`. Kiểm offline bằng Python 3.12 và kiểm SQL/HTTP qua Supabase CLI 2.120.0, QA local gồm GoTrue, PostgREST, worker và 48 migration tới 0061.

| Yêu cầu | Kết quả |
| --- | --- |
| ≥20 món mỗi bữa, ≥24 món ăn vặt | Pass. Sáng 21, trưa 42, tối 22, ăn vặt 26. |
| Mỗi nhóm ≥3 món, đủ bốn miền đại diện | Pass. 6 nhóm bữa chính có 3–13 món, 8 nhóm ăn vặt có 3–5 món thuộc đúng bữa. Bắc 6, Trung 9, Nam 4, Tây 6. |
| ID, nguồn và cách biểu diễn thiếu | Pass kiểm cấu trúc. 72 món có nhóm family và bữa. Giữ 39 UUID của GM-40, thêm 33. CSV có 83 quan sát biên tập. 22 món có miền, 8 có ít nhất một vị, 65 có giá quan sát. Thiếu thì giữ null/unknown hoặc mảng rỗng. |
| Schema mới và tương thích | Pass. Thêm fatty tùy chọn, validator từ chối kiểu/mức mâu thuẫn và nhãn trùng. Đối chiếu bundle và schema GM-40 1.1.0 không đổi. |
| Sinh lại dữ liệu | Pass. `filter_taxonomy.py --check/--validate`, `dish_catalogue.py --check` (GM-40) và `--gm41 --check`, `dish_filter_coverage.py --check` khớp file và hash. |
| Import và readback | Pass. Kiểm manifest và runtime, thử lỗi giữa transaction và rollback, import rồi đọc lại đúng payload/hash, reimport không nhân đôi, khôi phục release ban đầu. |
| Phòng 10 và 20 món cả bốn bữa trên QA | Pass. 8 phản hồi create và snapshot đều đúng release/hash, số lượng, ID duy nhất và bữa. |
| Ưu tiên khi bắt đầu phòng | Pass. Bún chả khớp nướng dù thuộc cả họ bún. Hủ tiếu khớp miền Tây khi có cả Nam và Tây. Kẹo dừa khớp béo dù còn vị ngọt. Các món không khớp vẫn có thể vào pool. |
| Phòng 10 món trên staging | Not run. GM-51 và GM-52 chưa bàn giao catalogue hosted và staging. Không dùng kết quả local thay kết quả staging. |

[83 assertions QA, input kỳ vọng và kết quả thật](QA_RESULTS.json). Runner đã dọn worker, Supabase và mạng thuộc lần chạy. Không còn container, volume hoặc mạng GM-41. Không đưa thông tin xác thực vào evidence.

[Báo cáo độ phủ](COVERAGE_1_2.md) sinh từ bundle 1.2.0. Mô tả và ảnh có quyền thuộc lượt biên tập GM-47. Mức mặn để trống khi nguồn chưa mô tả mức độ đủ rõ. Nhãn bữa theo menu là thông tin sử dụng làm gợi ý, không xác nhận giờ bán. Review của Trí và kiểm staging còn chờ.
