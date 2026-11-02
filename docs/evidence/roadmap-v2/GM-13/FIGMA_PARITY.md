# GM-13.2 — đối chiếu thiết kế và phạm vi kiểm

Nguồn: [audit ảnh local](figma-update/INPUT_AUDIT.md), PNG user cung cấp.
Node gốc330:3075, podium379:1401, ties617:1671, badge617:1428,
Places379:1478 và location622:8962 là mapping task đã bàn giao; MCP
không có quyền file gốc trong lượt này, không ghi đã xác minh live lại.

| Frame/state | Route/fixture | Implementation và kiểm tự động | Android/visual actual |
| --- | --- | --- | --- |
| Vinh danh | /room/result mặc định, QA Xem lại vinh danh | WinnerCelebration, medal/ảnh/điểm, explicit dismissal, một lần/result, Reduce Motion config | Not run |
| Top3/1/2 | top3/one/two | Responsive podium, ảnh/null, tên/điểm, winner badge, input immutable | Not run |
| Đồng hạng | tie-two/first/last/all |1–1,1–1–2,1–2–2,1–1–1; bằng hạng bằng chiều cao | Not run |
| Đang chốt/tải | finalizing/loading | Không winner/podium/Places, không timer finalize | Not run |
| Lỗi/chưa xác nhận | error/unknown/invalid | Retry callback, không suy NO_CONSENSUS | Not run |
| R1 hết giao | /room/no-consensus, empty-r1 | EMPTY_INTERSECTION, winner null/top[], không mở R2 | Not run |
| R2 loại hết | removed-r2 | ALL_REMOVED, không R3, không lộ người NO | Not run |
| Map/card/quán | Quán Có quán mẫu | Map illustration/mock hoặc injected renderer, public selected place/attribution | Not run |
| Places loading/empty/error | Quán Đang tìm/Không có/Lỗi tải | Loading khác empty; retry không đổi winner | Not run |
| Vị trí | permission/denied/blocked/location-off | Request/settings qua callback sau winner, không gọi GPS tự động | Not run |
| Offline/unsupported/cache | Quán tương ứng, cached bằng component input | Guard capability, nhãn dữ liệu cũ, error giữ kết quả | Not run |
| Null/legacy | missing/legacy | Placeholder ảnh, giá không đủ thì ẩn, legacy không dựng điểm/Top3 | Not run |
| Home/Tạo phòng mới | Footer/đóng/Back | Home; create-entry GM-09/10; không mang phiếu/cancel thật | Not run |

Chỉ unit/component/router kiểm output và callbacks. PNG pixel checks kiểm
alpha/ink/dimensions/provenance, không thay đo rendered geometry trên Expo.
Tham chiếu gốc/crops local ignored; không commit ảnh người dùng hoặc dùng
whole screenshot làm UI. Asset dùng app được tách nhỏ, xem
mobile/assets/brand/result/SOURCE.md và [source manifest](figma-update/SOURCE_MANIFEST.json).

Sai khác có chủ đích và phần bổ sung theo yêu cầu: sửa mẫu2 món cùng điểm
nhưng khác hạng; badge không bị che; số hạng dark brand để đủ tương phản;
null/legacy/permission/error/cached states; nhãn mô phỏng và QA development
gọn. Không thay luật quyết định hoặc dữ liệu producer để khớp mẫu.

Kiểm device, screenshot cùng viewport412dp/320/360dp, font200%, TalkBack,
Dark và Reduce Motion sau sửa: Not run. Trí chưa approve revision này.
[HANDOFF](figma-update/HANDOFF.md) và [CHECKS](figma-update/CHECKS.md) ghi
cách mở, fixtures, source revision và giới hạn integration.
