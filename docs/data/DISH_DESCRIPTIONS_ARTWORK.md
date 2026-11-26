# GM-47 · Mô tả và ảnh catalogue

## Lô release v1 ngày 25/11/2026

Candidate QA `1.4.4` nhận 253 UUID từ [GM-41 v1.3.0](https://github.com/ThanhTris/IE307/pull/210). Yêu cầu phát hành theo [đặc tả release v1](RELEASE_V1_CATALOGUE_SPEC.md).

- Tâm đã xác nhận 253/253 mô tả tự viết và 188/188 URL tham khảo dữ kiện. [Mô tả theo UUID](../../data-preparation/editorial/gm47-release/descriptions.json)
- Tâm đã xác nhận 136 cặp WebP từ Commons. Ảnh chính có cạnh ngắn 600–750 px và tối đa 200.000 byte mỗi tệp. Ảnh nhỏ 400×300 px. Gói ảnh có 272 tệp WebP, tổng 16.914.034 byte ảnh. [Hồ sơ ảnh theo UUID](../../data-preparation/editorial/gm47-release/artwork-candidates.json)
- 117 món đang thiếu ảnh thật đã được gán minh họa có giấy phép theo 14 nhóm cho bản nộp đầu. Tiếp tục tìm nguồn mở hoặc tự chụp theo lô. [Danh sách phân công](../evidence/roadmap-v2/GM-47/PHOTO_ASSIGNMENTS.md) · [Quyết định của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7181026504)
- Trí phụ trách bucket staging và upload theo GM-52. Tâm tạo receipt từ ảnh đã tải, kiểm SHA-256 trước khi gắn URL. Tuấn nhận ảnh nhỏ và ghi công cho [GM-64](https://github.com/ThanhTris/IE307/issues/213). [Bàn giao](../evidence/roadmap-v2/GM-47/HANDOFF.md)

| Bữa | Món | Có mô tả | Có cặp WebP đã xác nhận | Có URL trong bundle QA |
| --- | ---: | ---: | ---: | ---: |
| Sáng | 68 | 68 | 47 | 0 |
| Trưa | 100 | 100 | 52 | 0 |
| Tối | 72 | 72 | 38 | 0 |
| Ăn vặt | 114 | 114 | 68 | 0 |

Một món có thể thuộc nhiều bữa. [Kết quả kiểm](../evidence/roadmap-v2/GM-47/CHECKS.md)

## Lô ngày 20/11/2026

Overlay dùng UUID của GM-41, bundle 1.2.0 SHA `57edc91164e953929b3868c8ea9567705af6cba96523b2350219108a69621b78`. Bản 1.2.1 dựng ra để đưa vào QA. Nó vẫn có phạm vi `test_demo`. Bản 1.1.0 và bản GM-41 đã ghim tiếp tục dùng được. [Dữ liệu overlay](../../data-preparation/editorial/gm47/descriptions.json)

| Món | UUID món | sourceRef mô tả |
| --- | --- | --- |
| Bún mọc | `4a8ac4a8-b566-5032-be38-48f00e6a53b9` | `59ac163c-fdda-577b-8499-e9f8c45da8b8` |
| Cơm canh khổ qua | `f9224f9d-f9e2-5b4b-a328-0db75c978c2a` | `b6024c8c-4297-5013-9162-d91f7f30cd65` |
| Cơm cá kho | `f518af1a-6744-545a-83b4-4fa14d590a43` | `83fa8765-b974-5be5-bbb5-e032a691bec0` |
| Cơm tôm rim | `e0a99abc-3bb4-54e5-85ea-0361df2098b7` | `22f12678-4af8-5d08-8815-28ab077021e8` |
| Cơm đậu hủ sốt cà | `9cbc5485-896f-5725-bc54-c7d637f54770` | `b91b4173-84a7-529b-8f9e-bae08f29f5d1` |

Mỗi mô tả được viết riêng từ thông tin thực tế và có URL cùng ghi chú bằng chứng. Nguồn tham khảo có `usageRights=unknown`. Cần đối chiếu quyền sử dụng dữ liệu khi chuyển sang phạm vi production ở GM-51. Mô tả không xác nhận nguyên liệu của quán cụ thể, dị ứng, lịch bán hoặc giá.

## Quyết định về ảnh

Dùng danh sách ứng viên đã thu trước đây. Có 7 món có ứng viên chưa kiểm được ảnh gốc, 29 món lưu lỗi truy cập nguồn và 36 món không có ứng viên lưu. Hồ sơ cũ ghi trang tệp trả 403 và một ảnh gốc trả 429. Giữ `artwork=null` cho 72 món và dừng với các nguồn bị giới hạn. Điều kiện chọn ảnh là đối chiếu đúng món và có tác giả, license, ghi công và bằng chứng kiểm. [Ứng viên editorial](../../data-preparation/config/editorial_image_candidates_v1.json)

| Bữa | Số món | Có mô tả | Có ảnh |
| --- | ---: | ---: | ---: |
| Sáng | 21 | 16 | 0 |
| Trưa | 42 | 34 | 0 |
| Tối | 22 | 16 | 0 |
| Ăn vặt | 26 | 3 | 0 |

Một món có thể thuộc nhiều bữa. [Cách dựng và đọc lại bản QA](../evidence/roadmap-v2/GM-47/HANDOFF.md)
