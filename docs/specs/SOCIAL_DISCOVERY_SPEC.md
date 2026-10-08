# Bạn ăn cùng và khám phá quán — food-v1

2026-10-07 • FR-10/11/18. Kết bạn core GM-15; account link chuyển GM-28/P1. Scope này thay ghi chú P1 cũ ngày 2026-10-06.

## Kết bạn/chọn nhanh

UI-01 có hàng avatar tên rõ/label TalkBack, rỗng có Mời bạn. Add bằng mã bạn hoặc link, không upload danh bạ. Recipient accept mới accepted pair. Chạm avatar → Chọn món cùng [tên] → create room có meal/context → room invitation tới inbox/push. Đối phương accept thì join bằng server, không nhập lại mã; vẫn xác nhận preferences/ready. Reject/expired/full/locked/cancelled/unfriend đều có copy và retry đúng, không tạo nhiều phòng bằng double tap.

Lời mời phòng là P0, không tự nhập bạn từ roster, không tự ready/vote. Không cần email/account cố định trong core. [Identity/privacy](IDENTITY_PRIVACY_SPEC.md), [notification/link](NOTIFICATIONS_LINKS_SPEC.md).

## Vị trí và mở review

GM-10 giải thích/xin foreground để gợi khu vực trước chọn món; deny thì chọn public anchor thủ công. Nhóm xác nhận khu vực ăn chung trước ready. GM-23 mở review sau chốt mặc định theo khu vực chung; nếu user chủ động đổi khu vực tìm kiếm ngoài phiên phải ghi rõ và không sửa pool/result. Không tự hỏi quyền lặp vô hạn.

UI-08 có Xem review trên YouTube, Xem review trên TikTok, Tìm quán trên Maps, nhãn khu vực dùng. Query tên món+khu vực+review quán, encode đúng và HTTPS allowlist. YouTube /results?search_query=..., TikTok /search?q=... là URL ứng viên cần thử native. Maps /maps/search/?api=1&query=...; browser/copy fallback. Không thao tác bên trong app khác hoặc điều khiển Nearby. Kết quả nền tảng có thể khác theo người dùng.

Không gửi địa chỉ nhà/tọa độ/userID/token trong review query; không lưu GPS cá nhân vào phòng/history; chỉ room context giữ public anchor đã xác nhận theo TTL. Link search không hứa quán gần nhất/bán kính/đang mở/có món. Danh sách offering trong app dùng dataset/eligibility đã kiểm riêng. Không API key cho chỉ mở link; geocoding provider/license/quota chờ review ADR-003. Quay về giữ result/snapshot, không reroll. Incoming links được spec riêng, không trộn với link review ra ngoài.

## Scope mở rộng

Chia sẻ thẻ kết quả hoặc link quán về phòng chưa có task core. Venue–dish/giờ là GM-08/P0; eligibility GM-11, location sớm GM-10; xem [food spec](FOOD_DATA_SPEC.md). OCR/AI P2.

Test T-10/11/18; evidence Android cold/warm, có/không app ngoài, deny/GPS off/timeout/query tiếng Việt và security invalid QR.
