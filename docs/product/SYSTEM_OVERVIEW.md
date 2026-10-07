# Gì Cũng Được — mô tả hệ thống cho cả nhóm

Baseline food-v1 • 2026-10-07. Đây là phạm vi yêu cầu hiện hành được soạn theo yêu cầu chủ dự án và góp ý giảng viên; chưa có app/API triển khai; review scope mới chờ GM-28.

## Ứng dụng giải quyết việc gì?

Khi hai người hoặc một nhóm chuẩn bị đi ăn, từng người có món muốn ăn, món vẫn ăn được và món không ăn. Ứng dụng lọc món có nơi bán phù hợp khu vực/giờ đã xác nhận, rồi giúp cả nhóm tìm một lựa chọn chung trong tối đa hai vòng, giải thích kết quả, rồi mở tìm quán/review theo khu vực. Không cần cả nhóm cùng thích nhất một món mới có kết quả; món thỏa hiệp phải được mọi người chấp nhận.

Đối tượng: cặp đôi, bạn bè và đồng nghiệp 2–8 người. Android là nền tảng nghiệm thu, dùng React Native/Expo + TypeScript. Supabase là kiến trúc backend đề xuất chờ reviewer kiểm dependency/quota. Thời gian dự kiến 8 tuần, 6 thành viên, chi phí dịch vụ gần 0 ở quy mô demo.

## Một lần sử dụng diễn ra thế nào?

1. Lần mở đầu: tiếp tục với khách, nhập tên; app giải thích và xin quyền vị trí. Từ chối quyền vẫn chọn món được. Quyền thông báo hỏi khi người dùng dùng chức năng mời, không đồng nghĩa quyền vị trí.
2. Tạo phòng: chọn khu vực/điểm ăn công cộng từ GPS gợi ý hoặc nhập chọn thủ công, bán kính, giờ ăn và buổi; chọn ngân sách tham khảo và đổi món gần đây. Các thành viên nhìn thấy bối cảnh trước khi ready.
3. Mời: chia sẻ mã 6 ký tự/QR/link. Nếu đã kết bạn, chạm avatar để gửi lời mời; người kia chấp nhận vào phòng, không nhập lại mã và không tự ready.
4. Sở thích: mỗi người chọn cuisine Việt/Thái…, nhóm món lẩu/nướng/bún và đặc tính nóng/lạnh/cay… hoặc Gì cũng được. Đây là ưu tiên mềm; hai người chọn khác loại vẫn được xem một bộ món đa dạng.
5. Ready: đủ người, mọi người sẵn sàng thì host bắt đầu. Server kiểm lại nơi bán/giờ/coverage và reset ready nếu pool đổi, rồi khóa thành viên/bối cảnh/dataset và bộ tối đa 8 món; người vào muộn không thay kết quả.
6. Vòng 1: card có tên, ảnh có quyền, mô tả/tag và khoảng giá tham khảo hoặc Chưa có giá. Ba nút Muốn ăn/Ăn được/Không ăn luôn hiện. Chạm hai lần card chọn Muốn ăn; không vote bằng vuốt dọc. Sửa được trước khi bấm Gửi lựa chọn.
7. Đồng bộ: các máy chỉ thấy tiến độ tổng như 3/4 hoàn tất, không xem phiếu của người khác. Mất mạng vẫn lưu nháp hoặc phiếu đã bấm Gửi; Chờ gửi khác với Server đã nhận.
8. Chốt: nếu có món mọi người đều Muốn ăn thì server chọn một lần. Nếu không, vòng 2 chỉ chứa món không bị ai chọn Không ăn. Từng người Giữ/Loại thêm; hệ thống ưu tiên món được muốn ăn nhiều nhất trong tập mọi người giữ. Không có vòng 3.
9. Kết quả: Perfect/Consensus/Compromise hoặc Chưa đồng thuận. Mọi máy đọc cùng kết quả từ server. Nếu chưa đồng thuận, kết thúc hoặc chủ động tạo phiên mới; không âm thầm lấy món bị từ chối.
10. Sau chốt: xem nơi bán phù hợp context, refetch nếu lịch thay đổi; bấm Maps/YouTube/TikTok tìm theo món + khu vực ăn chung. Mở nền tảng ngoài không bảo đảm đúng bán kính hoặc quán đang bán món. Quay lại app kết quả vẫn giữ nguyên.
11. Lịch sử: bật lưu để xem món/buổi/thời điểm gần nhất offline. Sở thích lâu dài do người dùng tự khai. Chống lặp nhóm chỉ dùng summary theo consent, không giữ phiếu cá nhân để học gu.

## Hiểu kết quả qua ví dụ

Nhóm 4 người: phở có 2 Muốn + 2 Được (6 điểm), cơm tấm có 3 Muốn + 1 Được (7 điểm), lẩu có 3 Muốn + 1 Không (bị loại). Nếu vòng cuối mọi người đều giữ phở và cơm tấm thì cơm tấm thắng. WANT=2/OK=1 diễn giải được điểm; NO là điều kiện loại, không phải 0 điểm để số đông bù.

Perfect: tất cả muốn. Consensus: hơn một nửa muốn, số còn lại ăn được. Compromise: ít hơn hoặc bằng một nửa muốn nhưng mọi người đều ăn được và giữ ở vòng cuối. No Consensus: không có phương án hợp lệ. Mục tiêu là lựa chọn tốt nhất trong tập chấp nhận, không hứa công bằng tuyệt đối hoặc mọi phiên đều thành công.

## Phần cần bàn giao trong môn học — P0

Guest/session, phòng/code/QR/link, bạn quen/inbox mời, push mời/kết quả; taxonomy/cuisine/đặc tính; quán–món/giờ bán/coverage/radius/giờ ăn/context/budget; double-tap + nút; hai vòng/nhãn/lý do; realtime 2/4/8 máy; cache/outbox/retry; lịch sử tối thiểu và chống lặp có consent; vị trí/link review/Maps; accessibility, APK và evidence.

P1: tài khoản liên kết/khôi phục, history nhiều máy. P2: OCR/AI/weather–mood. Dataset quán–món–lịch đã kiểm trong coverage là P0. Không xây giao hàng, thanh toán, chat, pantry hay weather API trong core.

## Người làm và tiến độ là gì?

Các tên trong backlog chỉ là gợi ý; thành viên có thể nhận/đổi việc và reviewer phải khác owner. GM-00 v0.2 đã được Trí duyệt; GM-28 food-v1 đang chờ review và mọi task triển khai vẫn backlog cho đến khi thành viên nhận việc. 8 tuần cũ cần ước lượng lại theo scope data mới; chưa có ngày bắt đầu/hạn môn học nên không tự đặt deadline lịch.

Đọc [task summary](../project/TASK_SUMMARY.md), [plan 8 tuần](../project/PROJECT_PLAN.md) và [spec index](../specs/README.md). Prototype HTML dùng để xem ý tưởng cũ, chưa chứng minh đủ food-v1 và không chứng minh native/realtime/push.

[Food data spec](../specs/FOOD_DATA_SPEC.md), [dependency map](../project/TASK_DEPENDENCIES.md): task nào trước/sau/song song và cách kiểm đã được phép bắt đầu. Không có data coverage thì báo thiếu dữ liệu; lịch kiểm không là cam kết còn hàng.
