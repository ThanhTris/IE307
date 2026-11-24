# GM-47 · Kiểm thử

## Lô release v1 ngày 24/11/2026

Nhánh `codex/gm-47-release-editorial` dựa trên `origin/main` tại `2ef58d3` và [GM-41 #210](https://github.com/ThanhTris/IE307/pull/210). Live start gate trả `READY_TO_CLAIM` lúc 10:37 ICT. Áp dụng yêu cầu ảnh danh sách, Storage và ghi công từ #214 và #215.

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Baseline 1.3.0 và biên tập mô tả | Pass. Dựng lại GM-41 khớp artifact đã merge. 253/253 mô tả dài 101–145 ký tự, khớp UUID và có URL/evidence. Gộp 72 UUID đã soạn và 181 UUID mới. |
| Projection offline | Pass. Cùng 253 ID, chỉ trường mô tả trên card thay đổi, projection thử qua schema poolDish B-supplement đạt. Chưa chạy room/API. |
| Ảnh chính và ảnh danh sách | 52 cặp WebP, gồm 52 ảnh nhỏ 400×300 px. Đối chiếu cả 104 SHA, kích thước và định dạng trong ZIP. Ảnh chính 5.083.210 byte, ảnh nhỏ 935.464 byte. [Hồ sơ ảnh](../../../../data-preparation/editorial/gm47-release/artwork-candidates.json). |
| Danh sách chia lô | 201 UUID duy nhất chưa có ảnh, tách nhóm baseline và sáu lô GM-41. ZIP chứa `artwork-assignments.csv`. |
| Release catalogue checker | 32/33 mục Pass, gồm mô tả 253/253. Mục ảnh Fail 0/253 trong bundle vì ảnh chưa được tải lên bucket và gắn URL. |
| PostgreSQL import/readback | Pass trên PostgreSQL 17.11 cô lập, không mở mạng/cổng. Dùng DDL catalogue từ migration 0026 và helper UUID từ 0019. Cùng SQL importer đọc lại đúng 253 thẻ và hash, chạy lại không tạo bản trùng, giữ nguyên bản active. [Kết quả SQL](qa-sql-readback-1.4.0.json). |
| Supabase GM-03 QA | Not run cho 1.4.0. Run macOS trước đó dừng ở `QA_HOST_BINDING_NOT_LOOPBACK` và đã dọn môi trường. Workflow Linux chạy khi mở PR, còn cần kiểm lại trên bundle gắn ảnh. |
| Quyền dùng nguồn và ghi công | GM-52 phụ trách bucket, GM-64 phụ trách màn Nguồn ảnh. Quyền dùng nguồn mô tả cho production vẫn cần xác nhận. |

Candidate `1.4.0`, `test_demo`, SHA-256 `b92534ad67f996e7d2d40424eac33ea7850ab8ed8f5ab844441466a48f23c95d`. 6 ca riêng GM-47 pass. Validator repo, task indexes và diff đạt.

## Lô ngày 20/11/2026

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `origin/main` tại `10651dd`; GM-40 đã Done và đầu ra đã có.

| Ca | Kỳ vọng và bằng chứng | Kết quả |
| --- | --- | --- |
| Mô tả theo UUID | 5 mô tả có nguồn riêng, các UUID, taxonomy, ảnh null và giá giữ đúng GM-41 | Pass. Test overlay, schema và kiểm baseline hash. |
| Quyền ảnh | Ảnh chỉ có khi có bằng chứng đúng món, tác giả, license và ghi công | 0 ảnh chọn. 7 món còn ứng viên cần dò ảnh gốc, 29 lỗi nguồn, 36 thiếu ứng viên. |
| Độ phủ theo bữa | Báo cáo bundle 1.2.1 có 72 món và số ảnh từng bữa | Pass offline, xem hồ sơ Data. |
| Readback QA | 72 cards, chỉ 5 mô tả khác, hash khớp, trạng thái test-only và bản active giữ nguyên | Pass trên Supabase QA cô lập (Ubuntu). [JSON readback](qa-readback.json), [Actions](https://github.com/ThanhTris/IE307/actions/runs/44774484392). |

Actions chạy trên merge ref `1a4df7f` của base `10651dd` và head `af685b6`. Bản cập nhật hồ sơ sau đó chỉ thay evidence và không đổi code hoặc input đã kiểm. Lần chạy macOS dừng ở bước xác minh cổng loopback và đã cleanup.

`python -m unittest discover -s tests -p 'test_gm47_catalogue.py'` chạy 2 ca đạt. Regression cục bộ chạy 722 ca, gồm 6 ca skip theo môi trường. [CI toàn repo](https://github.com/ThanhTris/IE307/actions/runs/44774485063) và [Handoff](HANDOFF.md).
