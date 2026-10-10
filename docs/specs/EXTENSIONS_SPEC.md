# Mở rộng có điều kiện — P2

Chưa thuộc MVP; không triển khai trước GM-34 đạt review.

OCR: nhập ảnh menu → on-device OCR → người dùng sửa tên/giá → xác nhận bản nháp → kiểm nguồn/nơi bán/giờ/coverage theo FOOD_DATA_SPEC → publish được review → dùng cho phiên mới; không cho OCR bypass offering verified. Không sửa pool phiên đang chạy. Đánh giá tiếng Việt/bố cục; không tự suy luận allergen. Native dependency/license/size phải review. Nếu không đạt độ chính xác chốt trước pilot thì giữ nhập tay và không quảng cáo scan hoàn hảo.

AI: free text → JSON category/preference đề xuất → người dùng xác nhận. Model không chọn winner, không thay NO, không tạo quán có thật. Gateway giữ key; đánh giá schema và nghĩa, quota/cost/consent, fallback form. Chưa có model/vendor chốt.

Fairness nhiều bữa: nghiên cứu cách đo người nhường, cold start và gaming; không tự ưu tiên dựa vào số phiên ít thắng. Chưa có task triển khai trong 38 task sau GM-00.

Weather/mood là GM-38 P2, FR-21/T-26; scope theo [FOOD_DATA_SPEC](FOOD_DATA_SPEC.md). Sau GM-34, GM-21, GM-18 đạt review; không chặn release core.
