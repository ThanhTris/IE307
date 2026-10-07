# UI spec — v0.2

2026-10-07 • Android-first, chờ review. [Prototype HTML](../../design/prototypes/gi-cung-duoc.html) là mô phỏng v0.1, chưa có đầy đủ v0.2. [Plan UI](../project/UI_IMPLEMENTATION_PLAN.md).

| UI | Màn và hành động | Trạng thái bắt buộc |
| --- | --- | --- |
| UI-01 | Home: guest/session, avatar bạn quen, tạo/vào phòng, lời giải thích/quyền vị trí lần đầu | restore/loading, deny/offline, empty friends, lost session |
| UI-02 | Tạo: tên, buổi gợi ý theo giờ sửa được, budget/đổi món có giải thích | validation, quota/network, double create |
| UI-03 | Vào: mã/QR/incoming link → confirm join | camera denied/manual, full/locked/expired/invalid, cold/warm auth |
| UI-04 | Category mềm, consent history, bối cảnh nhóm | nhiều loại/bỏ qua, budget unknown, empty catalogue, đổi reset ready |
| UI-05 | Lobby: roster/code/QR/link, mời bạn, ready/start host | chờ người/ready, disconnect, lỗi invite, context đổi, cancel |
| UI-06 | Card ảnh/tên/tags/giá nguồn; ba nút, double-tap WANT; sửa/undo; Gửi | UNSET, DRAFT/QUEUED/SENDING/UNKNOWN/ACK, stale; pending không count |
| UI-07 | Vòng cuối: Giữ/Loại thêm, explicit confirm | giữ mặc định nhưng phải nộp, loại hết hợp lệ, pending/reconnect |
| UI-08 | Winner/Perfect–Consensus–Compromise/lý do; khu vực và Maps/YouTube/TikTok | location denied/GPS off/geocode error, browser/copy, no reroll |
| UI-09 | No Consensus: lý do trung tính, kết thúc/tạo phiên mới | không tự vòng3/carry votes, không nêu người NO |
| UI-10 | Network/expiry/cancel; cache fetchedAt và retry | refetch trước replay, xác nhận rời, stale queue không auto submit |
| UI-11 | Friends: mã/link, accept/reject/unfriend, avatar quick room | pending/empty/expired, lost guest, không auto join/ready |
| UI-12 | Inbox/push permission, invitation accept và kết quả server | denied vẫn inbox, cold/warm, expired/duplicate/outsider |
| UI-13 | History consent/list/delete, 3 recent hint | offline cache stale, opt-out/empty, group consent thiếu |
| UI-14 P1 | Account link/recovery và sync history | conflict/lỗi giữ guest, logout clear private |
| UI-15 P1 | Pilot venue–dish radius + coverage/ngày kiểm | ngoài vùng/unknown, GPS deny, không route distance |

## Gesture và một tay

Chạm hai lần vùng ảnh/card đặt WANT, không toggle hoặc gửi. Không vote bằng vuốt dọc. Swipe ngang tùy chọn phải WANT/trái NO; OK có nút. Kéo/scroll hủy tap recognizer. Mở chi tiết bằng nút riêng; không chạy chạm đơn đồng thời với double-tap. Hướng dẫn lần đầu và phản hồi chữ/tim nhẹ; reduced motion bỏ trang trí. Thử trái/phải và card đang chuyển; không suy mặc định double-tap tốt hơn từ thói quen TikTok.

Ba nút Pressable có label/state luôn hiện; TalkBack dùng nút chuẩn (double-tap assistive không bị ghi WANT tùy biến). Mọi lựa chọn trước Gửi có thể sửa; sau queue chưa từng gửi có Cancel local rõ, sau possible delivery khóa tới reconcile. Không Back sửa submission đã nhận.

## Copy, quyền riêng tư và a11y

WANT Muốn ăn; OK Ăn được; NO Không ăn; không dùng Bỏ qua thay NO. Chỉ ACK làm tăng số hoàn tất chung. Nhãn Chờ gửi trên máy khác Server đã nhận. Không raw votes trên avatar/animation/notification. Kết quả nhãn tổng hợp có thể bị suy luận nhóm nhỏ, không hứa ẩn danh.

Safe area, keyboard tránh form, touch48dp/font200/TalkBack/dark/reduced motion. UI 320–599 một cột; tablet card giới hạn chiều rộng, không tràn. FlatList khi phù hợp. Giá tham khảo rõ đơn vị/nguồn hoặc Chưa có giá; ảnh có quyền và fallback. Không tuyên bố allergy safety hoặc verified nearby nếu chỉ search URL.

Native screenshots/recording có loading/empty/error, permission và offline; HTML không thay chứng cứ. [Test plan](../testing/TEST_PLAN.md).
