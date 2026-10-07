# Mở rộng có điều kiện — P2

Chưa thuộc MVP; không triển khai trước GM-22 đạt review.

OCR: nhập ảnh menu → on-device OCR → người dùng sửa tên/giá → xác nhận danh sách → tạo phiên mới. Không sửa pool phiên đang chạy. Đánh giá tiếng Việt/bố cục; không tự suy luận allergen. Native dependency/license/size phải review. Nếu không đạt độ chính xác chốt trước pilot thì giữ nhập tay và không quảng cáo scan hoàn hảo.

AI: free text → JSON category/preference đề xuất → người dùng xác nhận. Model không chọn winner, không thay NO, không tạo quán có thật. Gateway giữ key; đánh giá schema và nghĩa, quota/cost/consent, fallback form. Chưa có model/vendor chốt.

Fairness nhiều bữa: nghiên cứu cách đo người nhường, cold start và gaming; không tự ưu tiên dựa vào số phiên ít thắng. Chưa có task triển khai trong 27 task.
