# GM-47 · Kiểm thử

## Lô release v1 ngày 24/11/2026

Nhánh `codex/gm-47-release-editorial` đã cập nhật theo `origin/main` tại `d9332f7` và giữ [GM-41 #210](https://github.com/ThanhTris/IE307/pull/210) làm đầu vào dữ liệu. Checker merge trả `READY_FOR_MERGE_REVIEW` lúc 23:28 ICT cho dependency và artifact. Các AC còn thiếu được ghi theo [review của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7133694276).

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Baseline 1.3.0 và biên tập mô tả | Pass. Dựng lại GM-41 khớp artifact đã merge. 253/253 mô tả dài 101–145 ký tự, khớp UUID và có URL/evidence. Gộp 72 UUID đã soạn và 181 UUID mới. |
| Projection offline | Pass. Cùng 253 ID, chỉ trường mô tả trên card thay đổi, projection thử qua schema poolDish B-supplement đạt. Chưa chạy room/API. |
| Ảnh chính và ảnh danh sách | 63 cặp WebP, tăng 11 món. 126 tệp đối chiếu định dạng, kích thước và SHA. Ảnh chính 6.127.352 byte, ảnh nhỏ 400×300 px 1.137.086 byte. [Hồ sơ ảnh](../../../../data-preparation/editorial/gm47-release/artwork-candidates.json). |
| Danh sách chia lô | 190 UUID chưa có ảnh, tách nhóm baseline và sáu lô GM-41. ZIP chứa `artwork-assignments.csv`. |
| Release catalogue checker | 32/33 mục Pass, gồm mô tả 253/253. Mục ảnh Fail 0/253 trong bundle vì ảnh chưa được tải lên bucket và gắn URL. |
| PostgreSQL import/readback | Pass trên PostgreSQL 17.11 cô lập, không mở mạng/cổng. Dùng DDL catalogue từ migration 0026 và helper UUID từ 0019. Cùng SQL importer đọc lại đúng 253 thẻ và hash, chạy lại không tạo bản trùng, giữ nguyên bản active. [Kết quả SQL](qa-sql-readback-1.4.0.json). |
| Supabase GM-03 QA | Pass với candidate 1.4.0 chưa gắn ảnh, đúng 253 thẻ và hash, giữ nguyên bản active. [Evidence JSON](qa-supabase-readback-1.4.0.json) và [lượt CI đầu của PR #217](https://github.com/ThanhTris/IE307/actions/runs/45330545230). Còn lượt kiểm trên bản đã gắn ảnh. |
| Kiểm receipt và gắn URL | Unit với bucket giả lập pass. Gắn đúng một cặp đã khớp hash, lưu URL nhỏ riêng, từ chối SHA sai. Phép kiểm công khai trên bucket thật chờ Trí cung cấp URL và xác nhận upload. |
| Quyền dùng nguồn và ghi công | Báo cáo `description-rights-review.csv` gom 183 URL và 253 UUID để xác nhận quyền dùng. Hiện 183 nguồn cần xác nhận, chưa có nguồn được đánh dấu duyệt production. Ưu tiên rà 98 mô tả có nguồn VnExpress/Ngôi Sao, 34 mô tả Vietnam Tourism và 23 mô tả từ beFood. Nếu không có căn cứ dùng, thay nguồn và viết lại các UUID liên quan. [Điều khoản VnExpress](https://vnexpress.net/dieu-khoan-su-dung) · [Điều khoản Vietnam Tourism](https://vietnam.travel/term-conditions/) |

Candidate `1.4.0`, `test_demo`, SHA-256 `b92534ad67f996e7d2d40424eac33ea7850ab8ed8f5ab844441466a48f23c95d`. 7 ca riêng GM-47 pass. Validator repo, task indexes và diff đạt.

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
