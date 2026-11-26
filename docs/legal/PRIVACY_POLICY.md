---
layout: default
title: Chính sách quyền riêng tư
permalink: /privacy/
---

# Chính sách quyền riêng tư

**Nhà phát hành:** Nguyễn Thanh Trí. **Ngày hiệu lực / cập nhật lần cuối:** 2026-11-26.

Gì Cũng Được giúp một nhóm chọn món ăn. Ứng dụng không phải dịch vụ đặt bàn, đặt món, giao hàng hay thanh toán. Chính sách này mô tả dữ liệu theo phạm vi phát hành Android v1 hiện đã chốt trong repo; cần đối chiếu lại với bản build và cấu hình dịch vụ trước khi công bố.

## Đơn vị vận hành và liên hệ

- Ứng dụng: **Gì Cũng Được** (`vn.gicungduoc.mobile`).
- Nhà phát hành/pháp nhân: **Nguyễn Thanh Trí**.
- Email quyền riêng tư và hỗ trợ: [23521645@gm.uit.edu.vn](mailto:23521645@gm.uit.edu.vn).

## Dữ liệu và cách sử dụng

| Dữ liệu | Nguồn và mục đích | Nơi xử lý/chia sẻ |
| --- | --- | --- |
| Tên hiển thị, biệt danh | Người dùng nhập khi tạo hồ sơ/phiên khách hoặc tham gia phòng; dùng để hiển thị thành viên | Supabase; thành viên trong cùng phòng thấy tên hiển thị phù hợp với quyền truy cập của phòng |
| Email và thông tin xác thực | Người dùng cung cấp khi tạo hoặc liên kết tài khoản email; dùng đăng nhập, khôi phục và bảo vệ tài khoản | Supabase Auth xử lý email/xác thực. Ứng dụng không yêu cầu mật khẩu gửi qua email hỗ trợ |
| Mã tài khoản, session/token đăng nhập | Tạo bởi hệ thống xác thực để xác định phiên và gọi dịch vụ | Supabase xử lý session; token phiên được lưu cục bộ trong vùng bảo mật của hệ điều hành. Không đăng token vào log hoặc gửi cho Google Places |
| Bạn bè, lời mời, thành viên và trạng thái phòng | Tạo khi người dùng gửi/nhận lời mời hoặc tham gia phòng; dùng kết nối người dùng, quản lý phòng và đồng bộ trạng thái | Supabase; chỉ người có quyền theo quan hệ/phòng đọc được các trường được phép |
| Tùy chọn món ăn, phiếu lựa chọn và kết quả phòng | Người dùng chọn sở thích và gửi lựa chọn để tạo kết quả chung. Phiếu chi tiết chỉ phục vụ xử lý phiên; không hiển thị phiếu riêng của người khác | Supabase. Không dùng để quảng cáo hoặc huấn luyện mô hình AI |
| Lịch sử bữa ăn và lựa chọn chia sẻ lịch sử | Chỉ lưu khi người dùng bật tùy chọn lịch sử tương ứng; hỗ trợ xem cá nhân và tính năng nhóm theo lựa chọn thành viên | Supabase. Lịch sử được lưu tối đa 30 ngày theo thời hạn/đồng thuận trong dữ liệu; có thể xóa hoặc rút đồng thuận trong ứng dụng |
| Vị trí thiết bị | Khi người dùng chọn tìm quán gần kết quả, ứng dụng xin quyền vị trí foreground và lấy tọa độ hiện tại; từ chối quyền vẫn dùng được phần chọn món | Tọa độ được gửi trực tiếp từ ứng dụng tới Google Places để tìm kết quả quanh vị trí. Repo hiện không gửi GPS vào Supabase, phòng, lịch sử hay log. Google xử lý yêu cầu theo chính sách/dịch vụ của họ |
| Dữ liệu quán từ Google Places | Tên, địa chỉ, mã địa điểm và tọa độ kết quả để hiển thị quán gần món thắng cuộc | Ứng dụng gọi Google Places API trực tiếp. Không dùng dữ liệu này để lập chỉ mục riêng; mã địa điểm có thể được dùng để mở thông tin mới từ Google |
| Camera/QR | Camera chỉ được bật sau khi người dùng chọn quét QR; ứng dụng đọc mã mời trên thiết bị | Ứng dụng không tải ảnh/video camera lên máy chủ. Mã mời chỉ được gửi tới Supabase khi người dùng chủ động xem trước/gửi yêu cầu tham gia |
| Dữ liệu cần thiết lưu trên thiết bị | Session bảo mật, cache/nháp/outbox phiên và dữ liệu giao diện để tiếp tục hoạt động | Lưu cục bộ; dữ liệu riêng tư được dọn khi đăng xuất, đổi tài khoản hoặc xóa tài khoản theo khả năng của phiên bản ứng dụng |

**Không thu thập trong phạm vi v1 đã chốt:** danh bạ, SMS, dữ liệu thanh toán, dữ liệu quảng cáo, theo dõi vị trí nền hoặc ảnh/video camera. Push từ xa bị hoãn và mục cài đặt push được ẩn trong bản v1 theo phạm vi release. Nếu bản build bật push hoặc crash reporting/analytics thì phải cập nhật bảng này và câu trả lời store trước khi phát hành.

## Bên cung cấp dịch vụ

