# CHECKS — GM-39 (Bàn giao Figma và kiểm tra thiết kế bổ sung)

- Task: [GM-39](../../../../tasks/backlog/GM-39.md)
- Owner: Trang
- Reviewer: Trí
- Mode: `figma-handoff`
- Contract version: `ui-figma-final/2026-10-25/GM-39.2`
- Source revision / baseline: `main` (`bb2103a`) — Figma file `3Ysh0mOAEkAgA5DgZPSC1j`
- Date recorded: `2026-11-07`
- Scope note: Kiểm tra và bàn giao ở tầng thiết kế Figma (`figma-handoff`); **không** chứng minh hoặc thay thế kiểm thử Expo Go, Android Emulator (AVD), điện thoại thật USB hay API runtime của các task code/tích hợp.

## 1. Bảng kết quả kiểm tra

| Hạng mục / AC | Môi trường / Công cụ | Input / Điểm kiểm | Expected | Actual | Kết quả | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| AC-1: Node/link đọc được qua Figma MCP, inventory/page/state khớp thiết kế | Figma MCP + `scripts/validate_repository.py` + `tests/test_mobile_api_test_plan.py` | `docs/design/UI_FIGMA_TASK_MAP.json` (fileKey `3Ysh0mOAEkAgA5DgZPSC1j`, 20 UI tasks, 66 input nodes, 6 pages `0:1`, `8:2`, `33:2`, `76:851`, `76:852`, `76:853`) | Toàn bộ 20 task UI có node đầu vào và URL Figma hợp lệ; 66 node đầu vào tồn tại và khớp inventory thiết kế | 20 task UI (`GM-02`, `GM-05`, `GM-09..14`, `GM-24..31`, `GM-33..35`, `GM-39`) ánh xạ đầy đủ 66 node đầu vào và 6 page chính | `Pass` | [UI_FIGMA_TASK_MAP.json](../../../design/UI_FIGMA_TASK_MAP.json), [MAIN_FIGMA_READINESS_2026-10-28.md](../../../project/audits/MAIN_FIGMA_READINESS_2026-10-28.md) |
| AC-2: Mỗi gap có task/owner/status/frame (U01–U05 & G01–G05) | Figma MCP + tài liệu bàn giao thiết kế | `docs/design/UI_APPROVED_UPDATES_2026-10-25.md` và `docs/design/UI_GAPS_FIGMA_UPDATE_2026-10-25.md` | Các cập nhật U01–U05 và 12 màn trạng thái phụ G01–G05 có node ID, task nhận (`GM-13`, `GM-14`, `GM-30`, `GM-31`, `GM-35`, `GM-39`) và mô tả rõ ràng | U01–U05 và 12 màn G01–G05 (`686:311`..`686:707`) đã dựng trên trang `03 · Màn hình` (`33:2`) và gắn vào `UI_FIGMA_TASK_MAP.json` | `Pass` | [UI_FINAL_HANDOFF_2026-10-25.md](../../../design/UI_FINAL_HANDOFF_2026-10-25.md), [UI_GAPS_FIGMA_UPDATE_2026-10-25.md](../../../design/UI_GAPS_FIGMA_UPDATE_2026-10-25.md) |
| AC-3: Bổ sung logo master Figma (2026-11-05) | Asset hash check + Figma node inventory | `mobile/assets/brand/gi-cung-duoc-logo.svg`, master `22:394`, color sample `213:5713`, app-icon preview `213:5725` | SVG nguồn có SHA-256 `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`, 10 linked instances đồng bộ, archive `171:45` giữ nguyên | Khớp SHA-256 và danh sách 10 linked instances trong báo cáo đối chiếu | `Pass` | [FIGMA_PARITY.md](FIGMA_PARITY.md) |
| AC-4: Phân tách rõ tầng thiết kế vs tầng runtime/thiết bị | Kiểm định biên độ bàn giao (`UI_FINAL_HANDOFF_2026-10-25.md`) | `prototypeValidation` trong `UI_FIGMA_TASK_MAP.json` và ghi chú phạm vi trong `HANDOFF.md` | Không ghi nhận Expo/API/Android Pass từ tài liệu thiết kế; `prototypeValidation` giữ `Not run` | `prototypeValidation: "Not run (design frame inventory only)"`; các task thực thi UI/API kiểm riêng theo Chặng 3A (AVD) và Chặng 3B (USB) | `Pass` | [HANDOFF.md](HANDOFF.md), [FIGMA_PARITY.md](FIGMA_PARITY.md) |
| Prototype Present / Tương tác luồng động trên Figma Present | Figma Present | Chạy thử prototype links xuyên trang | Chưa yêu cầu đóng gate thiết kế (`UI_FINAL_HANDOFF_2026-10-25.md`) | `Not run` — chỉ kiểm frame/node inventory tĩnh theo quyết định chốt scope ngày 2026-10-25 | `Not run` | [UI_SCOPE_CONFIRMED_2026-10-25.md](../../../design/UI_SCOPE_CONFIRMED_2026-10-25.md) |
| Kiểm thử runtime Mobile / Android AVD / Điện thoại thật USB | Không thuộc scope `GM-39` (`figma-handoff`) | App Expo / Android / Supabase | Thực hiện ở các task `GM-05`, `GM-09..14`, `GM-24..31`, `GM-33..35` | `N/A` cho task thiết kế `GM-39` | `N/A` | [TASK_OUTPUT_REQUIREMENTS.md](../../../project/TASK_OUTPUT_REQUIREMENTS.md) |

## 2. Lệnh kiểm chứng cấu trúc và liên kết tài liệu

```bash
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
python -m unittest tests/test_mobile_api_test_plan.py
```

- Kết quả: Toàn bộ kiểm tra cấu trúc tài liệu, đường dẫn artifact đầu ra của `GM-39` và ánh xạ `UI_FIGMA_TASK_MAP.json` đều `Pass`.
