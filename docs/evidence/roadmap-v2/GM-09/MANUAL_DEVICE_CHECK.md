# GM-09 — xác nhận kiểm thủ công trên Expo Go

Ngày ghi nhận: 2026-10-15. Đây là kết quả do người dùng báo trong cuộc hội thoại hiện tại; agent không trực tiếp thao tác trên điện thoại và không ghi approval thay Trí.

## Phạm vi và revision

- Owner task: Tuấn (`mtuan2491`); reviewer/merge/nghiệm thu Done: Trí (`ThanhTris`). Không suy danh tính người kiểm từ owner hoặc tài khoản GitHub.
- Người kiểm: người dùng trong cuộc hội thoại, chưa cung cấp tên riêng.
- Xác nhận nguyên văn: “tôi đã kiểm tra GM-09 thành công và hoạt động”.
- Chỉ dẫn về bàn giao: người dùng xác nhận project không yêu cầu ảnh/video evidence UI hoạt động; lần bàn giao GM-09 này dùng xác nhận kiểm thủ công bằng văn bản. Không thêm điều kiện ảnh/video để gửi review.
- Nhánh: `codex/gm-09-home-create-and-join-room`; base HEAD `67356949615c39134ba24b71301c45fed917089e` + source/test working tree đã kiểm, chưa có commit mới. Hashes tại [manifest bàn giao](REVIEW_PACKAGE_MANIFEST.json).
- Contract: `food-v1/roadmap-v2/GM-09.1`, component props GM-05.1, client/mock GM-07.1.
- Mode: Expo Go, dữ liệu mô phỏng; không xác nhận backend/native integration.
- Model thiết bị / Android / phiên bản Expo Go / ngày giờ thực hiện phép kiểm: chưa được người dùng cung cấp. Ngày trên là ngày ghi nhận xác nhận, không tự điền thông số hoặc thời điểm đo.

## Kết quả đã xác nhận và giới hạn

| Mục | Nguồn kết quả | Trạng thái |
| --- | --- | --- |
| Mở và sử dụng GM-09 trên Expo Go | Người dùng xác nhận GM-09 đã kiểm thành công và hoạt động sau bản sửa cuối | Pass theo xác nhận thủ công của người dùng, chưa phải nghiệm thu của Trí |
| Vùng bấm hai CTA tạo phòng/nhập mã sau bản sửa nhãn phủ lòng nút | Xác nhận kiểm thành công được gửi sau bản sửa cuối; không có báo lỗi còn lại. Chưa tách kết quả từng tọa độ trái/giữa/phải | Bản sửa nằm trong xác nhận chung; không tự tạo biên bản đo từng điểm |
| Light/dark, font200%, TalkBack, keyboard/hardware Back, reduced motion | Chưa có kết quả riêng từng mục. Trước đó có câu hỏi về app còn dark khi Expo Go chọn light; chưa có xác nhận riêng cách xử lý | Chưa xác nhận riêng; Trí đối chiếu khi review, không tự đánh Pass |
| Từng fixture loading/empty/network/full/locked/expired và retry | Có assertion tự động trong [mobile check cuối](BUTTON_LABEL_AREA_MOBILE_CHECK.txt); chưa liệt kê phép thử riêng trên thiết bị | Pass tự động; chưa xác nhận riêng từng fixture trên thiết bị |
| API room/auth, QR/camera/GPS thật, persistence và nhiều thiết bị | Ngoài scope UI mock GM-09 | N/A cho lần kiểm này; task tích hợp kiểm riêng |

Xác nhận chung không được mở rộng thành kết quả chi tiết chưa báo. Các mục bắt buộc chưa có kết quả riêng cần Trí đối chiếu/kiểm bổ sung trước nghiệm thu; vẫn được gửi PR để review. Không yêu cầu bổ sung ảnh/video cho lần bàn giao này.

## Cách Trí tái lập

1. Checkout commit cuối của PR GM-09; đối chiếu source/test với manifest và thay đổi sau thời điểm kiểm nếu có.
2. Tại `mobile`, chạy `npm ci --no-audit --no-fund`, rồi `npm start -- --clear`; Expo Go tương thích SDK57, điện thoại và máy tính cùng LAN.
3. Home → Tạo kèo ăn → điền tên/chọn điểm, giờ, bối cảnh → xác nhận → receipt → Home/resume. Join dùng mã mẫu `GCD234`, xác nhận trước vào.
4. Để thử hai CTA khi chưa có phòng: Công cụ kiểm thử → Bình thường; chạm trái/giữa/phải trong nền từng nút. Khi còn active receipt, khóa hai CTA là hành vi có chủ đích.
5. Đối chiếu các mục chưa xác nhận riêng trong bảng và ghi kết quả thực tế khi review. Giao diện sáng/tối hiện theo theme Android qua `useColorScheme`, chưa có công tắc riêng trong app.

## Quyền quyết định

Chờ Trí review revision PR cuối. Chỉ Trí được merge nhánh và chuyển GM-09 sang Done trên Project #2. Người thực hiện/agent chuẩn bị tài liệu và thực hiện commit/push/PR khi được giao; không tự ghi Approved, merge hoặc Done. Xác nhận hoạt động của người dùng không được diễn giải thành approval của Trí.
