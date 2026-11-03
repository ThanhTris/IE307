# GM-13.2 — đối chiếu thiết kế và phạm vi kiểm

Nguồn: [audit ảnh local](figma-update/INPUT_AUDIT.md), PNG user cung cấp.
Node gốc330:3075, podium379:1401, ties617:1671, badge617:1428,
Places379:1478 và location622:8962 là mapping task đã bàn giao; MCP
không có quyền file gốc trong lượt này, không ghi đã xác minh live lại.

| Frame/state | Route/fixture | Implementation và kiểm tự động | Kết quả thiết bị theo từng state |
| --- | --- | --- | --- |
| Vinh danh | /room/result mặc định, QA Xem lại vinh danh | WinnerCelebration, medal/ảnh/điểm, explicit dismissal, một lần/result, Reduce Motion config | Chưa có kết quả riêng từng state |
| Top3/1/2 | top3/one/two | Responsive podium, ảnh/null, tên/điểm, winner badge, input immutable | Chưa có kết quả riêng từng state |
| Đồng hạng | tie-two/first/last/all |1–1,1–1–2,1–2–2,1–1–1; bằng hạng bằng chiều cao | Chưa có kết quả riêng từng state |
| Đang chốt/tải | finalizing/loading | Không winner/podium/Places, không timer finalize | Chưa có kết quả riêng từng state |
| Lỗi/chưa xác nhận | error/unknown/invalid | Retry callback, không suy NO_CONSENSUS | Chưa có kết quả riêng từng state |
| R1 hết giao | /room/no-consensus, empty-r1 | EMPTY_INTERSECTION, winner null/top[], không mở R2 | Chưa có kết quả riêng từng state |
| R2 loại hết | removed-r2 | ALL_REMOVED, không R3, không lộ người NO | Chưa có kết quả riêng từng state |
| Map/card/quán | Quán Có quán mẫu | Map illustration/mock hoặc injected renderer, public selected place/attribution | Chưa có kết quả riêng từng state |
| Places loading/empty/error | Quán Đang tìm/Không có/Lỗi tải | Loading khác empty; retry không đổi winner | Chưa có kết quả riêng từng state |
| Vị trí | permission/denied/blocked/location-off | Request/settings qua callback sau winner, không gọi GPS tự động | Chưa có kết quả riêng từng state |
| Offline/unsupported/cache | Quán tương ứng, cached bằng component input | Guard capability, nhãn dữ liệu cũ, error giữ kết quả | Chưa có kết quả riêng từng state |
| Null/legacy | missing/legacy | Placeholder ảnh, giá không đủ thì ẩn, legacy không dựng điểm/Top3 | Chưa có kết quả riêng từng state |
| Home/Tạo phòng mới | Footer/đóng/Back | Home; create-entry GM-09/10; không mang phiếu/cancel thật | Chưa có kết quả riêng từng state |

Người dùng báo kiểm Expo xong trên Android13; xem [DEVICE_CHECKS](figma-update/DEVICE_CHECKS.md). Bảng trên không tự suy từng state đã Pass từ xác nhận tổng quát. Unit/component/router kiểm output và callbacks riêng. PNG pixel checks kiểm
alpha/ink/dimensions/provenance, không thay đo rendered geometry trên Expo.
Tham chiếu gốc/crops local ignored; không commit ảnh người dùng hoặc dùng
whole screenshot làm UI. Asset dùng app được tách nhỏ, xem
mobile/assets/brand/result/SOURCE.md và [source manifest](figma-update/SOURCE_MANIFEST.json).

Sai khác có chủ đích và phần bổ sung theo yêu cầu: sửa mẫu2 món cùng điểm
nhưng khác hạng; badge không bị che; số hạng dark brand để đủ tương phản;
null/legacy/permission/error/cached states; nhãn mô phỏng và QA development
gọn. Không thay luật quyết định hoặc dữ liệu producer để khớp mẫu.

Kiểm device, screenshot cùng viewport412dp/320/360dp, font200%, TalkBack,
Dark và Reduce Motion sau sửa: chưa có kết quả chi tiết. Người dùng cho biết có chế độ tối và chữ hiện tại nhìn rõ; không biết fontScale, chưa xác nhận TalkBack. Trí chưa approve revision này.
[HANDOFF](figma-update/HANDOFF.md) và [CHECKS](figma-update/CHECKS.md) ghi
cách mở, fixtures, source revision và giới hạn integration.

Bàn giao hiện hành: [FINAL_HANDOFF](figma-update/FINAL_HANDOFF.md), [CONSUMER_GUIDE](figma-update/CONSUMER_GUIDE.md), [FINAL_CHECKS](figma-update/FINAL_CHECKS.md). Viền chỉ theo isWinner; phần quán ghi tên món đã chốt. Ảnh lỗi đầu vào không là ảnh nghiệm thu sau sửa.
