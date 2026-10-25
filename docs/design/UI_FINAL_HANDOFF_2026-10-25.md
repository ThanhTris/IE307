# UI final handoff — Figma chốt, 2026-10-25

## Mục đích

Ghi nhận kết quả rà soát cuối bộ UI Figma để main đồng bộ tài liệu/spec/AC và chuẩn bị triển khai theo quy trình task hiện hành. Figma hiện là hình ảnh mục tiêu cho UI đã chốt; repo vẫn có các màn và hành vi cũ vì chưa đồng bộ sau khi hoàn thiện Figma. Source trong repo dùng để xác định khoảng cách triển khai, không dùng làm lý do hạ yêu cầu thiết kế mới.

Đây là handoff thiết kế, không phải xác nhận code/runtime đã tích hợp, nghiệm thu task, hoặc thay đổi status/owner/deadline trên GitHub Project #2. Việc giao FE và thứ tự thực hiện vẫn theo chỉ dẫn hiện hành của Trí và Project #2.

## Nguồn đã rà

Figma file: [Gì Cũng Được — Màu sắc thương hiệu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j/G%C3%AC-C%C5%A9ng-%C4%90%C6%B0%E1%BB%A3c-%E2%80%94-M%C3%A0u-s%E1%BA%AFc-th%C6%B0%C6%A1ng-hi%E1%BB%87u)

- `01 · Màu sắc` — node `0:1`.
- `02 · Components` — node `8:2`.
- `03 · Màn hình` — node `33:2`.
- `04 · Tạo phòng — Tình huống` — node `76:851`.
- `05 · Khẩu vị — Tình huống` — node `76:852`.
- `06 · Phòng chờ — Tình huống` — node `76:853`.

Đã rà inventory và các frame/trạng thái trong pages qua Figma MCP. Không dùng dữ liệu mẫu lịch sử để đánh giá tính đúng dữ liệu; không coi prototype links/routers là tiêu chí kết luận đủ UI. Các vùng QA nội bộ và frame có nhãn tham khảo cũ không được tính là luồng người dùng hiện hành.

## Quyết định UI đã chốt

1. Màu xanh thương hiệu `#46C34F` chỉ dùng cho trang trí, không đặt nội dung chữ cần đọc trên nền này. CTA và trạng thái tương tác phải dùng cặp màu có tương phản phù hợp; các màu nền/trạng thái khác tiếp tục theo component/token đã duyệt.
2. Trước khi vào phòng, màn xác nhận chỉ cho biết số thành viên. Tên thành viên chỉ hiển thị sau khi người dùng đã vào phòng.
3. Bộ UI cốt lõi trong Figma được xem là đã chốt để chuyển sang đồng bộ code. Các trạng thái phụ liệt kê dưới đây không làm mở lại thiết kế lõi; main cần xử lý bằng pattern chung hoặc ghi nhận phần cần bổ sung riêng.
4. Dữ liệu lịch sử cũ không có điểm/Top 3 phải ẩn trường không có dữ liệu, không sinh giá trị giả. Tính đúng của fixture lịch sử nằm ngoài đợt chốt UI này.

## Độ phủ luồng UI

Figma có màn cho mở app, đăng nhập/đăng ký/khách và khôi phục tài khoản; trang chủ và tiếp tục phiên; tạo phòng, hẹn giờ, chọn số món và mời bạn; nhập mã/QR và lỗi vào phòng; chọn khẩu vị, lưu nháp và lỗi tải/lưu; phòng chờ theo vai trò host/member, sửa thiết lập, thành viên thay đổi, bắt đầu/hủy/hết hạn; R1, ACK/gửi lỗi, chờ và chốt sớm; R2 gồm pool/cap và N=1 giữ hoặc loại món; kết quả có winner/no-consensus, podium, Places/map và các trạng thái lỗi; bạn bè, lời mời, thông báo, lịch sử, hồ sơ/cài đặt và hướng dẫn lần đầu.

Các trạng thái lỗi/chờ đã thể hiện rõ trong luồng cốt lõi gồm: tạo phòng thất bại/mất mạng, mã sai/phòng đầy/hết hạn/camera bị từ chối, phòng mất kết nối/reconnect/start thất bại, khẩu vị lưu/tải thất bại hoặc phòng đã đóng, phiếu đang gửi/chưa rõ ACK/gửi lỗi/vòng đã đóng, chốt sớm, không có món thắng, lỗi tải kết quả, cần bật vị trí, không có địa điểm và map tải lỗi.

