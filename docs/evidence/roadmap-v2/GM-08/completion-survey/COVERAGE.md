# GM-08 — Phiếu xác minh vùng khảo sát và anchor

Pending. Không tự dùng ranh giới hành chính hoặc bounding box của quán như vùng đã khảo sát.
Danh sách21chi nhánh/tọa độ quan sát nằm trong coverage-survey.json, gắn candidate hash hiện tại.

## Cần ghi nhận thật

- Polygon GeoJSON [lng,lat] của phạm vi nhóm đã khảo sát, ngày khảo sát và người thu thập.
- Nguồn geometry và căn cứ quyền sử dụng/attribution, hash file evidence.
- Xác nhận từng venue nằm trong polygon; không claim toàn bộ quán trong vùng đã khảo sát.
- Anchor công cộng: name/lat/lng, evidence địa điểm và quyền dùng tọa độ, nằm trong polygon.
- Anchor do nhóm lựa chọn/xác nhận; không dùng GPS cá nhân hoặc địa chỉ nhà.
- Freshness/validUntil theo policy được chốt, người review khác người nhập.

## Loại nguồn ranh giới nhầm

[OSM relation7138136](https://api.openstreetmap.org/api/0.6/relation/7138136.json)
version39 hiện có tên Phường Thủ Đức; lịch sử ban đầu là Phường Bình Thọ. Không dùng
đối tượng này như toàn quận Thủ Đức cũ. Evidence: ../completion-coverage-source-check.json.
[ODbL/attribution](https://www.openstreetmap.org/copyright) chỉ áp dụng dữ liệu OSM,
không cấp quyền với menu/ảnh hoặc xác minh phạm vi khảo sát.

Sau khi điền evidence, chuyển theo coverageAreas/publicAnchors của food1.1.0,
validate/stage bundle mới và review độc lập. Chưa có polygon/anchor được nghiệm thu.
