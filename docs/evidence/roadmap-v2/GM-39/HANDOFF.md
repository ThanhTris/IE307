# HANDOFF — GM-39 (Bàn giao Figma và kiểm tra thiết kế bổ sung)

- Task: [GM-39](../../../../tasks/backlog/GM-39.md)
- Owner: Trang
- Reviewer: Trí
- Contract version: `ui-figma-final/2026-10-25/GM-39.2`
- Trạng thái trên GitHub Project #2: `Done` (bàn giao hồ sơ thiết kế Figma làm nguồn chuẩn cho các task UI/tích hợp)

## 1. Artifact bàn giao

| Artifact | Đường dẫn | Mô tả |
| --- | --- | --- |
| Báo cáo chốt Figma cuối | [UI_FINAL_HANDOFF_2026-10-25.md](../../../design/UI_FINAL_HANDOFF_2026-10-25.md) | Chốt phạm vi UI Figma, màu sắc, quy tắc hiển thị và độ phủ luồng cốt lõi + trạng thái phụ |
| Map máy đọc Task ↔ Figma Node | [UI_FIGMA_TASK_MAP.json](../../../design/UI_FIGMA_TASK_MAP.json) | Ánh xạ 20 task UI (`GM-02`, `GM-05`, `GM-09..14`, `GM-24..31`, `GM-33..35`, `GM-39`) tới 66 node đầu vào đã xác minh và các node bổ sung `G01–G05` |
| Kế hoạch triển khai UI theo Figma | [UI_FIGMA_IMPLEMENTATION_2026-10-25.md](../../../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md) | Hướng dẫn chi tiết đầu vào/đầu ra thiết kế cho từng task UI và UI–API |
| Kết quả kiểm tra thiết kế | [CHECKS.md](CHECKS.md) | Bảng kiểm chứng node/link, gap log `U01–U05` / `G01–G05`, và bổ sung logo master `22:394` |
| Báo cáo đối chiếu thiết kế | [FIGMA_PARITY.md](FIGMA_PARITY.md) | Chi tiết danh mục pages, group frames, cập nhật `U01–U05`, `G01–G05` và đồng bộ logo SVG |

## 2. Tóm tắt nội dung bàn giao cho các task nhận (`GM-27..31`, `GM-33..35`)

1. **Nguồn thiết kế duy nhất:** File Figma `3Ysh0mOAEkAgA5DgZPSC1j` ([Gì Cũng Được — Màu sắc thương hiệu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=0-1)) cùng `docs/design/UI_FIGMA_TASK_MAP.json`. Prototype HTML cũ (`design/prototypes/gi-cung-duoc.html`) chỉ giữ làm lịch sử tham chiếu.
2. **Độ phủ màn hình và trạng thái phụ:**
   - Đã hoàn thiện `U01–U05` ([UI_APPROVED_UPDATES_2026-10-25.md](../../../design/UI_APPROVED_UPDATES_2026-10-25.md)): đồng hạng điểm R1 (`252:3949`), tương phản CTA trên nền `#46C34F`, ẩn tên thành viên trước khi vào phòng (`76:869`, `86:92`), ẩn điểm/Top 3 cho lịch sử legacy (`218:8090`), và bổ sung 2 màn lỗi vào phòng (`684:89`, `684:207`).
   - Đã hoàn thiện 12 màn trạng thái phụ `G01–G05` ([UI_GAPS_FIGMA_UPDATE_2026-10-25.md](../../../design/UI_GAPS_FIGMA_UPDATE_2026-10-25.md)): tìm bạn đang tải/không kết quả/lỗi (`686:311`, `686:349`, `686:376`), hộp thư rỗng/lỗi (`686:409`, `686:439`), lịch sử lỗi danh sách/chi tiết (`686:475`, `686:511`), lưu hồ sơ/mật khẩu lỗi (`686:547`, `686:587`), đăng nhập/đăng ký/OTP lỗi (`686:625`, `686:668`, `686:707`).
3. **Đồng bộ thương hiệu (2026-11-05):**
   - Logo SVG nguồn `mobile/assets/brand/gi-cung-duoc-logo.svg` (`SHA-256: cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`) đã cập nhật vào master component `22:394` và 10 linked instances.

## 3. Giới hạn và biên độ trách nhiệm

- Handoff của `GM-39` chỉ xác nhận **thiết kế Figma và bảng ánh xạ node** đã đầy đủ.
- `GM-39` **không** nghiệm thu code React Native, **không** xác nhận kết nối API Supabase và **không** thay thế báo cáo `FIGMA_PARITY.md` trên máy ảo Android (AVD — Chặng 3A) hoặc điện thoại thật qua USB (Chặng 3B) của từng task triển khai.