## Trạng thái phụ chưa có màn riêng

Rà soát không thấy frame riêng cho các trạng thái sau ở các khu vực ngoài luồng chọn món:

- Tìm bạn không có kết quả, đang tải hoặc tải lỗi. Figma hiện có màn tìm với kết quả mẫu và các trạng thái lời mời.
- Hộp thư thông báo rỗng hoặc tải lỗi. Có màn danh sách thông báo cùng item variants.
- Lịch sử tải lỗi hoặc mất kết nối khi đọc. Có danh sách rỗng, chi tiết đã chốt và chưa chốt.
- Lưu hồ sơ/đổi mật khẩu thất bại. Có form và luồng tài khoản chính, nhưng chưa thấy trạng thái lỗi lưu riêng cho các thao tác này.

Đây là thiếu sót về mô tả trạng thái phụ, không phải thiếu màn của hành trình cốt lõi. Khi triển khai, dùng error/empty/loading pattern chung hiện có nếu phù hợp; nếu chưa có pattern đáp ứng được, ghi rõ bổ sung UI cần thiết trong task/AC thay vì để lỗi thành màn trắng hoặc trạng thái không có lối thoát.

## Quy tắc hành vi cần giữ khi đồng bộ

- R1 kiểm winner trước. Chưa có winner thì lấy survivors từ pool đã khóa trừ NO của các ballot R1 hoàn chỉnh đã ACK. Không có survivor kết thúc `NO_CONSENSUS/EMPTY_INTERSECTION`; còn ít nhất một survivor thì mở R2 thật, kể cả N=1.
- R2 cho người chơi REMOVE hoặc không REMOVE. Cap là `max(1, floor(0.30 * N))` theo N đã khóa khi bắt đầu R2. Không tự finalize, không tự sinh KEEP cho người chưa gửi. Loại hết trả `NO_CONSENSUS/ALL_REMOVED`; không bù món và không mở R3.
- Điểm R1 là `2 * WANT + OK`; R2 chỉ loại món và không cộng điểm. Điểm, rank, winner, Top 3 và kết quả lịch sử lấy từ projection server đã lưu.
- Mốc chờ 60 giây bắt đầu khi người đầu tiên hoàn tất lượt và vào waiting hợp lệ sau ACK. Host có thể chốt sớm theo điều kiện đã thống nhất.
- Pool chọn món độc lập quán, offering, giờ bán và GPS. Places/map phục vụ món thắng sau kết quả, không lọc pool.
- Bảo toàn phiên v2/v3 đã pin. Không sửa nghĩa migration/runtime cũ để làm khớp thiết kế mới; policy mới cần version/migration tiến theo contract và quy trình dự án.

## Việc main cần làm tiếp

1. Dùng Figma và các quyết định trên để đồng bộ UI spec, task AC/checklist, component map và contract DTO liên quan; giữ rõ điểm nào là Figma mục tiêu, điểm nào là trạng thái code hiện tại.
2. Ghi các trạng thái phụ còn thiếu vào task phù hợp và quyết định dùng pattern chung hay cần frame bổ sung. Không coi fixture/prototype route là bằng chứng code đã chạy.
3. Đối chiếu lại owner, reviewer Trí, status, dependency và phạm vi triển khai trực tiếp trên Project #2 trước khi bắt đầu code. Báo cáo này không tự giao FE, đổi task metadata hay phê duyệt implementation.
4. Giữ evidence Figma, contract/version và HANDOFF/CHECKS theo task. Chỉ đánh giá tích hợp sau khi có artifact và kiểm thử ở đúng tầng; Figma đủ màn không đồng nghĩa app/Android/API đã nghiệm thu.

Liên quan: [Báo cáo đối chiếu UI với main ngày 24/10](UI_MAIN_RECONCILIATION_REPORT_2026-10-24.md), [audit đồng bộ UI–BE–Data ngày 25/10](../project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md), [phạm vi BE/Data ngày 25/10](../project/BE_DATA_ONLY_SCOPE_2026-10-25.md).
