# Đối chiếu 8 ứng dụng giảng viên gợi ý

Ngày nghiên cứu: 2026-10-07. Phương pháp: đọc website nhà phát triển và mô tả/changelog trên store; chưa cài thử hay đo hiệu năng. Tính năng là công bố của nhà phát triển, không phải kết quả kiểm thử độc lập. Cột hạn chế gồm đánh giá phù hợp với đồ án và phần chưa được tài liệu công khai giải thích; không khẳng định app thiếu chức năng chỉ vì nguồn không nhắc. Không dùng lượt tải, rating ít mẫu hoặc số liệu marketing để chứng minh chất lượng.

## Nhận diện đúng sản phẩm

QuickBite có nhiều app trùng tên: tài liệu này dùng sản phẩm chọn quán nhóm của Skylark Creations (quickbite.food), không dùng app giao hàng/POS. PlateMatch dùng platematch.app, không trộn platematch.ai hay app biển số xe. BiteMood dùng Android package com.bitemood.app; website bitemoodapp.com không mở được qua công cụ, nên dùng Google Play. Hangrily được đánh giá từ website; chưa xác minh bản cài native/store.

## Điểm mạnh, giới hạn và bài học

| App và nguồn chính | Công bố đáng học | Giới hạn/đánh đổi và áp dụng |
| --- | --- | --- |
| [Tonight’s Bite — App Store](https://apps.apple.com/us/app/tonights-bite-happy-hour/id6757810400) | Yes/no/maybe, nhóm, bộ lọc quán; changelog có kết bạn QR/link và mời phòng/push. | Tập trung chọn quán, ưu đãi mạnh ở Nam California; không mặc định phù hợp dữ liệu Việt Nam. Học luồng vào nhóm nhanh. Ba mức chọn/kết bạn không phải điểm mới của mình. |
| [QuickBite — Skylark](https://skylarkcreations.com/projects/quickbite) | 10 quán, Yes=2/Maybe=1/No=0; điểm kết hợp khoảng cách/giá/giờ, top 3 có giải thích; web. | No=0 không phải veto cứng theo mô tả; người vào muộn có thể đổi kết quả. Học giải thích, nhưng giữ NO loại trừ và kết quả ổn định. Phụ thuộc dữ liệu Places. |
| [PlateMatch](https://platematch.app/) và [FAQ](https://platematch.app/faq) | Session không tài khoản, code, yes/no/love; recipe/quán, lưu kế hoạch và danh sách mua sắm; browser tối đa 20 người. | Phạm vi rộng về nấu ăn; chưa công bố rõ công thức thỏa hiệp khi không có giao. Học guest nhanh, tách phiên ngắn khỏi tài khoản lưu lâu; không mở rộng sang quản lý bếp. |
| [BiteMood — Google Play](https://play.google.com/store/apps/details?id=com.bitemood.app) | Chọn cấp món, kết nối cặp đôi, match khi cùng thích; solo, favorites và cá nhân hóa. | Mô tả thiên cặp đôi; chưa xác minh cách xử lý nhóm lớn/no-match/retry. Học luồng chọn món trước, avatar bạn quen. Nhóm 2–8 là phạm vi cần tự kiểm chứng. |
| [Vote to Eat — App Store](https://apps.apple.com/us/app/vote-to-eat/id6757985548) | Nhóm, dislikes, AI gợi ý, lịch sử, một phiên active mỗi nhóm; một thuê bao cho nhóm. | Chưa công bố chi tiết scoring/độ đúng AI; dịch vụ thêm chi phí và phạm vi dữ liệu. Học lịch sử/chống lặp và tránh phiên chồng, dùng luật minh bạch trước AI. |
| [Tenderloin — App Store](https://apps.apple.com/us/app/tenderloin/id6791118651) | Mã 4 chữ, guest, deck đổi thứ tự theo like realtime, unanimous match; host xem top picks khi không match, mở Maps. | Đổi thứ tự theo phiếu có thể ảnh hưởng lựa chọn; fallback host chọn không bảo đảm veto như mình. Học chuyển tiếp sau chốt; giữ pool/roster ổn định và phiếu kín. Đây là phân tích thiết kế, chưa đo thực nghiệm. |
| [Hangrily — website](https://hangrily.app/) | Solo/couple/group tối đa 10, sở thích/giá/khoảng cách/mood, partner link và ba vòng. | Chưa có bằng chứng độc lập cho tốc độ/tỷ lệ match quảng cáo; công thức democratic voting không rõ. Học input bối cảnh gọn; không sao chép AI hoặc lời hứa luôn thành công. |
| [Chowy — website](https://www.chowy.app/) | Vote recipe trong household; kế hoạch bữa ăn, pantry/list realtime, nhập recipe từ video, OCR bill. | Phạm vi quản lý bếp lớn; AI/import/OCR là phần Pro theo công bố. Học nhóm quen và lịch sử chung; không đưa pantry/OCR/AI vào core hai tháng. |

## Kết luận nghiên cứu

1. Swipe, ba mức chọn, code, friends, push và lịch sử đều đã có tiền lệ. Không dùng chúng riêng lẻ để tuyên bố mới.
2. QuickBite là đối chiếu gần nhất về giải thích điểm; PlateMatch/QuickBite chứng minh giao diện responsive có thể làm phần lớn luồng cơ bản.
3. Ba cải thiện có thể bảo vệ bằng evidence: thỏa hiệp không vi phạm NO; đồng bộ/pending đúng khi mạng yếu; bối cảnh Việt Nam có nguồn và giới hạn rõ.
4. So sánh bằng cùng kịch bản/mẫu người dùng, không suy từ lời giới thiệu. Nếu muốn kết luận app khác xử lý lỗi kém, phải cài thử có consent và ghi phiên bản/thiết bị.

## Nguồn kỹ thuật đã đọc

- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/): remote push Android cần development build từ SDK 53, không lấy Expo Go làm evidence push.
- [Expo Push overview](https://docs.expo.dev/push-notifications/overview/) và [FAQ](https://docs.expo.dev/push-notifications/faq/): server gửi qua Expo/FCM; cần kiểm receipt/retry và giới hạn thực tế.
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/): lưu cục bộ; nhóm vẫn phải tự thiết kế outbox và đồng bộ, không tự có cơ chế sync.
- [Supabase Realtime](https://supabase.com/docs/guides/realtime/postgres-changes): tín hiệu thay đổi dữ liệu không thay transaction/RLS hay queue offline.
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/): quyền, định vị/geocoding cần thử trên Android và có fallback.
- [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): mở tìm kiếm/dẫn đường không cần API key; không cung cấp danh sách quán vào app hoặc cam kết bán kính.

[Kế hoạch cải thiện](../project/IMPROVEMENT_PLAN_2026-10-07.md) đối chiếu đủ 9 góp ý và tác động task.
