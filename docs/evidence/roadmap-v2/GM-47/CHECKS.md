# GM-47 · Kiểm thử

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `origin/main` tại `10651dd`; GM-40 đã Done và đầu ra đã có.

| Ca | Kỳ vọng và bằng chứng | Kết quả |
| --- | --- | --- |
| Mô tả theo UUID | 5 mô tả có nguồn riêng, các UUID, taxonomy, ảnh null và giá giữ đúng GM-41 | Pass. Test overlay, schema và kiểm baseline hash. |
| Quyền ảnh | Ảnh chỉ có khi có bằng chứng đúng món, tác giả, license và ghi công | 0 ảnh chọn. 7 món còn ứng viên cần dò ảnh gốc, 29 lỗi nguồn, 36 thiếu ứng viên. |
| Độ phủ theo bữa | Báo cáo bundle 1.2.1 có 72 món và số ảnh từng bữa | Pass offline, xem hồ sơ Data. |
| Readback QA | 72 cards, chỉ 5 mô tả khác, hash khớp, trạng thái test-only và bản active giữ nguyên | QA macOS dừng tại `QA_HOST_BINDING_NOT_LOOPBACK` và đã cleanup. Chờ kết quả job GM-47 trên GitHub Actions. |

`python -m unittest discover -s tests -p 'test_gm47_catalogue.py'` chạy 2 ca đạt. [Handoff](HANDOFF.md)
