# GM-47 · Kiểm thử

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `origin/main` tại `10651dd`; GM-40 đã Done và đầu ra đã có.

| Ca | Kỳ vọng và bằng chứng | Kết quả |
| --- | --- | --- |
| Mô tả theo UUID | 5 mô tả có nguồn riêng, các UUID, taxonomy, ảnh null và giá giữ đúng GM-41 | Pass. Test overlay, schema và kiểm baseline hash. |
| Quyền ảnh | Ảnh chỉ có khi có bằng chứng đúng món, tác giả, license và ghi công | 0 ảnh chọn. 7 món còn ứng viên cần dò ảnh gốc, 29 lỗi nguồn, 36 thiếu ứng viên. |
| Độ phủ theo bữa | Báo cáo bundle 1.2.1 có 72 món và số ảnh từng bữa | Pass offline, xem hồ sơ Data. |
| Readback QA | 72 cards, chỉ 5 mô tả khác, hash khớp, trạng thái test-only và bản active giữ nguyên | Pass trên Supabase QA cô lập (Ubuntu). [JSON readback](qa-readback.json), [Actions](https://github.com/ThanhTris/IE307/actions/runs/44774484392). |

Actions chạy trên merge ref `1a4df7f` của base `10651dd` và head `af685b6`. Bản cập nhật hồ sơ sau đó chỉ thay evidence và không đổi code hoặc input đã kiểm. Lần chạy macOS dừng ở bước xác minh cổng loopback và đã cleanup.

`python -m unittest discover -s tests -p 'test_gm47_catalogue.py'` chạy 2 ca đạt. Regression cục bộ chạy 722 ca, gồm 6 ca skip theo môi trường. [CI toàn repo](https://github.com/ThanhTris/IE307/actions/runs/44774485063) và [Handoff](HANDOFF.md).
