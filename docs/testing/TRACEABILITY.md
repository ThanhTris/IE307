# Truy vết yêu cầu → test case → test tự động

Sinh bằng `python scripts/test_cases.py --write`; không sửa tay. Yêu cầu Superseded không bắt buộc có test case.

| Yêu cầu | Ưu tiên | Nội dung | Test case | Có tự động | Pass | Fail |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-AUTH-01 | P0 | Khách vào app với tên hiển thị 1–24 ký tự; phiên do GoTrue cấp, tên không hợp lệ bị từ chối (Active) | TC-AUTH-001, TC-AUTH-002 | 2/2 | 2 | 0 |
| REQ-AUTH-02 | P0 | Phiên lưu an toàn và khôi phục sau khi mở lại app; phiên hết hạn hoặc bị thu hồi báo lỗi xác thực và xóa dữ liệu riêng của danh tính cũ (Active) | TC-AUTH-003, TC-AUTH-004 | 2/2 | 1 | 0 |
| REQ-AUTH-03 | P0 | Đăng ký, xác minh mã email, đăng nhập và khôi phục mật khẩu bằng tài khoản email; lỗi hiện ngay tại trường tương ứng (Active) | TC-AUTH-007, TC-AUTH-008, TC-AUTH-009 | 0/3 | 0 | 0 |
| REQ-AUTH-04 | P0 | Liên kết khách thành tài khoản email giữ nguyên UUID; lỗi không làm mất phiên khách (Active) | TC-AUTH-010 | 0/1 | 0 | 0 |
| REQ-AUTH-05 | P0 | Khách chỉ dùng được luồng phòng và hồ sơ; Bạn bè, Lịch sử, Kèo nhanh, Hộp thư yêu cầu đăng nhập; khách vẫn chỉnh được giao diện và cỡ chữ (Active) | TC-AUTH-011 | 0/1 | 0 | 0 |
| REQ-AUTH-06 | P0 | Sửa tên hồ sơ và đổi mật khẩu: nút khóa khi đang gửi, lỗi giữ dữ liệu đã nhập, chỉ báo thành công sau ACK (Active) | TC-AUTH-012, TC-AUTH-013 | 0/2 | 0 | 0 |
| REQ-AUTH-07 | P0 | Đăng xuất hoặc đổi tài khoản dừng mọi thao tác của phiên cũ trước khi gửi, xóa cache, outbox và dữ liệu riêng của danh tính cũ (Active) | TC-AUTH-005, TC-AUTH-006, TC-RT-009, TC-VOTE1-022 | 4/4 | 4 | 0 |
| REQ-AUTH-08 | P0 | Xóa tài khoản trong app: xác nhận, xóa dữ liệu cá nhân, thu hồi phiên, về màn chào; dữ liệu người khác nguyên vẹn (Active) | TC-AUTH-014, TC-IOS-008, TC-SEC-010 | 0/3 | 0 | 0 |
| REQ-ENTRY-01 | P0 | Màn chào, hướng dẫn và nhập tên khách chạy được ở lần mở đầu; mở lại tự vào Home khi phiên còn hợp lệ (Active) | TC-ENTRY-001, TC-ENTRY-005, TC-ENTRY-006 | 3/3 | 3 | 0 |
| REQ-ENTRY-02 | P0 | Lần đầu sau đăng nhập hỏi quyền Thông báo, Camera, Vị trí một lần; từ chối thì tính năng hỏi lại khi dùng, app vẫn chạy (Active) | TC-ENTRY-002, TC-IOS-010, TC-REL-011 | 1/3 | 1 | 0 |
| REQ-ENTRY-03 | P0 | Home tự tìm phòng đang tham gia (kể cả đổi máy) và cho tiếp tục đúng màn theo trạng thái phòng (Active) | TC-ENTRY-003, TC-ENTRY-004 | 2/2 | 1 | 0 |
| REQ-ROOM-01 | P0 | Host tạo phòng với đúng 10–20 món ban đầu, độc lập quán, GPS, giờ bán; thiếu món thì cho 5–9 món qua "Dùng N món", dưới 5 món báo không đủ món (Active) | TC-ROOM-001, TC-ROOM-002, TC-ROOM-003, TC-ROOM-004, TC-ROOM-018 | 5/5 | 1 | 0 |
| REQ-ROOM-02 | P0 | Vào phòng bằng mã 6 ký tự, QR hoặc liên kết: xem trước không đổi số thành viên, xác nhận mới vào; mã sai, hết hạn, phòng đầy, đã bắt đầu đều báo rõ (Active) | TC-ROOM-005, TC-ROOM-006, TC-ROOM-007, TC-ROOM-008, TC-ROOM-009, TC-ROOM-020 | 6/6 | 3 | 0 |
| REQ-ROOM-03 | P0 | Tối đa 20 thành viên; không vào trùng; người thứ 21 bị từ chối; host có thể loại thành viên (Active) | TC-ROOM-010, TC-ROOM-011, TC-ROOM-012 | 3/3 | 1 | 0 |
| REQ-ROOM-04 | P0 | Lobby có trạng thái sẵn sàng: thành viên chưa lưu khẩu vị là "đang chọn khẩu vị", host luôn sẵn sàng; chỉ bắt đầu được khi đủ ít nhất 2 người và mọi người sẵn sàng (Active) | TC-ROOM-013, TC-ROOM-014, TC-ROOM-019 | 3/3 | 0 | 0 |
| REQ-ROOM-05 | P0 | Chỉ host sửa thiết lập phòng; sửa không đổi (no-op) hoặc chỉ đổi giờ giữ nguyên pool và version pool; yêu cầu mới được chấp nhận tăng version phòng, ACK replay thì không (Active) | TC-ROOM-015, TC-ROOM-016, TC-ROOM-021 | 3/3 | 0 | 0 |
| REQ-ROOM-06 | P1 | Thành viên vào lại phòng ở vòng 1 sau khi thoát; phòng đã bắt đầu, người chưa vào không vào được (Active) | TC-ROOM-017 | 1/1 | 0 | 0 |
| REQ-PREF-01 | P0 | Khẩu vị lưu mặc định theo tài khoản, chụp riêng cho từng phòng; chỉ chính người đó xem lựa chọn thô, host không xem của người khác (Active) | TC-PREF-001, TC-PREF-002, TC-PREF-007, TC-PREF-008 | 4/4 | 2 | 0 |
| REQ-PREF-02 | P0 | Bộ lọc loại món, miền, vị, bữa là ưu tiên mềm, đa nhãn (khớp khi trùng bất kỳ giá trị nào); không loại món khỏi pool, không bù món (Active) | TC-PREF-003, TC-PREF-004, TC-PREF-010 | 3/3 | 1 | 0 |
| REQ-PREF-03 | P1 | Ô "Tránh món gần đây" chỉ hiện khi có lịch sử cá nhân còn hạn và consent bật; món gần đây xếp cuối, vẫn được chọn khi thiếu món (Active) | TC-PREF-005, TC-PREF-006 | 2/2 | 1 | 0 |
| REQ-VOTE-01 | P0 | Mỗi món WANT, OK hoặc NO; chưa chọn hết thì không gửi được; thiếu phiếu không phải OK; chạm đơn, cuộn, vuốt dọc không tính phiếu (Active) | TC-VOTE1-001, TC-VOTE1-002, TC-VOTE1-003, TC-VOTE1-004 | 3/4 | 3 | 0 |
| REQ-VOTE-02 | P0 | Gửi phiếu có ACK, thử lại cùng request id không nhân đôi; pending khác ACK; mất mạng sau ACK không gửi lại phiếu (Active) | TC-IOS-007, TC-VOTE1-006, TC-VOTE1-007, TC-VOTE1-008 | 3/4 | 2 | 0 |
| REQ-VOTE-03 | P0 | Vòng 1 kiểm winner trước (cùng WANT); chưa có thì lấy món sống sót sau khi trừ hợp NO của mọi phiếu đã ACK; N=0 kết thúc `EMPTY_INTERSECTION` (Active) | TC-VOTE1-010, TC-VOTE1-011, TC-VOTE1-012 | 3/3 | 1 | 0 |
| REQ-VOTE-04 | P0 | Đồng hồ chờ 60 giây của mỗi vòng bắt đầu khi người đầu tiên vào phòng chờ sau ACK; mất mạng hay kết nối lại không gia hạn hoặc giảm số thành viên (Active) | TC-VOTE1-013, TC-VOTE1-014 | 1/2 | 0 | 0 |
| REQ-VOTE-05 | P0 | Host chỉ chốt sớm khi số người đã ACK lớn hơn một nửa roster khóa (A > M/2); host không chọn hay ép món thắng (Active) | TC-VOTE1-015, TC-VOTE1-016 | 2/2 | 2 | 0 |
| REQ-VOTE-06 | P0 | Hết 60 giây server xử lý các phiếu hợp lệ đã nhận với quorum tối thiểu 1; thành viên chưa gửi vẫn được chuyển sang vòng sau hoặc kết quả mà không bị kẹt (Active) | TC-VOTE1-017, TC-VOTE1-018, TC-VOTE2-011 | 3/3 | 0 | 0 |
| REQ-VOTE-07 | P0 | Vòng 2 có N món (N≥1) luôn mở thật; người chơi chọn REMOVE hoặc không; tối đa `max(1, ceil(0.30*N))` món được loại cho mọi N (Active) | TC-VOTE2-001, TC-VOTE2-002, TC-VOTE2-003, TC-VOTE2-004, TC-VOTE2-009, TC-VOTE2-013 | 6/6 | 5 | 0 |
| REQ-VOTE-08 | P0 | Vòng 2 không tự chốt, không tự ghi KEEP cho người chưa gửi; loại hết món thì `NO_CONSENSUS/ALL_REMOVED`, còn món thì chốt theo điểm vòng 1 (`2*WANT+OK`); không bù món, không có vòng 3 (Active) | TC-VOTE2-005, TC-VOTE2-006, TC-VOTE2-007, TC-VOTE2-010 | 4/4 | 1 | 0 |
| REQ-VOTE-09 | P0 | Phiếu giữ kín bằng quyền database/RPC: người khác và host không đọc được phiếu thô, snapshot không chứa lựa chọn của người khác (Active) | TC-PREF-009, TC-SEC-004, TC-VOTE1-020 | 3/3 | 0 | 0 |
| REQ-RES-01 | P0 | Kết quả do server chọn một lần, ổn định qua tải lại, thử lại và kết nối lại; app không tự tính winner hay điểm (Active) | TC-RES-003, TC-RES-004, TC-RES-012 | 3/3 | 2 | 0 |
| REQ-RES-02 | P0 | Top 3 theo thứ hạng dày, tối đa ba món kèm winner; đồng hạng xử lý bằng quy tắc tie-break đã chốt, kết quả giữ nguyên khi tải lại (Active) | TC-RES-001, TC-RES-002, TC-VOTE2-008 | 3/3 | 1 | 1 |
| REQ-RES-03 | P0 | Không đồng thuận hiển thị đúng lý do (`EMPTY_INTERSECTION`, `ALL_REMOVED`) và cho tạo phòng mới (Active) | TC-RES-005 | 1/1 | 1 | 0 |
| REQ-RES-04 | P0 | Places và bản đồ chỉ chạy sau khi có winner, có ghi công Google; từ chối quyền vị trí, lỗi provider hoặc hết quota không đổi kết quả (Active) | TC-RES-006, TC-RES-007, TC-RES-008, TC-RES-011 | 4/4 | 3 | 0 |
| REQ-RES-05 | P1 | Giá hiển thị lấy observation mới nhất theo timestamp hợp lệ; amount null hoặc timestamp trùng thì ẩn giá, không dùng giá cũ (Active) | TC-DATA-008, TC-RES-010 | 2/2 | 2 | 0 |
| REQ-SOC-01 | P0 | Kết bạn hai chiều: gửi, chấp nhận, từ chối, hủy kết bạn; tìm bạn theo mã; không tự thành bạn (Active) | TC-SOC-001, TC-SOC-002, TC-SOC-003 | 3/3 | 0 | 0 |
| REQ-SOC-02 | P0 | Mời bạn vào phòng từ danh sách bạn; người nhận chấp nhận thì vào qua kiểm tra như vào bằng mã; lời mời hết hạn hoặc đã trả lời được xử lý đúng (Active) | TC-SOC-005, TC-SOC-006 | 2/2 | 0 | 0 |
| REQ-SOC-03 | P0 | Hộp thư nhận sự kiện hợp lệ (mời, kết bạn, chấp nhận, kết quả); banner khi app mở nhận dòng mới qua Realtime, mất kết nối thì đọc lại mỗi 30 giây; đánh dấu đã đọc (Active) | TC-RT-011, TC-SOC-007, TC-SOC-008, TC-SOC-009, TC-SOC-010, TC-SOC-011, TC-SOC-013 | 7/7 | 4 | 0 |
| REQ-HIS-01 | P0 | Lưu lịch sử là opt-in theo tài khoản (không bật mặc định); phạm vi cá nhân và nhóm độc lập; thiếu consent thì không lưu lịch sử (Active) | TC-HIS-001, TC-HIS-002, TC-HIS-003, TC-HIS-010 | 4/4 | 2 | 0 |
| REQ-HIS-02 | P0 | Xóa, thu hồi hoặc hết hạn lịch sử làm dữ liệu biến mất ở mọi lần đọc; cache không vượt sang tài khoản khác (Active) | TC-HIS-004, TC-HIS-005, TC-HIS-006, TC-HIS-007, TC-RES-014 | 5/5 | 3 | 0 |
| REQ-HIS-03 | P1 | Lịch sử nhóm hiển thị danh sách "Cùng ăn" chỉ gồm người đã đồng ý (Active) | TC-HIS-008 | 1/1 | 0 | 0 |
| REQ-RT-01 | P0 | Thay đổi version phòng đến app qua Realtime (chỉ room_id/version), app đọc lại snapshot theo contract; mất kết nối thì đọc bù và polling có backoff (Active) | TC-RT-001, TC-RT-002, TC-RT-003, TC-RT-004, TC-RT-012 | 5/5 | 3 | 0 |
| REQ-RT-02 | P0 | Chuyển vòng khi hết giờ chạy trên Supabase hosted không cần worker chạy trên máy (pg_cron), không phá quorum, roster, ACK (Active) | TC-RT-005 | 0/1 | 0 | 0 |
| REQ-RT-03 | P0 | Outbox và cache cục bộ: chỉ xếp hàng sau khi bấm Gửi, lưu trước khi gọi mạng; force-stop rồi mở lại đối chiếu server trước khi gửi lại; không gửi sai vòng hay trùng (Active) | TC-RT-006, TC-RT-007, TC-RT-013, TC-VOTE1-009, TC-VOTE2-012 | 4/5 | 3 | 0 |
| REQ-RT-04 | P0 | Polling và effect ổn định: một request tại một thời điểm, bỏ phản hồi cũ sau khi đổi phòng hay tài khoản, backoff hữu hạn, dọn khi rời màn (Active) | TC-RT-008, TC-RES-009, TC-VOTE1-019, TC-VOTE1-021 | 4/4 | 4 | 0 |
| REQ-SEC-01 | P0 | RLS và ACL: chỉ thành viên active đọc dữ liệu phòng; người ngoài, người bị loại không đọc được; RPC đặc quyền kiểm auth, membership, version, expiry, khóa phòng và idempotency (Active) | TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-011, TC-SOC-012 | 5/5 | 1 | 0 |
| REQ-SEC-02 | P0 | Không có service_role hay secret trong app hoặc repo; không log phiếu bầu, token, email (Active) | TC-SEC-005, TC-SEC-006, TC-SEC-007, TC-SEC-008 | 3/4 | 3 | 0 |
| REQ-SEC-03 | P0 | Dữ liệu cá nhân chỉ gửi tới Supabase và Google Places (khi có winner); không gửi sang AI mặc định; khóa Places giới hạn theo app và API (Active) | TC-SEC-009, TC-SEC-012 | 0/2 | 0 | 0 |
| REQ-DATA-01 | P0 | Catalogue có version và hash; kích hoạt nguyên tử và rollback được; importer từ chối cơ sở dữ liệu không được phép (Active) | TC-DATA-001, TC-DATA-002, TC-DATA-003 | 2/3 | 2 | 0 |
| REQ-DATA-02 | P0 | Mỗi bữa sáng, trưa, tối và ăn vặt tạo được phòng 10 món; món thiếu `mealSlots` không vào pool (Active) | TC-DATA-004, TC-DATA-005, TC-DATA-010 | 2/3 | 1 | 0 |
| REQ-DATA-03 | P0 | Mọi trường lọc đa nhãn, có nguồn; thiếu nguồn là unknown/null, không bịa món, nhãn, giá, ảnh; không tuyên bố an toàn dị ứng (Active) | TC-DATA-006, TC-DATA-007 | 2/2 | 2 | 0 |
| REQ-DATA-04 | P1 | Ảnh và mô tả có tác giả, license, ghi công; thiếu căn cứ giữ null (Active) | TC-DATA-009 | 1/1 | 1 | 0 |
| REQ-UI-01 | P0 | Màn hình dùng được ở 320, 360, 412dp và màn rộng, safe area, bàn phím không che nút chính, nút Back đúng (Active) | TC-UI-001, TC-UI-006, TC-UI-010, TC-UI-011, TC-UI-013 | 2/5 | 1 | 0 |
| REQ-UI-02 | P0 | Chữ phóng 200% không cắt nội dung hay nút; nhãn không bẻ giữa từ (Active) | TC-IOS-009, TC-UI-002, TC-UI-012 | 1/3 | 0 | 0 |
| REQ-UI-03 | P0 | TalkBack/VoiceOver đọc đúng nhãn và vai trò, vùng chạm tối thiểu 48dp, có nút thay cử chỉ vuốt, giảm chuyển động được tôn trọng (Active) | TC-RES-015, TC-UI-003, TC-UI-004, TC-UI-005, TC-VOTE1-005 | 5/5 | 3 | 0 |
| REQ-UI-04 | P0 | Mọi màn có trạng thái loading, rỗng, lỗi, thử lại; chế độ tối không làm mất nội dung hay độ tương phản (Active) | TC-HIS-009, TC-RES-013, TC-SOC-004, TC-UI-007, TC-UI-008, TC-UI-009 | 5/6 | 5 | 0 |
| REQ-REL-01 | P0 | Cài mới chạy được; nâng cấp từ bản trước giữ phiên và dữ liệu cục bộ hợp lệ (Active) | TC-REL-001, TC-REL-002, TC-REL-010 | 0/3 | 0 | 0 |
| REQ-REL-02 | P0 | Cổng phiên bản tối thiểu: bản thấp hơn thấy màn "Cần cập nhật" kèm liên kết store; không đọc được cấu hình thì vẫn dùng bình thường (Active) | TC-REL-003, TC-REL-004 | 2/2 | 0 | 0 |
| REQ-REL-03 | P0 | Offline hoặc backend lỗi: app không crash, báo lỗi rõ và cho thử lại; không giả offline nhóm (Active) | TC-RT-010, TC-REL-005, TC-REL-012 | 1/3 | 1 | 0 |
| REQ-REL-04 | P0 | Liên kết chính sách quyền riêng tư, điều khoản, hỗ trợ và hướng dẫn xóa dữ liệu mở được khi chưa đăng nhập; phiên bản app hiển thị (Active) | TC-REL-006, TC-REL-007 | 0/2 | 0 | 0 |
| REQ-REL-05 | P0 | Build release không chứa route dev, nút QA hay cờ giả lập; mục thông báo đẩy ẩn khi chưa cấu hình (Active) | TC-REL-008, TC-REL-009 | 2/2 | 0 | 0 |
| REQ-IOS-01 | P0 | iOS: quét QR bằng camera, từ chối quyền thì nhập mã tay; mô tả quyền hiển thị đúng (Active) | TC-IOS-001, TC-IOS-002 | 0/2 | 0 | 0 |
| REQ-IOS-02 | P0 | iOS: vị trí chỉ khi dùng, từ chối thì Places giữ nguyên kết quả; phiên lưu bằng Keychain khôi phục sau khi mở lại (Active) | TC-IOS-003, TC-IOS-004 | 0/2 | 0 | 0 |
| REQ-IOS-03 | P0 | iOS: liên kết mở app khi lạnh và khi nóng, tai thỏ, bàn phím và cử chỉ Back hoạt động (Active) | TC-IOS-005, TC-IOS-006 | 0/2 | 0 | 0 |
| REQ-OLD-01 | P0 | Tối đa 8 người trong một phòng (FR-02) (Superseded) | — | 0/0 | 0 | 0 |
| REQ-OLD-02 | P0 | Pool lọc theo quán, GPS và giờ bán (FR-04, FR-10, FR-15, FR-20) (Superseded) | — | 0/0 | 0 | 0 |
| REQ-OLD-03 | P0 | Vòng 2 giới hạn loại `min(3, floor((N-1)/2))` và N=1 bỏ REMOVE (FR-07) (Superseded) | — | 0/0 | 0 | 0 |
| REQ-OLD-04 | P0 | Không có trạng thái sẵn sàng trong lobby (ADR-019) (Superseded) | — | 0/0 | 0 | 0 |
| REQ-OLD-05 | P2 | Weather và mood xếp hạng món (FR-21) (Superseded) | — | 0/0 | 0 | 0 |

