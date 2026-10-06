# Từ prototype sang React Native

[Prototype](gi-cung-duoc.html) minh họa luồng, không copy DOM/CSS vào app.

Map: HTML button → Pressable; card → View/Text; list → FlatList; input → TextInput; section → screen component. CSS token → semantic theme object. Router demo → Expo Router. JS fixture demo → repository mock chỉ trong test/story; production đọc server.

Prototype có trang chủ/tạo-vào phòng/preferences/lobby/vote/round2/result/no-match và lỗi mạng. Các lựa chọn thành viên khác là kịch bản giả lập, hiển thị rõ ở panel review. Mã phòng/QR placeholder không cấp quyền hay mở camera. Deep link Maps dùng tên món. Bộ 8 món demo cố định: buổi ăn/category minh họa thao tác UI, chưa chạy thuật toán tạo pool theo catalogue. Random trong HTML chỉ phục vụ demo; app thật dùng kết quả server.

App thật cần xác thực/SQL/RLS/realtime, snapshot version, native QR camera, secure session, safe area/font scaling/TalkBack. P1 partner/account/history chưa có UI hoàn chỉnh trong HTML; triển khai theo GM-17/18 sau core.
