# DECISION SPEC — không ép món, không quay vô hạn

Draft v0.1 • policyVersion `decision-v1` • FR-05..08, FR-10.

## Dữ liệu đầu vào

Roster và pool đã khóa. Phiếu vòng 1 là `WANT | OK | NO` cho từng dishId. `UNSET` chỉ là trạng thái UI, không được gửi như phiếu hợp lệ. Một submission phải đủ toàn bộ pool, không thừa ID, có requestId/version.

Trước nộp được sửa lựa chọn; sau khi nộp không sửa. Server đợi **tất cả** thành viên nộp, không chọn early match làm các máy khác kết quả hoặc cho người vuốt nhanh quyền ưu tiên.

## Vòng 1

1. Tập M: món mà tất cả thành viên chọn WANT.
2. Nếu M khác rỗng: chọn đều một món trong M ở server, lưu một lần, trạng thái DECIDED.
3. Nếu M rỗng: tập A là các món không có NO và đã có WANT/OK từ mọi thành viên.
4. Nếu A rỗng: NO_CONSENSUS. Nếu A không rỗng: ROUND_2 với đúng tập A.

Thông báo chuyển vòng: “Chưa có món cả nhóm cùng muốn. Còn X món mọi người đều ăn được.” Không nêu người khiến một món bị loại.

## Vòng 2

Người dùng thấy các món A, mỗi món chọn **Giữ / Loại thêm**; mặc định nháp Giữ nhưng phải bấm “Xác nhận lựa chọn” để nộp. Không hiển thị các món đã NO ở vòng 1, không đề nghị bỏ giới hạn của người khác.

Sau khi đủ submission: S gồm món được mọi người Giữ. S rỗng → NO_CONSENSUS. Nếu S còn món, ưu tiên số WANT vòng 1 cao nhất; khi hòa bốc đều một lần trong tập đứng đầu. Server lưu kết quả/tập hòa/policyVersion; reload hay retry không bốc lại. Không có vòng ba, không có reroll trong MVP. Tạo phiên mới là hành động rõ ràng, không tự lặp.

## Giải thích kết quả

- Vòng 1: “Cả nhóm cùng muốn ăn món này.”
- Vòng 2: “Mọi người đều giữ món này ở vòng cuối; món được ưu tiên theo mức muốn ăn.”
- Chưa đồng thuận: “Hiện chưa có món mọi người cùng ăn được. Bạn có thể kết thúc hoặc tạo một phiên mới với lựa chọn khác.”

Không công khai matrix phiếu hoặc lý do cá nhân. Tổng hợp vẫn có thể cho phép suy luận ở nhóm nhỏ; không hứa ẩn danh tuyệt đối.

## Invariants và AC

- DEC-01: món có bất kỳ NO vòng 1 hoặc Loại thêm vòng 2 không thể là winner.
- DEC-02: thiếu một member hoặc một dish vote không được finalize.
- DEC-03: mọi client đọc cùng resultId/winnerId/version từ server.
- DEC-04: retry requestId cùng payload trả lại kết quả cũ; cùng ID khác payload → lỗi.
- DEC-05: số vòng <=2; terminal không đổi sau request đến muộn.
- DEC-06: một món hợp lệ vẫn cần toàn bộ xác nhận vòng 2 nếu không phải unanimous WANT.
- DEC-07: thuật toán TypeScript dùng mô phỏng/test; SQL RPC là nguồn chốt thật, chạy chung bộ fixture để chống lệch logic.

## Ví dụ nghiệm thu

| A | B | Kết quả |
| --- | --- | --- |
| WANT phở | WANT phở | Vòng 1 chọn phở nếu đó là match duy nhất |
| WANT phở | OK phở | Sang vòng 2, chưa tự chốt |
| WANT phở | NO phở | Không đưa phở vào vòng 2 |
| OK phở, NO bún | NO phở, OK bún | Chưa đồng thuận |
| Cùng giữ phở/bún, điểm WANT bằng nhau | Cùng giữ phở/bún | Chọn server một lần; các lần đọc không đổi |

Phân bổ công bằng qua nhiều buổi và tự tìm phương án nới ràng buộc là P2; không nằm trong policy v1.

Trong fixture engine, `WAITING` nghĩa chưa đủ dữ liệu để chuyển trạng thái, không phải RoomState mới; phòng vẫn ROUND_1/ROUND_2 hiện tại. Fixture chỉ định tập ứng viên hợp lệ, không ép một winner cố định khi hòa.