## Test case → test tự động

| Test case | Test tự động |
| --- | --- |
| TC-AUTH-001 | `mobile/tests/component/guestEntryScreen.test.tsx::trimmed Unicode name is submitted once and remains locked after acceptance`<br>`mobile/tests/unit/authTransport.test.ts::anonymous signup sends only display name; verified user.id owns identity` |
| TC-AUTH-002 | `mobile/tests/unit/authTransport.test.ts::reject unsafe endpoint %s`<br>`mobile/tests/component/guestEntryScreen.test.tsx::failure keeps the name for explicit retry and Back does not submit` |
| TC-AUTH-003 | `mobile/tests/unit/authSession.test.ts::restart restores the same caller after server verification`<br>`mobile/tests/unit/authSession.test.ts::existing secure session prevents silently creating a second guest` |
| TC-AUTH-004 | `mobile/tests/unit/authSession.test.ts::revoked refresh loses session, clears storage and private cache`<br>`mobile/tests/unit/roomRepository.test.ts::does not relabel a revoked stored session as a fresh guest opportunity` |
| TC-AUTH-005 | `mobile/tests/unit/authSession.test.ts::logout clears locally even when remote revoke is offline`<br>`mobile/tests/unit/authSession.test.ts::business response received after logout is rejected before exposure to caller` |
| TC-AUTH-006 | `mobile/tests/unit/authSession.test.ts::identity change returned by %s clears private data`<br>`mobile/tests/unit/authSession.test.ts::logout during pending refresh cannot resurrect credentials` |
| TC-DATA-001 | `tests/test_dish_catalogue.py::test_two_offline_builds_identical_and_saved_artifacts_current`<br>`tests/test_catalogue_projection.py::test_two_builds_are_byte_identical_without_database` |
| TC-DATA-002 | `tests/test_dish_catalogue_import.py::test_owned_db_guards_refuse_application_and_wrong_namespace`<br>`tests/test_catalogue_projection.py::test_application_database_is_refused_before_sql` |
| TC-DATA-004 | `supabase/tests/http/GM-40.http` |
| TC-DATA-005 | `tests/test_dish_catalogue.py::test_meal_enrichment_coverage_and_unknown_preserved` |
| TC-DATA-006 | `tests/test_filter_taxonomy.py::test_ids_use_the_pipeline_stable_id_and_match_the_bundle`<br>`tests/test_filter_taxonomy.py::test_every_group_family_exists_and_ids_are_unique` |
| TC-DATA-007 | `tests/test_editorial_catalogue.py::test_reject_unsourced_classification`<br>`tests/test_editorial_catalogue.py::test_no_allergy_or_menu_image_promotion` |
| TC-DATA-008 | `tests/test_dish_catalogue.py::test_price_observations_preserve_amount_unit_and_source`<br>`tests/test_editorial_catalogue.py::test_prices_preserve_every_source_field` |
| TC-DATA-009 | `tests/test_editorial_catalogue.py::test_image_license_alone_is_insufficient` |
| TC-ENTRY-001 | `mobile/tests/component/guestEntryScreen.test.tsx::opening welcome and account placeholders never creates a guest; guest entry stays available`<br>`mobile/tests/component/tutorialScreen.test.tsx::tutorial only advances after the requested NO/OK choice`<br>`mobile/tests/integration/guestEntryRoute.test.tsx::confirmed no-session entry creates a guest through the existing seam only after name confirmation` |
| TC-ENTRY-002 | `mobile/tests/component/permissionsWelcome.test.tsx::skipping asks for nothing and still continues`<br>`mobile/tests/component/permissionsWelcome.test.tsx::a refused notification permission shows a reminder; a second refusal points to Settings`<br>`mobile/tests/unit/appPermissions.test.ts::a first refusal is denied, and the feature asks again next time it is used` |
| TC-ENTRY-003 | `supabase/tests/http/GM-44.http`<br>`mobile/tests/component/homeScreen.test.tsx::Home offers continuation only for a verified member room` |
| TC-ENTRY-004 | `mobile/tests/component/returnToRoom.test.tsx::round 1 offers the way back`<br>`mobile/tests/component/returnToRoom.test.tsx::round 2 says the room cannot be entered again and offers no button`<br>`mobile/tests/component/homeScreen.test.tsx::continue does not label terminal state %s as active` |
| TC-ENTRY-005 | `mobile/tests/integration/gm32ClientStates.test.tsx::G03 history without a cache reports offline failure and recovers to an empty list`<br>`mobile/tests/component/homeScreen.test.tsx::room network retry preserves the receipt and does not create or join`<br>`mobile/tests/unit/roomRepository.test.ts::retains a retryable restore error when stored credentials cannot be verified online` |
| TC-ENTRY-006 | `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)` |
| TC-HIS-001 | `mobile/tests/component/permissionsWelcome.test.tsx::keeping the meal history is off until ticked and is saved on the account when ticked`<br>`mobile/tests/component/permissionsWelcome.test.tsx::history is not saved when the box stays unticked` |
| TC-HIS-002 | `supabase/tests/http/GM-21.http`<br>`supabase/tests/http/GM-21-canonical.http`<br>`supabase/tests/history.sql` |
| TC-HIS-003 | `supabase/tests/http/GM-21-canonical.http`<br>`supabase/tests/history.sql` |
| TC-HIS-004 | `supabase/tests/http/GM-21.http`<br>`mobile/tests/component/historyCard.test.tsx::a swipe deletes once it passes half of the row` |
| TC-HIS-005 | `supabase/tests/http/GM-21-canonical.http`<br>`supabase/tests/history.sql` |
| TC-HIS-006 | `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::history cache is scoped to the authenticated identity and cleared after consent or logout cleanup`<br>`mobile/tests/unit/socialInboxHistoryRepositories.test.ts::drops a late A history response after switching to B` |
| TC-HIS-007 | `mobile/tests/component/socialAndHistoryScreens.test.tsx::live history opens the saved projection without re-reading the operational room` |
| TC-HIS-008 | `supabase/tests/http/GM-42.http` |
| TC-HIS-009 | `mobile/tests/integration/gm32ClientStates.test.tsx::G03 history without a cache reports offline failure and recovers to an empty list` |
| TC-HIS-010 | `mobile/tests/unit/canonicalHistory.test.ts::rejects a DECIDED round-one result carrying the round-two reason` |
| TC-PREF-001 | `mobile/tests/component/memberSetupFlow.test.tsx::member starts on preferences, saves once and reaches the lobby without touching room settings`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::renders dish preferences with Anything choice, skip, save actions and privacy note` |
| TC-PREF-002 | `supabase/tests/http/GM-20-canonical.http`<br>`supabase/tests/database/ADR-024_preference_ranking.test.sql` |
| TC-PREF-003 | `supabase/tests/database/ADR-025_multi_label_filters.test.sql`<br>`supabase/tests/database/ADR-024_preference_ranking.test.sql` |
| TC-PREF-004 | `supabase/tests/database/ADR-025_multi_label_filters.test.sql` |
| TC-PREF-005 | `mobile/tests/component/dishSetupRepair.test.tsx::recent-history helper stays in the checkbox row and does not disable the preference` |
| TC-PREF-006 | `supabase/tests/database/ADR-028_lobby_ready.test.sql` |
| TC-PREF-007 | `mobile/tests/component/dishSetupFlow.test.tsx::save rejection retains own choices for retry; account defaults stay unchanged` |
| TC-PREF-008 | `mobile/tests/component/dishPreferences.test.tsx::unknown taxonomy is disabled; skip is explicit and does not expose another member`<br>`supabase/tests/database/ADR-028_lobby_ready.test.sql` |
| TC-PREF-009 | `supabase/tests/http/GM-17.http`<br>`supabase/tests/http/GM-45.http` |
| TC-PREF-010 | `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)` |
| TC-RT-001 | `supabase/tests/http/GM-45.http`<br>`mobile/tests/unit/roomRealtime.test.ts::validates minimal version signals` |
| TC-RT-002 | `supabase/tests/http/GM-45.http` |
| TC-RT-003 | `mobile/tests/unit/roomRealtime.test.ts::disconnect uses finite backoff, reconnect reads once, stop invalidates response guard`<br>`mobile/tests/unit/roomRealtime.test.ts::late token after stop cannot open a socket` |
| TC-RT-004 | `mobile/tests/unit/roomRealtime.test.ts::missing backend capability fails explicitly and does not connect` |
| TC-RT-006 | `mobile/tests/unit/gm31Outbox.test.ts::recognizes canonical ballot ACKs and legacy submission receipts`<br>`mobile/tests/unit/gm31Outbox.test.ts::does not replay a future expectedVersion for an otherwise matching room snapshot` |
| TC-RT-007 | `mobile/tests/unit/gm31Outbox.test.ts::TTL expiry removes the secure payload and identity-scoped rows`<br>`mobile/tests/unit/gm31Outbox.test.ts::retains cleanup metadata when SecureStore deletion fails, then retries successfully` |
| TC-RT-008 | `mobile/tests/component/gm25FigmaParity.test.tsx::ignores an old room poll after switching to another room`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::keeps the newer lobby snapshot when a poll returns an older round snapshot` |
| TC-RT-009 | `mobile/tests/unit/authSession.test.ts::business response received after logout is rejected before exposure to caller`<br>`mobile/tests/unit/authSession.test.ts::server-detected auth loss also drops an already-running business response` |
| TC-RT-010 | `mobile/tests/component/liveRoomLifecycle.test.tsx::P5: RoomRepositoryProvider throws when forcedMode=real and publicKey is missing`<br>`mobile/tests/integration/gm32ClientStates.test.tsx::G02 inbox distinguishes a failed request from an empty authenticated page` |
| TC-RT-011 | `mobile/tests/unit/inboxRealtime.test.ts::an expired token closes the channel and it joins again`<br>`mobile/tests/unit/inboxRealtime.test.ts::stopping closes the socket and cancels every timer` |
| TC-RT-012 | `mobile/tests/unit/roomRealtime.test.ts::temporary token refresh failures keep both retries alive until the room reconnects` |
| TC-REL-003 | `mobile/tests/component/releaseSafetyAndMap.test.tsx (tag)`<br>`mobile/tests/unit/minimumVersion.test.ts (tag)` |
| TC-REL-004 | `mobile/tests/unit/minimumVersion.test.ts (tag)` |
| TC-REL-008 | `mobile/tests/component/releaseSafetyAndMap.test.tsx (tag)`<br>`mobile/tests/unit/releaseConfigSafety.test.ts (tag)` |
| TC-REL-009 | `mobile/tests/component/releaseSafetyAndMap.test.tsx (tag)` |
| TC-RES-001 | `mobile/tests/component/liveDishResultScreen.test.tsx::renders DECIDED result with Top 3 podium, winner and price`<br>`mobile/tests/component/dishResultPodium.test.tsx::podium %s shows one dish on each pedestal, in server order` |
| TC-RES-002 | `mobile/tests/unit/resultRepository.test.ts::maps valid tied podium (dense ranks 1, 1, 2)`<br>`mobile/tests/component/liveDishResultScreen.test.tsx::puts tied dishes on separate pedestals in server order`<br>`mobile/tests/unit/podiumOrder.test.ts::keeps score order and the server order for equal scores` |
| TC-RES-003 | `supabase/tests/http/GM-20-canonical.http`<br>`supabase/tests/http/GM-21-canonical.http`<br>`supabase/tests/http/GM-57.http (tag)`<br>`scripts/e2e/two_client_flow.mjs (tag)` |
| TC-RES-004 | `mobile/tests/unit/resultRepository.test.ts::rejects payload missing policyVersion`<br>`mobile/tests/unit/resultRepository.test.ts::rejects score exceeding 2 * round1BallotCount`<br>`mobile/tests/unit/resultRepository.test.ts::rejects dish missing description key` |
| TC-RES-005 | `mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places` |
| TC-RES-006 | `mobile/tests/component/gm30FigmaParity.test.tsx::Figma 206:913 & 379:1478 — Places loaded and external actions trigger allowlisted URLs`<br>`mobile/tests/component/nearbyResult.test.tsx::map capability renders in-app, retains attribution and never uses a mock illustration in real mode` |
| TC-RES-007 | `mobile/tests/component/gm30FigmaParity.test.tsx::Figma 622:8962 — Location permission prompt shown when location is not granted`<br>`mobile/tests/unit/placesRepository.test.ts::denied permission returns status denied` |
| TC-RES-008 | `mobile/tests/unit/placesRepository.test.ts::never throws on network error or quota exceeded; returns safe ReadResult with status error`<br>`mobile/tests/unit/placesRepository.test.ts::returns error status when Google Places API responds with 403 or 500`<br>`mobile/tests/component/gm30FigmaParity.test.tsx::Absolute Winner Isolation: places failure never corrupts or alters decided winner` |
| TC-RES-009 | `mobile/tests/unit/placesRepository.test.ts::superseded request is aborted and does not overwrite current result`<br>`mobile/tests/component/nearbyResult.test.tsx::late action response from a previous result cannot update the new result feedback` |
| TC-RES-010 | `mobile/tests/unit/resultRepository.test.ts::rejects malformed raw price with null amount`<br>`mobile/tests/unit/voteSessionState.test.ts::hides a price if amount, currency, or unit is unknown` |
| TC-RES-011 | `mobile/tests/unit/externalLinks.test.ts::allows official Google Maps, TikTok, and YouTube URLs`<br>`mobile/tests/unit/externalLinks.test.ts::buildGoogleMapsUrl with place coordinates and id` |
| TC-RES-012 | `mobile/tests/component/liveDishResultScreen.test.tsx::transitions to error notice when resultId does not match server response` |
| TC-RES-013 | `mobile/tests/component/liveDishResultScreen.test.tsx::renders error state with retry button on failure`<br>`mobile/tests/component/liveDishResultScreen.test.tsx::cancels NOT_READY poll timer upon unmount` |
| TC-RES-014 | `mobile/tests/component/gm27ReviewRegression.test.tsx::the production roomRepository composition partitions cache using the active identity` |
| TC-RES-015 | `mobile/tests/component/winnerCelebration.test.tsx::Reduce Motion requests zero-duration native animations` |
| TC-ROOM-001 | `supabase/tests/http/GM-19.http`<br>`supabase/tests/http/GM-20-canonical.http`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::liveDishSetupGateway creates room via canonical dish_session v4 dispatch`<br>`scripts/e2e/two_client_flow.mjs (tag)` |
| TC-ROOM-002 | `supabase/tests/http/GM-19.http`<br>`supabase/tests/http/GM-20-canonical.http` |
| TC-ROOM-003 | `supabase/tests/http/GM-18.http`<br>`mobile/tests/component/dishSetupFlow.test.tsx::shortage dialog shows requested/available separately and requires an explicit confirmation`<br>`mobile/tests/component/dishSetupFlow.test.tsx::below five only offers to change the time and never creates a room`<br>`mobile/tests/component/dishSetupFlow.test.tsx::7 of 15 dishes: "Dùng 7 món" creates the room with 7 dishes` |
| TC-ROOM-004 | `mobile/tests/unit/mealTimeConflict.test.ts::an hour outside the window reports the meal that hour belongs to`<br>`mobile/tests/unit/dishSetupTimePolicy.test.ts::schedule default advances fifteen displayed minutes and rolls the date at midnight` |
| TC-ROOM-005 | `mobile/tests/component/joinRoomEntry.test.tsx::preview shows count only, ignores supplied private fields, and confirmation is the only join mutation`<br>`supabase/tests/http/GM-22.http`<br>`scripts/e2e/two_client_flow.mjs (tag)` |
| TC-ROOM-006 | `mobile/tests/component/joinRoomEntry.test.tsx::invalid code %s never previews or joins`<br>`mobile/tests/component/roomCodeField.test.tsx::pasting a whole code fills all cells once, including when replacing from a middle cell`<br>`mobile/tests/unit/joinLinks.test.ts::rejects invalid room codes (wrong length or excluded chars: 0, O, 1, I)` |
| TC-ROOM-007 | `supabase/tests/http/GM-22.http`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::displays error states for full or expired room preview`<br>`supabase/tests/database/ADR-027_room_rejoin.test.sql` |
| TC-ROOM-008 | `mobile/tests/unit/joinLinks.test.ts::parses custom scheme with path (gi-cung-duoc://join/XYZ789)`<br>`mobile/tests/unit/joinLinks.test.ts::rejects disallowed web hosts (e.g. phishing / external domain)`<br>`mobile/tests/unit/joinLinks.test.ts::rejects suspicious payloads containing tokens or passwords in query params` |
| TC-ROOM-009 | `mobile/tests/component/joinRoomEntry.test.tsx::QR %s always retains manual entry and never auto-joins` |
| TC-ROOM-010 | `supabase/tests/http/GM-19.http`<br>`supabase/tests/http/GM-22.http` |
| TC-ROOM-011 | `mobile/tests/component/joinRoomEntry.test.tsx::unknown join retry reuses frozen input/request ID; new route code and duplicate clicks cannot replace it` |
| TC-ROOM-012 | `supabase/tests/database/GM-19_room_lifecycle.test.sql`<br>`supabase/tests/http/GM-45.http` |
| TC-ROOM-013 | `supabase/tests/database/ADR-028_lobby_ready.test.sql`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::the host cannot start while a member is still choosing their taste`<br>`mobile/tests/unit/readyQueue.test.ts::ready requests for a room are sent one at a time, in the order asked` |
| TC-ROOM-014 | `supabase/tests/database/GM-19_room_lifecycle.test.sql`<br>`supabase/tests/http/GM-19.http` |
| TC-ROOM-015 | `supabase/tests/http/GM-19-settings-v4.http`<br>`mobile/tests/component/memberSetupFlow.test.tsx::member starts on preferences, saves once and reaches the lobby without touching room settings` |
| TC-ROOM-016 | `supabase/tests/http/GM-19-settings-v4.http` |
| TC-ROOM-017 | `supabase/tests/database/ADR-027_room_rejoin.test.sql` |
| TC-ROOM-018 | `supabase/tests/http/GM-40.http`<br>`mobile/tests/component/createRoomEntry.test.tsx::entry is honest about a missing setup artifact and never asks for GPS or creates a room` |
| TC-ROOM-019 | `mobile/tests/component/gm25FigmaParity.test.tsx::opens voting once when poll reads %s for a member`<br>`mobile/tests/component/gm25FigmaParity.test.tsx::opens voting once when manual reload reads %s for a member`<br>`mobile/tests/component/lobbySnapshotLifecycle.test.tsx::keeps the lobby ready when the initial load settles with a late %s` |
| TC-ROOM-020 | `mobile/tests/component/gm30FigmaParity.test.tsx::renders modal title, room code badge, QR matrix, copy button and triggers actions` |
| TC-ROOM-021 | `supabase/tests/database/GM-19_room_lifecycle.test.sql`<br>`mobile/tests/component/dishSetupRepair.test.tsx::lost cancellation acknowledgement replays the same intent and never cancels twice` |
| TC-SEC-001 | `supabase/tests/rls.sql`<br>`supabase/tests/http/GM-17.http`<br>`supabase/tests/http/GM-57.http (tag)`<br>`scripts/e2e/two_client_flow.mjs (tag)` |
| TC-SEC-002 | `supabase/tests/database/GM-19_room_lifecycle.test.sql`<br>`supabase/tests/http/GM-45.http` |
| TC-SEC-003 | `supabase/tests/http/GM-17.http`<br>`supabase/tests/http/GM-19.http` |
| TC-SEC-004 | `supabase/tests/rls.sql`<br>`supabase/tests/finalize.sql` |
| TC-SEC-005 | `mobile/tests/unit/authTransport.test.ts::reject privileged/unrecognized configured key %s`<br>`mobile/tests/unit/authTransport.test.ts::legacy anon JWT allowed, legacy service-role JWT rejected` |
| TC-SEC-007 | `mobile/tests/unit/authSession.test.ts::read verification transient retry is bounded; secrets never enter public errors`<br>`mobile/tests/unit/authTransport.test.ts::network failure raw token message suppressed` |
| TC-SEC-008 | `mobile/tests/unit/joinLinks.test.ts::rejects suspicious payloads containing tokens or passwords in query params`<br>`mobile/tests/unit/externalLinks.test.ts::rejects URLs containing embedded credentials or suspicious token params` |
| TC-SEC-011 | `mobile/tests/unit/authTransport.test.ts::GET user verifies bearer on server; metadata userId never becomes caller` |
| TC-SOC-001 | `supabase/tests/database/GM-22_social.test.sql`<br>`supabase/tests/http/GM-22.http`<br>`mobile/tests/unit/socialInboxHistoryRepositories.test.ts::social adapter delegates invite/accept/reject/unfriend to session-aware API methods` |
| TC-SOC-002 | `supabase/tests/database/GM-22_social.test.sql`<br>`supabase/tests/http/GM-28.http` |
| TC-SOC-003 | `mobile/tests/integration/gm32ClientStates.test.tsx::a typed friend code shows the owner\'s name (not the bare code); an unknown code says so; the invite names who it went to` |
| TC-SOC-004 | `mobile/tests/integration/gm32ClientStates.test.tsx::G01 friends distinguishes network failure, no friends and no search match` |
| TC-SOC-005 | `supabase/tests/http/GM-22.http`<br>`mobile/tests/unit/socialInboxHistoryRepositories.test.ts::resolves an accepted invite to the latest room route and verifies result references against the server` |
| TC-SOC-006 | `supabase/tests/database/GM-22_social.test.sql`<br>`mobile/tests/component/socialAndHistoryScreens.test.tsx::tapping a notification marks that one read; an invite shows the sender, with Từ chối left of Đồng ý` |
| TC-SOC-007 | `mobile/tests/component/socialAndHistoryScreens.test.tsx::tapping a notification marks that one read; an invite shows the sender, with Từ chối left of Đồng ý`<br>`supabase/tests/database/GM-28_inbox_read_all.test.sql` |
| TC-SOC-008 | `mobile/tests/unit/inboxRealtime.test.ts::a new row calls onInsert, and the status turns live once the database subscription is confirmed`<br>`mobile/tests/component/inboxBadgePolling.test.tsx::several pushes together cause one read`<br>`supabase/tests/database/ADR-026_inbox_realtime.test.sql` |
| TC-SOC-009 | `mobile/tests/component/inboxBadgePolling.test.tsx::nothing is read while nothing happens: no timer while the push connection is live`<br>`mobile/tests/component/inboxBadgePolling.test.tsx::the connection closes in the background and comes back with a read on return` |
| TC-SOC-010 | `supabase/tests/database/ADR-026_inbox_friend_accepted.test.sql` |
| TC-SOC-011 | `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::inbox adapter deduplicates by eventId and advances by inbox item ID` |
| TC-SOC-012 | `supabase/tests/http/GM-23.http`<br>`supabase/tests/http/GM-28.http` |
| TC-SOC-013 | `mobile/tests/unit/notificationInboxResolver.test.ts::fails closed when the server repeats a pagination cursor`<br>`mobile/tests/component/socialAndHistoryScreens.test.tsx::notification retry resolves the same event from authenticated inbox after a network error` |
| TC-UI-002 | `mobile/tests/component/dishPreferences.test.tsx::long dish-group labels break at their last separator` |
| TC-UI-003 | `mobile/tests/component/sharedComponents.test.tsx::shared controls expose labels, touch actions and selected state` |
| TC-UI-004 | `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)` |
| TC-UI-005 | `mobile/tests/component/winnerCelebration.test.tsx::Reduce Motion requests zero-duration native animations`<br>`mobile/tests/component/tutorialCardMotion.test.tsx::reduced motion keeps gesture choices without moving the card` |
| TC-UI-006 | `mobile/tests/component/guestEntryScreen.test.tsx::pending submission locks input, button and hardware Back, including repeated presses`<br>`mobile/tests/component/roomCodeField.test.tsx::pasting a whole code fills all cells once, including when replacing from a middle cell` |
| TC-UI-008 | `mobile/tests/integration/gm32ClientStates.test.tsx::G01 friends distinguishes network failure, no friends and no search match`<br>`mobile/tests/component/voteLoadingScreens.test.tsx::the round 1 skeleton has the flashcard layout (title, progress, card) and no home-style header`<br>`mobile/tests/component/dishResultStates.test.tsx::%s never masquerades as no consensus or calls a finalization action` |
| TC-UI-009 | `mobile/tests/component/feedbackRules.test.tsx::an API error is a red toast; the retry button stays on the page`<br>`mobile/tests/component/feedbackRules.test.tsx::a notification from someone else is a banner, not a toast, and opens where it points`<br>`mobile/tests/unit/inboxNotice.test.ts::a friend request names who sent it and opens the inbox` |
| TC-UI-011 | `mobile/tests/component/AppFontProvider.test.tsx::a font load failure keeps Vietnamese text available with system weights`<br>`mobile/tests/component/AppFontProvider.test.tsx::a delayed font load keeps usable children on screen` |
| TC-VOTE1-001 | `mobile/tests/component/votingScreens.test.tsx::Ba nút WANT, OK, NO luôn hiện và bắt đầu ở trạng thái UNSET`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::renders the flashcard deck and records WANT/OK/NO; the last answer sends the ballot` |
| TC-VOTE1-002 | `mobile/tests/component/votingScreens.test.tsx::UNSET khác OK: nút Gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món` |
| TC-VOTE1-003 | `mobile/tests/component/votingScreens.test.tsx::Double-tap đặt WANT từ UNSET, OK, NO và lặp lại vẫn là WANT (không toggle về UNSET, không tự gửi)` |
| TC-VOTE1-005 | `mobile/tests/component/votingScreens.test.tsx::Flashcard Vòng 1: một thẻ mỗi lần, cử chỉ (thao tác TalkBack), Hoàn tác trên header, xong thẻ cuối là tự gửi` |
| TC-VOTE1-006 | `mobile/tests/component/votingScreens.test.tsx::Trạng thái Pending hiển thị rõ ràng và khóa tương tác trong khi chờ phản hồi`<br>`mobile/tests/component/votingScreens.test.tsx::Sau ACK: khóa toàn bộ phiếu, không thể sửa hay nộp lại trùng`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::submits ballot via VoteRepository, enters pending state, and locks interaction on ACK` |
| TC-VOTE1-007 | `mobile/tests/unit/voteRepository.test.ts::preserves idempotency and returns cached receipt on retry with identical requestId`<br>`mobile/tests/unit/voteRepository.test.ts::rejects reused requestId with mismatched payload (F6)`<br>`supabase/tests/http/GM-20.http` |
| TC-VOTE1-008 | `mobile/tests/component/votingScreens.test.tsx::Mô phỏng lỗi nộp phiếu (Error state fixture) và nút Thử lại gửi thành công`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::handles error state gracefully and allows retry without losing choices` |
| TC-VOTE1-009 | `mobile/tests/component/votingSnapshotLifecycle.test.tsx::recovers the waiting transition after reopening with an ACKed ballot in ROUND_%s`<br>`mobile/tests/unit/gm31Outbox.test.ts::identity isolation, ACK scrub, and logout deletion apply to outbox and cache` |
| TC-VOTE1-010 | `supabase/tests/http/GM-20.http`<br>`supabase/tests/http/GM-20-canonical.http`<br>`scripts/e2e/two_client_flow.mjs (tag)` |
| TC-VOTE1-011 | `supabase/tests/http/GM-20.http`<br>`supabase/tests/http/DISH-POLICY-V3.http` |
| TC-VOTE1-012 | `supabase/tests/http/GM-20-canonical.http`<br>`mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places` |
| TC-VOTE1-013 | `supabase/tests/http/GM-20-canonical.http`<br>`mobile/tests/component/votingSnapshotLifecycle.test.tsx::computes the countdown using server clock offset on a skewed client` |
| TC-VOTE1-015 | `mobile/tests/unit/voteRepository.test.ts::blocks early finish when A_r is less than or equal to half the roster`<br>`mobile/tests/unit/voteRepository.test.ts::permits early finish only when strictly more than half has acknowledged ballots`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::disables Chốt ngay when A_r <= M/2 and enables when quorum A_r > M/2 is reached` |
| TC-VOTE1-016 | `mobile/tests/component/votingScreens.test.tsx::Waiting: Countdown 60s và nút Host kết thúc chờ sớm chỉ bật khi A_r > M/2` |
| TC-VOTE1-017 | `supabase/tests/http/GM-20.http` |
| TC-VOTE1-018 | `mobile/tests/component/votingSnapshotLifecycle.test.tsx::observes the move to round two for an unsubmitted member and preserves an unsent draft before that move` |
| TC-VOTE1-019 | `mobile/tests/component/votingSnapshotLifecycle.test.tsx::backs off round %s errors/NOT_READY and recovers without losing a draft`<br>`mobile/tests/component/votingSnapshotLifecycle.test.tsx::stops round %s polling on unmount, including an in-flight response` |
| TC-VOTE1-020 | `supabase/tests/http/GM-17.http`<br>`supabase/tests/http/GM-20-canonical.http` |
| TC-VOTE1-021 | `mobile/tests/unit/voteSessionState.test.ts::never accepts a lower version even when it claims a forward state transition`<br>`mobile/tests/unit/voteSessionState.test.ts::ignores an older snapshot response after a newer version has been applied` |
| TC-VOTE1-022 | `mobile/tests/unit/voteSessionState.test.ts::partitions drafts and ACK receipts by scope and clears them on logout` |
| TC-VOTE2-001 | `mobile/tests/component/roundTwoView.test.tsx::lists only dish names with an unticked box, and shows the removal limit`<br>`mobile/tests/component/votingScreens.test.tsx::Hiển thị banner Vòng 2, các món ứng viên và nút toggle đôi Giữ/Loại` |
| TC-VOTE2-002 | `mobile/tests/unit/voteRepository.test.ts::enforces cap = 1 for N = 1..3`<br>`mobile/tests/unit/voteRepository.test.ts::enforces cap = 2 for N = 4..6 (5 dishes already allow 2 removals)`<br>`mobile/tests/unit/voteRepository.test.ts::enforces cap = 3 for N = 7..10`<br>`mobile/tests/unit/voteRepository.test.ts::grows with the pool up to 20 dishes without float rounding errors` |
| TC-VOTE2-003 | `mobile/tests/unit/voteRepository.test.ts::rejects Round 2 submission before calling server when REMOVE count exceeds cap`<br>`mobile/tests/component/roundTwoView.test.tsx::ticking removes a dish; at the limit the other boxes are disabled; unticking frees one`<br>`supabase/tests/http/GM-20-canonical.http` |
| TC-VOTE2-004 | `mobile/tests/component/votingScreens.test.tsx::N=1 có thể loại món duy nhất (Loại hết) và nộp phiếu hợp lệ theo Cap R2=1`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::supports N=1 candidate with cap=1, allows marking ✕ ĐÃ LOẠI and submitting ALL_REMOVED`<br>`mobile/tests/unit/voteRepository.test.ts::allows Round 2 submission with N=1 and REMOVE choice (Node 638:9369)` |
| TC-VOTE2-005 | `supabase/tests/http/GM-20-canonical.http`<br>`supabase/tests/http/DISH-POLICY-V3.http` |
| TC-VOTE2-006 | `supabase/tests/http/GM-20-canonical.http`<br>`mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places`<br>`mobile/tests/component/gm26FigmaParity.test.tsx::supports N=1 candidate with cap=1, allows marking ✕ ĐÃ LOẠI and submitting ALL_REMOVED` |
| TC-VOTE2-007 | `mobile/tests/dishPolicyV4.test.mjs::cutoff ties always include the seeded winner; NO/REMOVE never rank`<br>`mobile/tests/decision.test.mjs::2W+OK equals n+W; even/odd tier boundaries across 2–8 members`<br>`supabase/tests/http/GM-20-canonical.http` |
| TC-VOTE2-008 | `supabase/tests/http/GM-20-canonical.http`<br>`mobile/tests/unit/podiumOrder.test.ts::keeps score order and the server order for equal scores` |
| TC-VOTE2-009 | `mobile/tests/component/roundTwoView.test.tsx::sending goes straight to the waiting screen without a confirmation dialog`<br>`mobile/tests/component/roundTwoView.test.tsx::a failed send keeps the ticks and offers one retry button` |
| TC-VOTE2-010 | `mobile/tests/component/roundTwoView.test.tsx::ticking every dish warns the person (only possible when the limit allows it)` |
| TC-VOTE2-011 | `mobile/tests/component/votingSnapshotLifecycle.test.tsx::observes the terminal result before the round-two caller submits` |
| TC-VOTE2-012 | `mobile/tests/unit/gm31Outbox.test.ts::does not submit an unknown outbox ballot when live snapshot is unavailable but cache exists`<br>`mobile/tests/component/votingSnapshotLifecycle.test.tsx::keeps the whole unknown-ACK request stable after snapshot version changes` |
| TC-VOTE2-013 | `mobile/tests/component/votingScreens.test.tsx::Nút Giữ tất cả đặt lại toàn bộ món về KEEP và xóa thông báo cap`<br>`mobile/tests/component/roundTwoView.test.tsx::"Bỏ chọn" clears every tick` |
