# FIGMA_PARITY — GM-39 (Hồ sơ đối chiếu Inventory Figma & Asset Thương hiệu)

- Task: [GM-39](../../../../tasks/backlog/GM-39.md)
- Figma file: `3Ysh0mOAEkAgA5DgZPSC1j` ([Gì Cũng Được — Màu sắc thương hiệu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=0-1))
- Map version: `ui-figma-final/2026-10-25` (`docs/design/UI_FIGMA_TASK_MAP.json`)
- Contract version: `ui-figma-final/2026-10-25/GM-39.2`

## 1. Danh mục Pages & Master Nodes đã xác minh

| Page / Nhóm | Node ID | Nội dung chính | Trạng thái thiết kế |
| --- | --- | --- | --- |
| `01 · Màu sắc` | `0:1` | Bảng màu thương hiệu, semantic tokens, typography Inter, quy tắc tương phản `#46C34F` | Đã chốt |
| `02 · Components` | `8:2` | Component dùng chung, trạng thái nút/input/card/banner, master logo `22:394` | Đã chốt |
| `03 · Màn hình` | `33:2` | Toàn bộ màn hình chính của hành trình chọn món, tài khoản, bạn bè, lịch sử và 12 màn `G01–G05` | Đã chốt |
| `04 · Tạo phòng — Tình huống` | `76:851` | Các nhánh tạo phòng, chọn 10–20 món, mời bạn và lỗi tạo phòng | Đã chốt |
| `05 · Khẩu vị — Tình huống` | `76:852` | Các trạng thái tải/lưu khẩu vị, chọn nhanh, đồng bộ tài khoản | Đã chốt |
| `06 · Phòng chờ — Tình huống` | `76:853` | Phòng chờ theo vai trò Host/Member, đổi thiết lập, bắt đầu/hủy/hết hạn | Đã chốt |
| Bảng quản lý Task UI | `664:89` | Bảng đối chiếu trực tiếp 20 task UI với GitHub Issues trên canvas Figma | Đã chốt |

## 2. Đối chiếu các cập nhật đã đóng (`U01–U05` & `G01–G05`)

| Mã cập nhật | Node ID trên Figma | Task tiêu thụ | Nội dung đã chuẩn hóa trên Figma |
| --- | --- | --- | --- |
| `U01` | `252:3949` | `GM-13`, `GM-27`, `GM-30` | Hiển thị rõ trường hợp đồng hạng điểm R1 và lý do chọn món thắng theo rule/tie-break |
| `U02` | `0:1`, `8:2`, `33:2`, `76:851..853` | Toàn bộ task UI | Chuẩn hóa màu chữ `#133A1B` trên nền `#46C34F` và badge trạng thái đạt chuẩn tương phản |
| `U03` | `76:869`, `86:92` | `GM-09`, `GM-24`, `GM-30` | Màn xác nhận trước khi vào phòng chỉ hiện số thành viên (`4/8 thành viên`), ẩn danh sách tên |
| `U04` | `218:8090` | `GM-14`, `GM-27`, `GM-31` | Bản ghi lịch sử legacy (`v2/v3`) ẩn điểm và Top 3 khi không có dữ liệu, không bịa số |
| `U05` | `684:89`, `684:207` | `GM-09`, `GM-24`, `GM-30` | Thêm màn vào phòng thất bại khi phòng đã bắt đầu bình chọn (`684:89`) và khi mất mạng (`684:207`) |
| `G01` | `686:311`, `686:349`, `686:376` | `GM-14`, `GM-31`, `GM-33` | Tìm bạn bè: đang tải, không có kết quả, lỗi tải kết quả |
| `G02` | `686:409`, `686:439` | `GM-14`, `GM-31`, `GM-33` | Hộp thư thông báo: trống và lỗi tải hộp thư |
| `G03` | `686:475`, `686:511` | `GM-14`, `GM-27`, `GM-31`, `GM-33` | Lịch sử: lỗi tải danh sách và lỗi tải chi tiết phiên |
| `G04` | `686:547`, `686:587` | `GM-14`, `GM-35` | Hồ sơ & bảo mật: lưu hồ sơ thất bại và đổi mật khẩu thất bại |
| `G05` | `686:625`, `686:668`, `686:707` | `GM-14`, `GM-35` | Xác thực tài khoản: đăng nhập thất bại, đăng ký thất bại, mã OTP không hợp lệ/hết hạn |

## 3. Đối chiếu bổ sung Logo Master (`2026-11-05`)

- File nguồn chuẩn: `mobile/assets/brand/gi-cung-duoc-logo.svg`
- Mã băm SHA-256: `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`
- Node trên Figma:
  - Master component: `22:394`
  - Mẫu màu thương hiệu: `213:5713`
  - Preview biểu tượng ứng dụng (App Icon): `213:5725`
  - Bản lưu trữ cũ (Archive): `171:45`
- Ghi chú: Các task UI/tích hợp khi hiển thị logo thương hiệu phải dùng đúng nguồn vector đã đồng bộ với master `22:394`; việc kiểm tra hiển thị thực tế trên máy ảo Android (AVD) và điện thoại thật qua USB thuộc trách nhiệm của từng task triển khai (`GM-27..31`, `GM-33..35`).
