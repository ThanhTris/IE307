> Lịch sử: các mã task trong tài liệu này thuộc thời điểm soạn/roadmap-v1 (hoặc mã cũ được ghi bên dưới). Lộ trình hiện hành: [roadmap-v2](../../project/IMPLEMENTATION_ROADMAP.md); không dùng mã trong tài liệu này để mở gate.

> Bối cảnh quyết định cũ. Yêu cầu food-v1 được cập nhật tại [ADR-005](ADR-005-food-location-time-data.md), chờ GM-01 review; phần location chỉ sau winner/venue P1 dưới đây không là scope hiện hành.

# ADR-003 — Vị trí foreground và liên kết tìm review

Ngày 2026-10-06. Status: Proposed — chủ dự án đã yêu cầu xin quyền lần mở đầu và tự dùng vị trí khi mở review; lựa chọn kỹ thuật/provider chưa review. Không thay ADR-001 hoặc mở khóa dependency.

## Quyết định sản phẩm đã được ủy quyền

Xin quyền vị trí foreground lần mở đầu sau giải thích. Khi người dùng chủ động bấm YouTube/TikTok/Maps, dùng vị trí hiện tại của người bấm để tạo từ khóa món + khu vực. Từ chối quyền không chặn ứng dụng.

## Đề xuất kỹ thuật và quyền riêng tư

- Adapter location và reverse geocoding tách khỏi domain/UI; chọn package Expo tương thích sau gate dependency. Chưa thêm package hoặc key.
- Chỉ cần vị trí tương đối; không background tracking. Không lưu tọa độ vào room/database/lịch sử/log. Không tự chia sẻ vị trí với bạn ăn cùng.
- Reverse geocoding dùng provider được review: nếu gửi tọa độ ngoài thiết bị, thông báo rõ bên nhận/mục đích trước sử dụng. Đánh giá hỗ trợ Việt Nam, quota, chi phí và timeout. Tránh truy vấn liên tục, chỉ tra khi cần mở review.
- Liên kết review chỉ chứa tên món và khu vực tổng quát, không tọa độ/địa chỉ nhà/user ID/token. Nền tảng ngoài áp dụng quyền riêng tư riêng.
- Dùng HTTPS qua Linking; chưa dựa vào undocumented URI scheme hoặc SDK TikTok. Android có thể mở app/browser; deep link tìm kiếm phải thử thật.
- Thiếu vị trí/geocoding/provider thì mở tìm kiếm tên món. Không có API billing cho thao tác mở URL; phần định vị/geocoding vẫn cần kiểm riêng.

## Gate trước code

Reviewer của GM-23 kiểm provider/dependency/license/quota, thông báo consent và allowlist URL; chốt patch/test plan. Không có bằng chứng native trong đợt tài liệu này. Không tự coi ADR Accepted.

[Spec bổ sung](../../specs/SOCIAL_DISCOVERY_SPEC.md). Tham khảo: [React Native Linking](https://reactnative.dev/docs/linking), [Android app links](https://developer.android.com/training/app-links), [TikTok Nearby](https://support.tiktok.com/en/using-tiktok/exploring-videos/nearby).
