# Non-functional requirements — v0.2

2026-10-07 • mục tiêu nghiệm thu, chưa có số đo.

| ID | Mục tiêu / tiêu chí |
| --- | --- |
| NFR-01 | Android là thiết bị nghiệm thu; TypeScript strict; phiên bản Expo/RN tương thích được khóa ở GM-01 |
| NFR-02 | Mục tiêu cập nhật trạng thái vòng trong 2 giây ở mạng Wi-Fi ổn định; đo log thời điểm server/client, không coi là SLA |
| NFR-03 | Mỗi request ghi có requestId; room mutations có expectedVersion (join/accept_room_invite trước membership và device registration là ngoại lệ đặc tả); thao tác chốt nguyên tử, retry không sinh hai kết quả |
| NFR-04 | Người ngoài phòng không đọc được dữ liệu; thành viên chỉ đọc phiếu của mình; host không có quyền xem phiếu thô của người khác |
| NFR-05 | Nhóm online không tiến vòng khi thiếu ACK; own draft/outbox persist và replay khi hợp lệ, không là nguồn winner |
| NFR-06 | Touch target >=48dp, tương phản text thường >=4.5:1, hỗ trợ font 200%; không dùng màu làm tín hiệu duy nhất |
| NFR-07 | Giảm chuyển động được tôn trọng; hình trang trí có fallback; danh sách dài dùng FlatList/SectionList |
| NFR-08 | Không gắn secret/service_role vào app; log không có token, phiếu, tọa độ, push token, email hoặc lý do ăn kiêng |
| NFR-09 | Mục tiêu chi phí dịch vụ bằng 0 trong quy mô demo; không bật billing/paid plan tự động; đo quota, chuẩn bị project trước demo |
| NFR-10 | Unit domain, integration RPC/RLS, Android E2E và kiểm thử 2/4/8 máy theo [test plan](../testing/TEST_PLAN.md) |
| NFR-11 | Push cần native development/release build và receipt/inbox fallback, không đảm bảo giao đúng một lần |
| NFR-12 | Cache/outbox/history có TTL và phân vùng auth; restart không mất intent đã bấm Gửi; stale không replay |

Không hứa nhóm chốt offline; nhãn tổng hợp nhóm nhỏ vẫn cho phép suy luận sở thích.
