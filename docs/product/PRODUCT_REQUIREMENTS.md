# Gì Cũng Được — yêu cầu sản phẩm

Phiên bản 0.1 • Draft for review • 2026-10-06.

## Vấn đề và lời hứa

Hai người hoặc nhóm nhỏ sắp đi ăn nhưng chưa thống nhất món. Một người nói “không thèm” không có nghĩa họ không ăn được; việc bỏ chung mọi phản hồi vào Like/Dislike làm mất phương án thỏa hiệp.

Ứng dụng giúp nhóm đưa ra lựa chọn dựa trên ba mức **Muốn ăn / Ăn được / Không ăn**, tối đa hai vòng. Nếu không có lựa chọn chung, ứng dụng nói rõ điều đó. Không hứa mọi nhóm luôn tìm được món hoặc công bằng tuyệt đối.

## Người dùng và khoảnh khắc

- Cặp đôi chuẩn bị ăn trưa/tối; muốn mở phòng nhanh với người quen.
- Nhóm bạn/đồng nghiệp 2–8 người; một người tạo mã, mọi người vào và chọn riêng.
- Quán ăn là bước gợi ý sau khi chốt món; không xây nền tảng đặt bàn/giao đồ ăn.

## Luồng chính

Khách hoặc tài khoản → tạo/vào phòng → chọn buổi ăn → sở thích loại món (chọn nhiều hoặc bỏ qua) → phòng chờ → mỗi người đánh giá cùng bộ món → tất cả muốn ăn thì match; nếu chưa có thì vòng hai chọn từ các món tất cả ăn được → chốt một kết quả → mở tìm kiếm Google Maps.

Buổi ăn do host chọn, cả nhóm nhìn thấy trước khi sẵn sàng. Loại món là ưu tiên mềm; không lọc cứng bằng giao của lựa chọn loại món. `NO` ở cấp món là loại trừ cứng trong phiên.

## Phạm vi

| Mức | Bao gồm |
| --- | --- |
| P0 / MVP | Khách có session; tên hiển thị; phòng mã/QR; 2–8 người; buổi ăn; catalogue; loại món nhiều lựa chọn; phiếu ba mức; hai vòng; kết quả ổn định; không đồng thuận; kết nối lại; Maps; a11y và thông báo lỗi |
| P1 / sau core | Liên kết tài khoản; bạn ăn cùng bằng lời mời hai chiều; tạo phòng nhanh; lịch sử kết quả tối thiểu |
| P2 / thử nghiệm | OCR thực đơn đã sửa/duyệt; AI phân loại câu nhập; công bằng qua nhiều bữa; đề xuất catalogue cá nhân |
| Không thuộc đợt này | Đặt món, thanh toán, bill split, chat, mạng xã hội, dữ liệu quán realtime/đánh giá, Bluetooth, AI tự quyết định, tuyên bố món an toàn với dị ứng |

## Điểm cải thiện cần chứng minh

1. Phân biệt mức chấp nhận và ý muốn, không chốt món có người chọn NO.
2. Không kẹt vì một người chọn lẩu và người kia chọn nướng: loại món chỉ xếp ưu tiên, cùng đánh giá bộ ứng viên đa dạng.
3. Xử lý không có match có giới hạn, lý do rõ ràng, không quay vô hạn hoặc dùng đa số ép thiểu số.

Những tính năng riêng lẻ đã có trên thị trường. Điểm đóng góp là cách kết hợp và kiểm chứng cho nhóm người dùng Việt; không tuyên bố độc quyền ý tưởng.

## Chỉ số mục tiêu cần đo (chưa có kết quả)

- Không có trường hợp kết quả vi phạm NO trong bộ test.
- 100% phiên test kết thúc hoặc báo chờ/ngắt rõ ràng; không tự có vòng thứ ba.
- Thử với ít nhất 5 nhóm độc lập, ghi thời gian từ đủ người tới chốt và mức dễ hiểu thang 1–5; mục tiêu trung vị dưới 3 phút với bộ 8 món.
- So sánh với nhóm tự bàn và vòng quay không có lọc; báo cả phiên thất bại, không chọn riêng số liệu đẹp.

Xem [FR](FUNCTIONAL_REQUIREMENTS.md), [traceability](../specs/TRACEABILITY.md), [quy tắc quyết định](../specs/DECISION_SPEC.md) và [rủi ro](../project/RISK_REGISTER.md).
