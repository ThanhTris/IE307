# Baseline yêu cầu cho bộ test case

Bảng này là nguồn yêu cầu mà `scripts/test_cases.py` đọc (các dòng bắt đầu bằng `REQ-`). Mỗi test case trong `docs/testing/cases/` phải tham chiếu ít nhất một yêu cầu `Active`; mỗi yêu cầu P0 `Active` phải có ít nhất một test case. Không thay thế đặc tả: khi mâu thuẫn, theo thứ tự chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan (xem `AGENTS.md`).

Phạm vi là bản release v1 ([RELEASE_V1_SCOPE](../project/RELEASE_V1_SCOPE.md)): Android và iOS, backend Supabase hosted. Ngoài phạm vi: OCR menu, AI sở thích, weather/mood, push từ xa, Google Sign-In.

## Yêu cầu hiện hành

| ID | Ưu tiên | Yêu cầu | Nguồn | Trạng thái |
| --- | --- | --- | --- | --- |
| REQ-AUTH-01 | P0 | Khách vào app với tên hiển thị 1–24 ký tự; phiên do GoTrue cấp, tên không hợp lệ bị từ chối | GM-16, FR-01 | Active |
| REQ-AUTH-02 | P0 | Phiên lưu an toàn và khôi phục sau khi mở lại app; phiên hết hạn hoặc bị thu hồi báo lỗi xác thực và xóa dữ liệu riêng của danh tính cũ | GM-16, GM-31 | Active |
| REQ-AUTH-03 | P0 | Đăng ký, xác minh mã email, đăng nhập và khôi phục mật khẩu bằng tài khoản email; lỗi hiện ngay tại trường tương ứng | GM-35 | Active |
| REQ-AUTH-04 | P0 | Liên kết khách thành tài khoản email giữ nguyên UUID; lỗi không làm mất phiên khách | GM-35, FR-12 | Active |
| REQ-AUTH-05 | P0 | Khách chỉ dùng được luồng phòng và hồ sơ; Bạn bè, Lịch sử, Kèo nhanh, Hộp thư yêu cầu đăng nhập; khách vẫn chỉnh được giao diện và cỡ chữ | GM-35 | Active |
| REQ-AUTH-06 | P0 | Sửa tên hồ sơ và đổi mật khẩu: nút khóa khi đang gửi, lỗi giữ dữ liệu đã nhập, chỉ báo thành công sau ACK | GM-35 (G04, G05) | Active |
| REQ-AUTH-07 | P0 | Đăng xuất hoặc đổi tài khoản dừng mọi thao tác của phiên cũ trước khi gửi, xóa cache, outbox và dữ liệu riêng của danh tính cũ | GM-16, GM-31, GM-35 | Active |
| REQ-AUTH-08 | P0 | Xóa tài khoản trong app: xác nhận, xóa dữ liệu cá nhân, thu hồi phiên, về màn chào; dữ liệu người khác nguyên vẹn | GM-49, GM-53, quy định store | Active |
| REQ-ENTRY-01 | P0 | Màn chào, hướng dẫn và nhập tên khách chạy được ở lần mở đầu; mở lại tự vào Home khi phiên còn hợp lệ | GM-09, GM-25 | Active |
| REQ-ENTRY-02 | P0 | Lần đầu sau đăng nhập hỏi quyền Thông báo, Camera, Vị trí một lần; từ chối thì tính năng hỏi lại khi dùng, app vẫn chạy | ADR-026 | Active |
| REQ-ENTRY-03 | P0 | Home tự tìm phòng đang tham gia (kể cả đổi máy) và cho tiếp tục đúng màn theo trạng thái phòng | GM-44 | Active |
| REQ-ROOM-01 | P0 | Host tạo phòng với đúng 10–20 món ban đầu, độc lập quán, GPS, giờ bán; thiếu món thì cho 5–9 món qua "Dùng N món", dưới 5 món báo không đủ món | ADR-019, ADR-024 | Active |
| REQ-ROOM-02 | P0 | Vào phòng bằng mã 6 ký tự, QR hoặc liên kết: xem trước không đổi số thành viên, xác nhận mới vào; mã sai, hết hạn, phòng đầy, đã bắt đầu đều báo rõ | FR-02, FR-18, GM-22 | Active |
| REQ-ROOM-03 | P0 | Tối đa 20 thành viên; không vào trùng; người thứ 21 bị từ chối; host có thể loại thành viên | ADR-019 | Active |
| REQ-ROOM-04 | P0 | Lobby có trạng thái sẵn sàng: thành viên chưa lưu khẩu vị là "đang chọn khẩu vị", host luôn sẵn sàng; chỉ bắt đầu được khi đủ ít nhất 2 người và mọi người sẵn sàng | ADR-028 | Active |
| REQ-ROOM-05 | P0 | Chỉ host sửa thiết lập phòng; sửa không đổi (no-op) hoặc chỉ đổi giờ giữ nguyên pool và version pool; yêu cầu mới được chấp nhận tăng version phòng, ACK replay thì không | GM-19 | Active |
| REQ-ROOM-06 | P1 | Thành viên vào lại phòng ở vòng 1 sau khi thoát; phòng đã bắt đầu, người chưa vào không vào được | ADR-027 | Active |
| REQ-PREF-01 | P0 | Khẩu vị lưu mặc định theo tài khoản, chụp riêng cho từng phòng; chỉ chính người đó xem lựa chọn thô, host không xem của người khác | ADR-019, GM-17 | Active |
| REQ-PREF-02 | P0 | Bộ lọc loại món, miền, vị, bữa là ưu tiên mềm, đa nhãn (khớp khi trùng bất kỳ giá trị nào); không loại món khỏi pool, không bù món | ADR-024, ADR-025 | Active |
| REQ-PREF-03 | P1 | Ô "Tránh món gần đây" chỉ hiện khi có lịch sử cá nhân còn hạn và consent bật; món gần đây xếp cuối, vẫn được chọn khi thiếu món | ADR-028, GM-46 | Active |
| REQ-VOTE-01 | P0 | Mỗi món WANT, OK hoặc NO; chưa chọn hết thì không gửi được; thiếu phiếu không phải OK; chạm đơn, cuộn, vuốt dọc không tính phiếu | FR-05, FR-19 | Active |
| REQ-VOTE-02 | P0 | Gửi phiếu có ACK, thử lại cùng request id không nhân đôi; pending khác ACK; mất mạng sau ACK không gửi lại phiếu | GM-20, GM-31 | Active |
| REQ-VOTE-03 | P0 | Vòng 1 kiểm winner trước (cùng WANT); chưa có thì lấy món sống sót sau khi trừ hợp NO của mọi phiếu đã ACK; N=0 kết thúc `EMPTY_INTERSECTION` | ADR-019 | Active |
| REQ-VOTE-04 | P0 | Đồng hồ chờ 60 giây của mỗi vòng bắt đầu khi người đầu tiên vào phòng chờ sau ACK; mất mạng hay kết nối lại không gia hạn hoặc giảm số thành viên | ADR-019, GM-20 | Active |
| REQ-VOTE-05 | P0 | Host chỉ chốt sớm khi số người đã ACK lớn hơn một nửa roster khóa (A > M/2); host không chọn hay ép món thắng | Làm rõ 2026-10-25 | Active |
| REQ-VOTE-06 | P0 | Hết 60 giây server xử lý các phiếu hợp lệ đã nhận với quorum tối thiểu 1; thành viên chưa gửi vẫn được chuyển sang vòng sau hoặc kết quả mà không bị kẹt | ADR-019, GM-48 | Active |
| REQ-VOTE-07 | P0 | Vòng 2 có N món (N≥1) luôn mở thật; người chơi chọn REMOVE hoặc không; tối đa `max(1, ceil(0.30*N))` món được loại cho mọi N | ADR-019, ADR-023 | Active |
| REQ-VOTE-08 | P0 | Vòng 2 không tự chốt, không tự ghi KEEP cho người chưa gửi; loại hết món thì `NO_CONSENSUS/ALL_REMOVED`, còn món thì chốt theo điểm vòng 1 (`2*WANT+OK`); không bù món, không có vòng 3 | ADR-019, FR-08 | Active |
| REQ-VOTE-09 | P0 | Phiếu giữ kín bằng quyền database/RPC: người khác và host không đọc được phiếu thô, snapshot không chứa lựa chọn của người khác | AGENTS.md | Active |
| REQ-RES-01 | P0 | Kết quả do server chọn một lần, ổn định qua tải lại, thử lại và kết nối lại; app không tự tính winner hay điểm | FR-06, ADR-020 | Active |
| REQ-RES-02 | P0 | Top 3 theo thứ hạng dày, tối đa ba món kèm winner; đồng hạng xử lý bằng quy tắc tie-break đã chốt, kết quả giữ nguyên khi tải lại | ADR-020, ADR-022 | Active |
| REQ-RES-03 | P0 | Không đồng thuận hiển thị đúng lý do (`EMPTY_INTERSECTION`, `ALL_REMOVED`) và cho tạo phòng mới | ADR-019 | Active |
| REQ-RES-04 | P0 | Places và bản đồ chỉ chạy sau khi có winner, có ghi công Google; từ chối quyền vị trí, lỗi provider hoặc hết quota không đổi kết quả | GM-27, GM-30 | Active |
| REQ-RES-05 | P1 | Giá hiển thị lấy observation mới nhất theo timestamp hợp lệ; amount null hoặc timestamp trùng thì ẩn giá, không dùng giá cũ | AGENTS.md | Active |
| REQ-SOC-01 | P0 | Kết bạn hai chiều: gửi, chấp nhận, từ chối, hủy kết bạn; tìm bạn theo mã; không tự thành bạn | GM-22, GM-28 | Active |
| REQ-SOC-02 | P0 | Mời bạn vào phòng từ danh sách bạn; người nhận chấp nhận thì vào qua kiểm tra như vào bằng mã; lời mời hết hạn hoặc đã trả lời được xử lý đúng | GM-22 | Active |
| REQ-SOC-03 | P0 | Hộp thư nhận sự kiện hợp lệ (mời, kết bạn, chấp nhận, kết quả); banner khi app mở nhận dòng mới qua Realtime, mất kết nối thì đọc lại mỗi 30 giây; đánh dấu đã đọc | ADR-026, GM-23 | Active |
| REQ-HIS-01 | P0 | Lưu lịch sử là opt-in theo tài khoản (không bật mặc định); phạm vi cá nhân và nhóm độc lập; thiếu consent thì không lưu lịch sử | GM-21, ADR-026 | Active |
| REQ-HIS-02 | P0 | Xóa, thu hồi hoặc hết hạn lịch sử làm dữ liệu biến mất ở mọi lần đọc; cache không vượt sang tài khoản khác | GM-21, GM-31 | Active |
| REQ-HIS-03 | P1 | Lịch sử nhóm hiển thị danh sách "Cùng ăn" chỉ gồm người đã đồng ý | GM-42 | Active |
| REQ-RT-01 | P0 | Thay đổi version phòng đến app qua Realtime (chỉ room_id/version), app đọc lại snapshot theo contract; mất kết nối thì đọc bù và polling có backoff | GM-45 | Active |
| REQ-RT-02 | P0 | Chuyển vòng khi hết giờ chạy trên Supabase hosted không cần worker chạy trên máy (pg_cron), không phá quorum, roster, ACK | GM-48 | Active |
| REQ-RT-03 | P0 | Outbox và cache cục bộ: chỉ xếp hàng sau khi bấm Gửi, lưu trước khi gọi mạng; force-stop rồi mở lại đối chiếu server trước khi gửi lại; không gửi sai vòng hay trùng | FR-16, GM-31 | Active |
| REQ-RT-04 | P0 | Polling và effect ổn định: một request tại một thời điểm, bỏ phản hồi cũ sau khi đổi phòng hay tài khoản, backoff hữu hạn, dọn khi rời màn | GM-26, GM-45 | Active |
| REQ-SEC-01 | P0 | RLS và ACL: chỉ thành viên active đọc dữ liệu phòng; người ngoài, người bị loại không đọc được; RPC đặc quyền kiểm auth, membership, version, expiry, khóa phòng và idempotency | GM-17 | Active |
| REQ-SEC-02 | P0 | Không có service_role hay secret trong app hoặc repo; không log phiếu bầu, token, email | AGENTS.md | Active |
| REQ-SEC-03 | P0 | Dữ liệu cá nhân chỉ gửi tới Supabase và Google Places (khi có winner); không gửi sang AI mặc định; khóa Places giới hạn theo app và API | AGENTS.md, GM-50 | Active |
| REQ-DATA-01 | P0 | Catalogue có version và hash; kích hoạt nguyên tử và rollback được; importer từ chối cơ sở dữ liệu không được phép | GM-40, GM-51 | Active |
| REQ-DATA-02 | P0 | Mỗi bữa sáng, trưa, tối và ăn vặt tạo được phòng 10 món; món thiếu `mealSlots` không vào pool | GM-41, GM-51 | Active |
| REQ-DATA-03 | P0 | Mọi trường lọc đa nhãn, có nguồn; thiếu nguồn là unknown/null, không bịa món, nhãn, giá, ảnh; không tuyên bố an toàn dị ứng | GM-41, AGENTS.md | Active |
| REQ-DATA-04 | P1 | Ảnh và mô tả có tác giả, license, ghi công; thiếu căn cứ giữ null | GM-47 | Active |
| REQ-UI-01 | P0 | Màn hình dùng được ở 320, 360, 412dp và màn rộng, safe area, bàn phím không che nút chính, nút Back đúng | FR-13 | Active |
| REQ-UI-02 | P0 | Chữ phóng 200% không cắt nội dung hay nút; nhãn không bẻ giữa từ | FR-13 | Active |
| REQ-UI-03 | P0 | TalkBack/VoiceOver đọc đúng nhãn và vai trò, vùng chạm tối thiểu 48dp, có nút thay cử chỉ vuốt, giảm chuyển động được tôn trọng | FR-13 | Active |
| REQ-UI-04 | P0 | Mọi màn có trạng thái loading, rỗng, lỗi, thử lại; chế độ tối không làm mất nội dung hay độ tương phản | FR-13 | Active |
| REQ-REL-01 | P0 | Cài mới chạy được; nâng cấp từ bản trước giữ phiên và dữ liệu cục bộ hợp lệ | GM-34, GM-59 | Active |
| REQ-REL-02 | P0 | Cổng phiên bản tối thiểu: bản thấp hơn thấy màn "Cần cập nhật" kèm liên kết store; không đọc được cấu hình thì vẫn dùng bình thường | GM-54 | Active |
| REQ-REL-03 | P0 | Offline hoặc backend lỗi: app không crash, báo lỗi rõ và cho thử lại; không giả offline nhóm | AGENTS.md | Active |
| REQ-REL-04 | P0 | Liên kết chính sách quyền riêng tư, điều khoản, hỗ trợ và hướng dẫn xóa dữ liệu mở được khi chưa đăng nhập; phiên bản app hiển thị | GM-50, GM-53 | Active |
| REQ-REL-05 | P0 | Build release không chứa route dev, nút QA hay cờ giả lập; mục thông báo đẩy ẩn khi chưa cấu hình | GM-54 | Active |
| REQ-IOS-01 | P0 | iOS: quét QR bằng camera, từ chối quyền thì nhập mã tay; mô tả quyền hiển thị đúng | GM-54, GM-30 | Active |
| REQ-IOS-02 | P0 | iOS: vị trí chỉ khi dùng, từ chối thì Places giữ nguyên kết quả; phiên lưu bằng Keychain khôi phục sau khi mở lại | GM-54, GM-31 | Active |
| REQ-IOS-03 | P0 | iOS: liên kết mở app khi lạnh và khi nóng, tai thỏ, bàn phím và cử chỉ Back hoạt động | GM-30, GM-54 | Active |

