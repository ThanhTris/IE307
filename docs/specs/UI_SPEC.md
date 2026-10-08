# UI spec — food-v1

2026-10-07 • Android-first, chờ review. [Tài liệu Thiết kế & Triển khai UI](UI_DESIGN_SPECIFICATION.md) chuẩn hóa từ [Prototype HTML](../../design/prototypes/gi-cung-duoc.html). [Plan UI](../project/UI_IMPLEMENTATION_PLAN.md).

| UI | Màn và hành động | Trạng thái bắt buộc |
| --- | --- | --- |
| UI-01 | Home: guest/session, avatar bạn quen, tạo/vào phòng, lời giải thích/quyền vị trí lần đầu | restore/loading, deny/offline, empty friends, lost session |
| UI-02 | Tạo: tên, điểm ăn chung/coverage/radius/desiredAt/buổi/budget | manual/GPS deny, ngoài coverage, time passed, validation, quota/network |
| UI-03 | Vào: mã/QR/incoming link → confirm join | camera denied/manual, full/locked/expired/invalid, cold/warm auth |
| UI-04 | Cuisine/category/temperature/flavor mềm, consent/history/context chung | bỏ qua/unknown, empty eligibility, đổi context reset ready |
| UI-05 | Lobby: roster/code/QR/link, mời bạn, ready/start host | chờ người/ready, disconnect, lỗi invite, context đổi, cancel |
| UI-06 | Card ảnh/tên/tags/giá nguồn; ba nút, double-tap WANT; sửa/undo; Gửi | UNSET, DRAFT/QUEUED/SENDING/UNKNOWN/ACK, stale; pending không count |
| UI-07 | Vòng cuối: Giữ/Loại thêm, explicit confirm | giữ mặc định nhưng phải nộp, loại hết hợp lệ, pending/reconnect |
| UI-08 | Winner/tier/lý do; offering đúng context, nguồn/ngày/lịch/Maps/review | offering đổi/đóng/stale thì thông báo, không reroll; browser/copy |
| UI-09 | No Consensus: lý do trung tính, kết thúc/tạo phiên mới | không tự vòng3/carry votes, không nêu người NO |
| UI-10 | Network/expiry/cancel; cache fetchedAt và retry | refetch trước replay, xác nhận rời, stale queue không auto submit |
| UI-11 | Friends: mã/link, accept/reject/unfriend, avatar quick room | pending/empty/expired, lost guest, không auto join/ready |
| UI-12 | Inbox/push permission, invitation accept và kết quả server | denied vẫn inbox, cold/warm, expired/duplicate/outsider |
| UI-13 | History consent/list/delete, 3 recent hint | offline cache stale, opt-out/empty, group consent thiếu |
| UI-14 P1 | Account link/recovery và sync history | conflict/lỗi giữ guest, logout clear private |
| UI-15 P0 | Chọn public anchor/radius và xem nơi bán có lịch phù hợp | ngoài vùng/unknown/stale, manual/GPS deny, đường chim bay tới anchor |
| UI-16 P2 | Weather và mood tự khai tùy chọn GM-31 | bỏ qua/tắt/stale/API lỗi; không chặn core |

## Gesture và một tay

Chạm hai lần vùng ảnh/card đặt WANT, không toggle hoặc gửi. Không vote bằng vuốt dọc. Swipe ngang tùy chọn phải WANT/trái NO; OK có nút. Kéo/scroll hủy tap recognizer. Mở chi tiết bằng nút riêng; không chạy chạm đơn đồng thời với double-tap. Hướng dẫn lần đầu và phản hồi chữ/tim nhẹ; reduced motion bỏ trang trí. Thử trái/phải và card đang chuyển; không suy mặc định double-tap tốt hơn từ thói quen TikTok.

Ba nút Pressable có label/state luôn hiện; TalkBack dùng nút chuẩn (double-tap assistive không bị ghi WANT tùy biến). Mọi lựa chọn trước Gửi có thể sửa; sau queue chưa từng gửi có Cancel local rõ, sau possible delivery khóa tới reconcile. Không Back sửa submission đã nhận.

## Copy, quyền riêng tư và a11y

WANT Muốn ăn; OK Ăn được; NO Không ăn; không dùng Bỏ qua thay NO. Chỉ ACK làm tăng số hoàn tất chung. Nhãn Chờ gửi trên máy khác Server đã nhận. Không raw votes trên avatar/animation/notification. Kết quả nhãn tổng hợp có thể bị suy luận nhóm nhỏ, không hứa ẩn danh.

Safe area, keyboard tránh form, touch48dp/font200/TalkBack/dark/reduced motion. UI 320–599 một cột; tablet card giới hạn chiều rộng, không tràn. FlatList khi phù hợp. Giá tham khảo rõ đơn vị/nguồn hoặc Chưa có giá; ảnh có quyền và fallback. Không tuyên bố allergy safety hoặc verified nearby nếu chỉ search URL.

Native screenshots/recording có loading/empty/error, permission và offline; HTML không thay chứng cứ. [Test plan](../testing/TEST_PLAN.md).

Food-v1 theo [food spec](FOOD_DATA_SPEC.md): card không ghép thuộc tính từ nhiều quán; ngày kiểm/lịch dự kiến khác tồn kho live. UI-15 là capability GM-10 trước GM-13 và offering GM-21 sau vote; không làm location phụ thuộc result. GM-01 review trước code.
