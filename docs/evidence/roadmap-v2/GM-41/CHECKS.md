# GM-41 — Kết quả kiểm ngày 2026-11-20

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

[Báo cáo độ phủ](../../../data/DISH_FILTER_COVERAGE.md) sinh từ bundle 1.2.0. Mô tả và ảnh có quyền thuộc lượt biên tập GM-47. Mức mặn để trống khi nguồn chưa mô tả mức độ đủ rõ. Nhãn bữa theo menu là thông tin sử dụng làm gợi ý, không xác nhận giờ bán. Review của Trí và kiểm staging còn chờ.
