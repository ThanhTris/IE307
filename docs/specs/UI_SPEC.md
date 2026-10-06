# UI SPEC — Gì Cũng Được

Draft v0.1. Prototype: [mở HTML](../../design/prototypes/gi-cung-duoc.html). Đây là mô phỏng một thiết bị, không có backend.

## Hướng hình ảnh

Ấm, thân thiện như một bàn ăn: nền kem, màu cam đất cho hành động, xanh rêu cho trạng thái đã thống nhất. Ưu tiên tên món và nút rõ nghĩa; không cần ảnh món tải mạng để hiểu luồng. Không dùng hình thức dating hoặc thông điệp ép người dùng nhận món.

## Màn hình và điều hướng

| ID | Màn | Nội dung/hành động | Trạng thái cần có |
| --- | --- | --- | --- |
| UI-01 | Trang chủ | Tạo kèo ăn / Nhập mã; tiếp tục với khách; entry Bạn ăn cùng P1 | loading session, lỗi auth, offline |
| UI-02 | Tạo phòng | Buổi ăn; tên của bạn; tạo mã | tên sai, đang tạo, quota/network error |
| UI-03 | Vào phòng | Mã hoặc quét QR; tên | sai mã, hết hạn, đầy, đã bắt đầu, camera denied |
| UI-04 | Sở thích | Chọn nhiều loại hoặc Gì cũng được; giải thích là ưu tiên | catalogue rỗng, không có loại chọn vẫn hợp lệ |
| UI-05 | Phòng chờ | Mã/QR, thành viên, ready, đổi buổi với host | chưa đủ người, chưa ready, host rời, mất mạng |
| UI-06 | Chọn món | card, tiến độ, ba nút Không ăn/Ăn được/Muốn ăn | chưa chọn, sửa trước nộp, gửi lỗi, đã nộp/chờ |
| UI-07 | Vòng cuối | Các món mọi người ăn được; Giữ/Loại thêm; xác nhận | không còn món, chờ mọi người, reconnect |
| UI-08 | Kết quả | Tên món, lý do, tìm quán trên Maps, về trang chủ | Maps không mở, đã kết thúc, không reroll |
| UI-09 | Chưa đồng thuận | Lý do trung tính, kết thúc/tạo phiên mới | không tự quay lại vòng chọn |
| UI-10 | Phiên gián đoạn | Chờ kết nối / hết hạn / đã hủy | retry refetch snapshot, xác nhận rời |
| UI-11 | Bạn ăn cùng, lịch sử (P1) | Mời/chấp nhận, phòng nhanh, liên kết account | chưa có bạn, mất guest session, invite rejected |

## Copy và tương tác

- WANT: “Muốn ăn”; OK: “Ăn được”; NO: “Không ăn”. Không dùng “Bỏ qua” cho NO vì dễ hiểu thành chưa chọn.
- Không cần vuốt mới dùng được: ba Pressable có label/state; swipe là shortcut, tap vẫn là đường chuẩn.
- Phiếu gửi thành công mới tăng trạng thái đã nộp. Loading nút chống double tap nhưng server vẫn cần idempotency.
- Không lộ phiếu cá nhân qua avatar, animation hay thông báo. “3/4 người đã chọn xong” là tiến độ chung.
- Không có nút quay lại sửa phiếu đã gửi. Back ở phiên active hiện xác nhận rời với hệ quả hủy phiên.
- Vòng cuối hiển thị danh sách với toggle rõ Giữ/Loại thêm. Nút nộp vẫn được dùng nếu loại hết, kết quả có thể chưa đồng thuận.

## Accessibility và responsive

Theo [design system](../../design/DESIGN_SYSTEM.md). Dùng safe area, KeyboardAvoidingView khi nhập tên/mã, font scaling 200%, touch 48dp; font hệ thống hỗ trợ tiếng Việt. 320–599dp một cột, 600–839dp card tối đa 560dp, >=840dp panel nội dung + bối cảnh. Không kéo giãn card hết tablet. Dark theme có token riêng. Reduced motion bỏ rung/transition trang trí, focus đến tiêu đề màn mới.

## Giới hạn prototype

Prototype có dữ liệu mẫu và nút chọn kịch bản reviewer; không phải camera, đăng nhập, QR thật, realtime, secure vote hay Maps API. Màn P1 được mô tả trong spec, chưa mô phỏng đầy đủ. UI native cần screenshot Android và test TalkBack ở task triển khai.
