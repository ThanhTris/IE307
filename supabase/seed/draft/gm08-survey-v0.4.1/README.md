# GM-08 — Fresh pilot 0.4.1, hồ sơ chờ xác minh

Ngày thu thập: 2026-10-11, 11:26–11:28 Asia/Ho_Chi_Minh. User chốt phạm vi
Thủ Đức cũ và yêu cầu dùng lại crawler. User xác nhận chưa có căn cứ quyền dùng
nguồn/chính sách freshness; chuẩn bị hồ sơ để review, không tự xác nhận quyền.

## Kết quả thực tế

- Crawler cũ: 27 public HTML nguồn được lấy mới, 23 đọc được menu; 4 ShopeeFood
  cần render/adapter thêm, không được coi là không có món. 694 mục raw, 252 candidate,
  253 needs_review, 189 excluded. Không gọi GPT, login hoặc tải ảnh.
- Đối chiếu: cả 247 mục lịch sử vẫn xuất hiện, cùng tên/chi nhánh/giá/tọa độ/giờ
  nền tảng. 447 raw khác chưa gán vào catalogue hiện hành. Trong đó 5 candidate mới
  phải được map/review; không sinh dish ID hoặc mượn mapping để ép đủ số.
- Pilot: 18 dish ID cũ, 21 chi nhánh, 190 offering, 154 lịch chi nhánh, 27 source,
  18 taxonomy, 1 dataset. Quota đạt nhưng toàn bộ record vẫn draft.
- Validate/FK: Pass. Staging: Pass. Pending review bị chặn trước DB: Pass.
  Publish/query dataset verified: Not run. Verified manifest counts vẫn 0.

Selection tham lam phủ chi nhánh, rồi số chi nhánh/UUID ổn định. Không tự nghiệm
thu classification của 18 món. Catalogue đầy đủ 39 món/247 offering còn nguyên ở
draft 0.4.0; bản lịch sử 0.3.0/snapshot GM-04 không đổi.

## Hồ sơ để kiểm

| File | Mục đích |
| --- | --- |
| [bundle.json](bundle.json) | Candidate food1.1.0/schema0.1.0; không fixture, chưa verified |
| [audit.json](audit.json) | Counts/hash/FK và 1735 lỗi publish về các dữ kiện/review còn thiếu |
| [source-records.json](source-records.json) | Nguồn theo chi nhánh/offering, thời gian/hash, raw chưa map, pilot selection |
| [capture-manifest.json](capture-manifest.json) | URL/hash/bytes/ngày lấy 27 HTML thực tế |
| [quality_report.json](quality_report.json) | Report thật của crawler; không là approval |
| [output_checksums.json](output_checksums.json) | Hash CSV đầu ra crawler |
| [survey-input-template.json](survey-input-template.json) | Worksheet Pending cho 21 quán/190 offering/18 classification/27 rights |
| [supplemental-source-checks.json](supplemental-source-checks.json) | Đối chiếu nguồn chính thức và các điểm cần giải quyết |
| [SOURCE_RIGHTS_AND_FRESHNESS.md](SOURCE_RIGHTS_AND_FRESHNESS.md) | Policy/mẫu xin xác nhận, chưa được duyệt hoặc gửi |

Raw HTML/CSV/executed notebook lưu riêng ở Git-ignored
`data-preparation/datasets/gm08-capture-20261011/`. Không đưa cache lên PR.
Reviewer trên máy này có thể đối chiếu bytes với manifest; clone sạch có thể
cào lại vào directory mới. Cào lại có thể thay đổi bytes/giá/menu, không được
coi là tái tạo approval cho hash cũ. Source-records chứa factual extracts để
đối chiếu; manifest/hash không thay review nội dung và quyền sử dụng.

## Dữ kiện cần bổ sung trước publish

1. Kiểm physical venue/serviceModes/địa chỉ/tọa độ/adminAreaId và lịch đủ 7 ngày.
   Lịch trong bundle chỉ là giờ nền tảng. Jollibee 255 Võ Văn Ngân có giờ mở khác
   nguồn chính thức; cần xác nhận riêng. Thiếu 1 weekday giữ unknown.
2. Kiểm riêng giờ bán và serviceMode của 190 offering, giá theo đúng variant/unit.
   Nếu món bán suốt giờ quán, phải có bằng chứng khẳng định điều đó cho đúng món,
   không tự nhân lịch quán. Không suy per_person, 24h, sold_out hoặc lastOrder.
3. Ghi polygon vùng khảo sát và anchor công cộng có evidence, quyền dùng tọa độ,
   kiểm venue/anchor nằm trong polygon. Không lấy bounding box của 21 quán làm
   coverage verified; không dùng GPS cá nhân.
4. Chốt quyền dùng nguồn và policy trong hồ sơ bên dưới; validUntil/reviewedBy
   vẫn null. Kiểm phân loại món, source theo nhóm field và ngoại lệ thực tế.
5. Bổ sung bundle theo contract rồi validate/stage mới. Reviewer khác người nhập
   kiểm đúng hash, record/evidence thực và ký Approved. Review-template hiện Pending.
6. Sau đó chạy publish/query/idempotency/rollback trên DB local, lưu receipt và
   assertions thực, cập nhật manifest verified/HANDOFF/AC. Trí mới nghiệm thu Done.

Worksheet là phiếu thu thập, không phải bundle import và không phải approval.

## Tái chạy từ repo root

Python có pandas/lxml theo môi trường crawler đã tài liệu hóa; giữ TLS verified.
Directory capture/output/stage phải mới:

```sh
SSL_CERT_FILE=/etc/ssl/cert.pem python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_thu_duc_menus.ipynb --refresh --output-dir /tmp/gm08-capture-new
python3 scripts/gm08_prepare_survey.py --capture-dir /tmp/gm08-capture-new --pilot-dishes 18 --output-dir /tmp/gm08-pilot-new
python3 supabase/seed/import_food_data.py validate --input /tmp/gm08-pilot-new/bundle.json --report /tmp/gm08-pilot-preflight.json
python3 supabase/seed/import_food_data.py stage --input /tmp/gm08-pilot-new/bundle.json --output /tmp/gm08-stage-new
python3 -m unittest discover -s tests -p 'test_gm08_survey.py' -v
```

Adapter chỉ offline; kiểm CSV/hash/HTML bytes và nguồn/ngày lấy. Raw item mới,
đổi tên/chi nhánh/ID hoặc classifier cần review bị giữ lại, không dùng ngày mới
cho dữ liệu cũ mất khỏi nguồn. Ngày các field biên tập của dishes vẫn giữ nguyên.
Publish/query/rollback theo [seed README](../../README.md); không vượt review gate.