## Yêu cầu cũ không còn áp dụng

Các yêu cầu trong `docs/product/FUNCTIONAL_REQUIREMENTS.md` ghi nhận ở bản đầu và đã bị thay thế bởi quyết định mới. Bộ test case không dựa vào chúng để tránh mâu thuẫn trong báo cáo.

| ID | Ưu tiên | Yêu cầu cũ | Thay bởi | Trạng thái |
| --- | --- | --- | --- | --- |
| REQ-OLD-01 | P0 | Tối đa 8 người trong một phòng (FR-02) | REQ-ROOM-03: tối đa 20 người (ADR-019) | Superseded |
| REQ-OLD-02 | P0 | Pool lọc theo quán, GPS và giờ bán (FR-04, FR-10, FR-15, FR-20) | REQ-ROOM-01: pool độc lập quán, GPS, giờ bán (ADR-019) | Superseded |
| REQ-OLD-03 | P0 | Vòng 2 giới hạn loại `min(3, floor((N-1)/2))` và N=1 bỏ REMOVE (FR-07) | REQ-VOTE-07: cap `max(1, ceil(0.30*N))` (ADR-023) | Superseded |
| REQ-OLD-04 | P0 | Không có trạng thái sẵn sàng trong lobby (ADR-019) | REQ-ROOM-04: lobby có sẵn sàng (ADR-028) | Superseded |
| REQ-OLD-05 | P2 | Weather và mood xếp hạng món (FR-21) | Hoãn sau release v1 (GM-38) | Superseded |
