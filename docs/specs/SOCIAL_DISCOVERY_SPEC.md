# Bạn ăn cùng và khám phá quán — v0.2

2026-10-07 • FR-10/11/18. Kết bạn core GM-17; account link chuyển GM-26/P1. Scope này thay ghi chú P1 cũ ngày 2026-10-06.

## Kết bạn/chọn nhanh

UI-01 có hàng avatar tên rõ/label TalkBack, rỗng có Mời bạn. Add bằng mã bạn hoặc link, không upload danh bạ. Recipient accept mới accepted pair. Chạm avatar → Chọn món cùng [tên] → create room có meal/context → room invitation tới inbox/push. Đối phương accept thì join bằng server, không nhập lại mã; vẫn xác nhận preferences/ready. Reject/expired/full/locked/cancelled/unfriend đều có copy và retry đúng, không tạo nhiều phòng bằng double tap.

Lời mời phòng là P0, không tự nhập bạn từ roster, không tự ready/vote. Không cần email/account cố định trong core. [Identity/privacy](IDENTITY_PRIVACY_SPEC.md), [notification/link](NOTIFICATIONS_LINKS_SPEC.md).

## Vị trí và mở review

Lần mở app đầu giải thích rồi xin foreground permission; deny vẫn dùng app. Khi bấm review sau chốt lấy vị trí hiện tại của người bấm, chấp nhận approximate, geocode district/city khi có. Không bắt nhập khu vực. Nếu GPS/permission/provider lỗi, mở chỉ tên món; không tự hỏi quyền lặp vô hạn.

UI-08 có Xem review trên YouTube, Xem review trên TikTok, Tìm quán trên Maps, nhãn khu vực dùng. Query tên món+khu vực+review quán, encode đúng và HTTPS allowlist. YouTube /results?search_query=..., TikTok /search?q=... là URL ứng viên cần thử native. Maps /maps/search/?api=1&query=...; browser/copy fallback. Không thao tác bên trong app khác hoặc điều khiển Nearby. Kết quả nền tảng có thể khác theo người dùng.

Không gửi địa chỉ nhà/tọa độ/userID/token trong review query; không lưu vị trí phòng/history. Không hứa quán gần nhất/bán kính/đang mở/có món. Không API key cho chỉ mở link; geocoding provider/license/quota chờ review ADR-003. Quay về giữ result/snapshot, không reroll. Incoming links được spec riêng, không trộn với link review ra ngoài.

## Scope mở rộng

Chia sẻ thẻ kết quả hoặc link quán về phòng chưa có task core. Venue–dish radius là GM-27/P1 có coverage, dữ liệu/ngày kiểm và consent điểm hẹn riêng. OCR/AI P2.

Test T-10/11/18; evidence Android cold/warm, có/không app ngoài, deny/GPS off/timeout/query tiếng Việt và security invalid QR.