- **Supabase**: xác thực, lưu trữ và cung cấp backend cho tài khoản, phòng, lời mời, đồng thuận và lịch sử theo quyền. Dữ liệu có thể được xử lý tại hạ tầng của nhà cung cấp theo cấu hình dự án.
- **Google Places API**: nhận truy vấn món ăn cùng vị trí gần đúng/current coordinates khi người dùng yêu cầu tìm quán. Chính sách và điều khoản Google áp dụng cho dữ liệu Google Places.
- **GitHub Pages**: lưu trữ các trang thông tin pháp lý công khai khi trang được bật.

Ứng dụng không bán dữ liệu cá nhân, không dùng dữ liệu cho quảng cáo cá nhân hóa và không chia sẻ dữ liệu nhóm với AI. Không có SDK quảng cáo trong phạm vi v1 hiện được mô tả ở hồ sơ release.

## Lưu trữ và xóa

- Hồ sơ, tên hiển thị, email tài khoản, mã tài khoản và sở thích giữ trong thời gian tài khoản còn hoạt động; bị xóa khi tài khoản được xóa. Session cục bộ hết hạn/được xoay vòng theo xác thực và được xóa khi đăng xuất hoặc xóa tài khoản.
- Bạn bè giữ tới khi một bên bỏ kết bạn hoặc xóa tài khoản. Lời mời bạn bè hết hạn sau 7 ngày; lời mời phòng hết hạn khi phòng hết hạn hoặc tối đa 7 ngày. Bản ghi lời mời/sự kiện/inbox đã hết hạn được dọn trong chu kỳ retention tiếp theo (tối đa thêm 24 giờ theo lịch cleanup hiện hành).
- Phiếu lựa chọn, thành viên, preferences gắn với phòng và dữ liệu vận hành của phòng được dọn sau khi phòng kết thúc/hết hạn cộng 24 giờ. Phòng chưa kết thúc được giữ để các thành viên hoàn tất phiên.
- Cache và outbox riêng tư trên thiết bị hết hạn sau 24 giờ; đăng xuất, đổi tài khoản hoặc xóa tài khoản cũng kích hoạt việc dọn dữ liệu riêng tư cục bộ.
- Lịch sử cá nhân/nhóm chỉ phát sinh theo lựa chọn đồng thuận và được giữ tối đa 30 ngày kể từ khi kết quả được chốt, hoặc ngắn hơn nếu đồng thuận hết hạn; rút đồng thuận hoặc xóa lịch sử sẽ xóa phần tương ứng theo quyền.
- Khi xóa tài khoản, hồ sơ, quan hệ bạn bè/lời mời, thiết bị push nếu có, preferences, đồng thuận, lịch sử cá nhân và dữ liệu phòng đã kết thúc liên quan sẽ được xóa. Trong lịch sử nhóm còn hợp lệ của thành viên khác, tên có thể được thay bằng “Thành viên đã xóa”; không giữ ID/tên tài khoản đã xóa. Tài khoản đang ở phòng hoạt động chưa thể xóa cho tới khi rời/kết thúc phòng.
- Bản sao lưu do nhà cung cấp vận hành có thể lưu tới khi hết chu kỳ backup/retention cấu hình cho project. Thời hạn backup của production phải được đối chiếu với cấu hình Supabase trước khi phát hành; không dùng bản sao lưu làm hồ sơ người dùng hoạt động.

## Quyền và lựa chọn

Bạn có thể từ chối quyền vị trí hoặc camera; các tính năng cần quyền đó sẽ không hoạt động, nhưng các chức năng khác vẫn có thể dùng. Bạn có thể quản lý đồng thuận lịch sử, yêu cầu xóa lịch sử, đăng xuất hoặc xóa tài khoản trong ứng dụng khi phiên bản đã hỗ trợ. Để yêu cầu xóa từ web, xem [Yêu cầu xóa tài khoản](https://thanhtris.github.io/IE307/delete-account/).

## An toàn

Ứng dụng dùng xác thực và quyền truy cập theo tài khoản/phòng, truyền dữ liệu qua HTTPS và không đặt khóa quản trị Supabase trong ứng dụng. Không gửi mật khẩu, mã xác thực, session token hoặc dữ liệu thanh toán qua email hỗ trợ.

## Thay đổi chính sách

Chúng tôi sẽ cập nhật trang này khi cách xử lý dữ liệu thay đổi. Ngày hiệu lực và cập nhật lần cuối được ghi ở đầu trang.

## Tóm tắt bằng tiếng Anh

Gì Cũng Được (“Whatever Works”), published by Nguyễn Thanh Trí, helps a group choose a meal. Supabase processes authentication, display names, room membership, preferences, submitted choices, and consent-based meal history. If you ask to find nearby places and grant foreground location access, the app sends your current coordinates and dish query directly to Google Places; the app does not send GPS to Supabase or retain it in room history. Camera access is used to scan an invitation QR code on-device; camera images and videos are not uploaded. Personal and group history is opt-in and retained for no more than 30 days under the applicable consent. Account and data deletion is available through the app or through the web request page. Remote push notifications are excluded from the approved v1 release scope. Effective date / last updated: 2026-11-26.

## Tham chiếu chính sách

- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Apple App Review Guidelines, section 5.1](https://developer.apple.com/app-store/review/guidelines/)
- [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
