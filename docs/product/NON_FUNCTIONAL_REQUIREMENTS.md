# Non-functional requirements

| ID | Mục tiêu / tiêu chí |
| --- | --- |
| NFR-01 | Android là thiết bị nghiệm thu; TypeScript strict; phiên bản Expo/RN tương thích được khóa ở GM-01 |
| NFR-02 | Mục tiêu cập nhật trạng thái vòng trong 2 giây ở mạng Wi-Fi ổn định; đo log thời điểm server/client, không coi là SLA |
| NFR-03 | Mỗi request ghi có requestId và expectedVersion; thao tác chốt nguyên tử, retry không sinh hai kết quả |
| NFR-04 | Người ngoài phòng không đọc được dữ liệu; thành viên chỉ đọc phiếu của mình; host không có quyền xem phiếu thô của người khác |
| NFR-05 | Nhóm online không tiến vòng khi thiếu xác nhận từ server; nháp local không là nguồn kết quả |
| NFR-06 | Touch target >=48dp, tương phản text thường >=4.5:1, hỗ trợ font 200%; không dùng màu làm tín hiệu duy nhất |
| NFR-07 | Giảm chuyển động được tôn trọng; hình trang trí có fallback; danh sách dài dùng FlatList/SectionList |
| NFR-08 | Không gắn secret/service_role vào app; log không có token, phiếu, email hoặc lý do ăn kiêng |
| NFR-09 | Mục tiêu chi phí dịch vụ bằng 0 trong quy mô demo; không bật billing/paid plan tự động; đo quota, chuẩn bị project trước demo |
| NFR-10 | Unit domain, integration RPC/RLS, Android E2E và kiểm thử 2/4/8 máy theo [test plan](../testing/TEST_PLAN.md) |

Không hứa hoạt động nhóm offline hoặc che giấu việc suy luận lựa chọn: nhóm hai người vẫn có thể đoán sở thích đối phương từ kết quả tổng hợp.
