# Chốt giai đoạn 1 (GM-01 → GM-31): kết quả kiểm tra main

Ngày kiểm: 2026-11-10. Người kiểm: Claude, theo yêu cầu của Hà. Tài liệu này dùng để đối chiếu và ra quyết định. Nó không thay việc Trí nghiệm thu và không đổi trạng thái nào trên Project.

## 1. Kết luận

Giai đoạn 1 **đủ điều kiện chốt về quy trình và kỹ thuật, kèm 3 điểm cần chủ dự án quyết định** (mục 4). Cụ thể:

- Board Project #2: 31/31 task GM-01 → GM-31 đều ở **Done** (GM-01 tính qua alias GM-00/#37).
- Trên main `30aa524`, cả 31 task đều có đủ output khai báo trong `tasks/task-id-map.json`, cùng với `CHECKS.md` và `HANDOFF.md`. Không file nào còn placeholder mẫu.
- CI trên `30aa524` xanh toàn bộ: repo validation, mobile (typecheck, lint, Jest, architecture, Expo check, Android bundle) và các job BE/Data chạy DB dùng một lần (GM-06/08/18/20/21/23/40, GM-07.B Auth+REST).
- Đã chạy kiểm tra lại trên máy: TypeScript, validator, task-doc index, architecture và output checker đều Pass.

Ba điểm cần quyết định trước khi chốt:

1. **Dữ liệu món chưa đủ cho bữa tối và ăn vặt.** Catalogue hiện có 39 món ở dạng draft/test_demo. Bữa tối chỉ có 7 món và ăn vặt 1 món, trong khi pool cần 10–20 món, nên API trả `409 INSUFFICIENT_DISHES`. GM-40 vẫn ở trạng thái Needs Update.
2. **Một số CHECKS ghi chưa đạt nhưng card đã Done** (GM-25, GM-27, GM-10). Trí nên ghi một dòng xác nhận để hồ sơ khớp với board.
3. **Figma parity và accessibility trên thiết bị phần lớn chưa kiểm hoặc chưa đạt.** Đây là đầu vào cho giai đoạn tinh chỉnh UI, không chặn việc chốt nếu chủ dự án đồng ý.

## 2. Căn cứ và phạm vi kiểm

| Nguồn | Nội dung |
|---|---|
| Main | `30aa524` (merge PR #164, 2026-11-09 22:58). `git ls-remote` xác nhận đây vẫn là HEAD của origin vào lúc kiểm. |
| Board live | Đọc trực tiếp Project #2 vào 2026-11-10: 32 Done, 1 In Progress (GM-32), 1 Needs Update (GM-40), 6 Todo (GM-33…38). |
| PR/Issue mở | PR #163 (GM-32 regression) và #123 (GM-36 OCR). Issue mở: #93–#100, gồm GM-01 #100 vẫn mở. |
| CI | Run "CI #149" trên `30aa524`: Success, 4m27s. Các run cho merge #127 và #159 bị huỷ do có commit mới hơn, nhưng các run sau trên `bc5a062` và `30aa524` đều xanh. |
| Tài liệu | README, `TASK_OUTPUT_REQUIREMENTS.md` (quy tắc Output == Merge Gate, kiểm thử 2 chặng ngày 07/11), `TASK_SUPPLEMENTS_2026-11-05.md`, CHECKS/HANDOFF/FIGMA_PARITY của từng task. |
| Chạy lại trên máy | `tsc --noEmit` Pass (97s). ESLint `src/data` + `src/domain` Pass; lint toàn bộ quá thời gian trên máy này, nhưng CI đã Pass. Architecture, `validate_repository.py`, `task_readiness --check-docs` đều Pass. Script đối chiếu output cho GM-01…31: 0 thiếu. |

Mobile được chạy trong thư mục `Project`, nơi đã cài sẵn `node_modules`. Nội dung mobile ở đó giống hệt main: chỉ khác 2 commit GM-40, và 3 file của 2 commit đó đã được so khớp.

## 3. Kết quả theo task

"Output" là kết quả đối chiếu file khai báo trên main. Cột ghi chú lấy từ CHECKS/FIGMA_PARITY của chính task.

### Nền tảng, UI màn hình và Figma

| Task | Nội dung | Board | Output | Ghi chú còn lại |
|---|---|---|---|---|
| GM-01 | Chốt roadmap | Done (alias GM-00) | Đủ | Issue #100 vẫn mở, nên đóng cho gọn. |
| GM-02 | Nền Expo, Inter, điều hướng | Done | Đủ | Expo SDK 58, RN 0.88. Chưa so ảnh app với Figma trên thiết bị. |
| GM-05 | Component, token | Done | Đủ | Đã có BrandLogo/SVG. Visual parity trên máy (412/320dp, font 200%, TalkBack): chưa kiểm. |
| GM-09 | Home, khách, vào phòng, hướng dẫn | Done | Đủ | Có state từng Fail visual. Kiểm Android/TalkBack/font 200%: chưa kiểm. |
| GM-10 | Thiết lập phòng dish-only | Done | Đủ | FIGMA_PARITY ghi "Trí chưa quyết định acceptance cho revision 10.2". |
| GM-11 | Lobby không ready | Done | Đủ | Đã bỏ luồng Ready. Còn mục "follow-up trước khi visual AC pass". |
| GM-12 | Flashcard, vòng 2, ACK, chờ | Done | Đủ | Không ghi gap đáng kể. |
| GM-13 | Kết quả, Top 3 đồng hạng, Places | Done | Đủ | Chủ dự án báo đã kiểm Expo trên Android 13. |
| GM-14 | Bạn bè, thông báo, lịch sử, cài đặt | Done | Đủ | Còn mục visual follow-up trên Android. |
| GM-39 | Bàn giao Figma | Done | Đủ | Ngoài dải 01–31, ghi để tham chiếu. |

### Backend

| Task | Nội dung | Board | Output | Ghi chú còn lại |
|---|---|---|---|---|
| GM-03 | Cấu trúc BE, runner QA local | Done | Đủ | Ngày 05/11: binding loopback Pass, Auth+REST 7/7, v4 API 151 ca. |
| GM-07 | Contract API, client, mock | Done | Đủ | CI GM-07.B (Auth+REST runtime) xanh. |
| GM-15 | Engine quyết định thuần | Done | Đủ | CI decision xanh. |
| GM-16 | Guest auth, session | Done | Đủ | Không ghi gap đáng kể. |
| GM-17 | RLS, ACL, retention | Done | Đủ | Không ghi gap đáng kể. |
| GM-18 | Catalogue, eligibility API | Done | Đủ | CI SQL parity + HTTP có xác thực xanh. |
| GM-19 | Phòng, settings, lobby, start | Done | Đủ | Bruno 50/50 Pass. |
| GM-20 | Nộp phiếu, 2 vòng, chốt kết quả | Done | Đủ | CI canonical writer + Auth REST xanh. |
| GM-21 | History, consent, chống lặp | Done | Đủ | CI xanh. |
| GM-22 | Bạn bè, lời mời phòng | Done | Đủ | Không ghi gap đáng kể. |
| GM-23 | Inbox, thiết bị, push sender | Done | Đủ | CI xanh. Push FCM thật thuộc Chặng 3B. |

### Dữ liệu

| Task | Nội dung | Board | Output | Ghi chú còn lại |
|---|---|---|---|---|
| GM-04 | Trường, taxonomy, template | Done | Đủ | Không ghi gap đáng kể. |
| GM-06 | Schema, migrations | Done | Đủ | 41 migration đến `0041`. CI GM-06 xanh. |
| GM-08 | Import, dataset thật trên DB test | Done | Đủ | Bản survey draft: 21 quán, 247 offering, 39 món. Verified publish chưa chạy, đúng phạm vi ADR-014. |
| GM-40 | Chuẩn hoá món, bỏ phụ thuộc quán | **Needs Update** | Đủ | PR #164 (QA manifest) đã merge 09/11, đang chờ Trí nghiệm thu. Phân bố món: sáng 14, trưa 23, tối 7, ăn vặt 1, chưa rõ 9. |

### Nối UI–API (Chặng 3A: AVD + backend QA local)

| Task | Nội dung | Board | Output | Ghi chú còn lại |
|---|---|---|---|---|
| GM-24 | Preview pool, thiết lập dish-only | Done | Đủ | Đã sửa handoff (server chọn và khoá pool). Máy thật: chờ. |
| GM-25 | Guest, Home, phòng, khẩu vị, lobby | Done | Đủ | **CHECKS ghi "AC1 Android gọi API thật: Not run".** Phần này được bù gián tiếp: AVD của GM-27 đã tạo phòng thật, AVD của GM-28 đã chạy lobby và start thật. |
| GM-26 | Ballot, waiting, vòng 2 | Done | Đủ | AVD + QA thật chạy đến hết R2 (DECIDED). Các lỗi R1/R2/R4 trong review PR #156 đã được sửa trên main (đã kiểm code). |
| GM-27 | Kết quả Top 3, Places | Done | Đủ | **CHECKS tự ghi chưa đạt merge gate Chặng 3A**: lượt AVD ngày 07/11 không tới được lobby/result vì lỗi lưu khẩu vị, lỗi này đã được sửa ở migration `0040`. Màn kết quả sau đó đã chạy live trên AVD trong lượt GM-28 ngày 08/11. |
| GM-28 | Bạn bè, inbox, lịch sử | Done | Đủ | AVD + QA thật Pass: mời, chấp nhận, start, nộp phiếu, kết quả, inbox, lịch sử/xoá, outsider 403. **Figma parity Partial/Fail.** TalkBack đầy đủ chưa kiểm. |
| GM-29 | Quyền thông báo, mở app từ push | Done | Đủ | Dev build trên AVD Pass (permission, inbox, tap mô phỏng). FCM thật để sang 3B. |
| GM-30 | QR, link, vị trí, Places | Done | Đủ | AVD Pass bằng adapter mô phỏng có gắn nhãn. Camera thật và Google Places key để sang 3B. |
| GM-31 | Cache, outbox, phục hồi phiên | Done | Đủ | AVD Pass: force-stop, offline, 360/412dp, font 200%. |

## 4. Điểm cần chủ dự án quyết định trước khi chốt

1. **Dữ liệu (GM-08/GM-40).** Với 39 món draft, chỉ phòng bữa sáng (tối đa 14 món) và bữa trưa (23 món) tạo được pool từ 10 món trở lên. Phòng bữa tối và ăn vặt sẽ luôn trả `INSUFFICIENT_DISHES`; lỗi này đã được ghi nhận trong CHECKS của GM-40 (HTTP 409, 7 món có sẵn). Có ba hướng:
   - Chốt giai đoạn 1 với dữ liệu test hiện có và bổ sung món ở giai đoạn tinh chỉnh.
   - Bổ sung món tối/ăn vặt, hoặc gán meal slot cho 9 món "chưa rõ", trước khi chốt.
   - Tạm giới hạn UI chỉ cho chọn sáng/trưa khi demo.
2. **Hồ sơ khớp với board.** GM-25 (AC1 Android–API), GM-27 (Chặng 3A) và GM-10.2 (acceptance) đang Done trên board nhưng CHECKS vẫn ghi chưa đạt hoặc chưa quyết. Đề nghị Trí thêm một dòng "Nghiệm thu theo bằng chứng X" vào từng CHECKS, hoặc mở supplement.
3. **Tiêu chí visual.** Figma parity và accessibility (TalkBack, font 200%, 320/360dp) trên thiết bị chưa đạt hoặc chưa kiểm ở GM-05/09/10/11/14/28. Nếu giai đoạn tinh chỉnh sẽ làm lại UI, có thể chấp nhận các mục này là "chuyển sang tinh chỉnh" thay vì chặn việc chốt.

## 5. Đầu vào cho giai đoạn tinh chỉnh

- **UI theo Figma:** GM-28 (header, điều hướng, bố cục Friends/Inbox/History), các state visual Fail của GM-09, và follow-up của GM-10/11/14. Mỗi màn cần ảnh Figma và ảnh app cùng viewport.
- **Gọn luồng real/mock:** app tự chạy chế độ mock preview khi thiếu `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nhiều route vẫn rẽ hai nhánh real/mock (`create`/`create-entry`, `join`/`join-entry`, `context`, `preview`). Khi tinh chỉnh nên quyết định giữ mock chỉ trong `dev/`, để bản demo không vô tình chạy fixture.
- **Backend cho điện thoại thật:** toàn bộ kiểm thử hiện chạy trên Docker local và AVD qua `adb reverse`. Chặng 3B (GM-33/34) cần backend mà điện thoại truy cập được, qua LAN hoặc một môi trường staging. GM-25 cũng ghi "remote backend staging verification pending".
- **Dữ liệu:** xem mục 4.1. Khi UI tinh chỉnh đổi trường hiển thị (ảnh, giá, mô tả), cần đối chiếu lại `dish-catalogue-v1` và projection GM-18.2.
- **GM-32 regression** (PR #163 đang mở) nên được merge trước khi bắt đầu sửa BE theo UI mới, để có lưới an toàn.
- **Dọn dẹp:** đóng issue #100. Các file trong `tasks/backlog|review|in-progress` đang ghi status cũ; Project là nguồn chính, nhưng các file này dễ gây nhầm cho người mới đọc.

## 6. Giới hạn của lần kiểm này

- Không chạy AVD, điện thoại hay backend Docker. Kết luận về runtime dựa vào CI trên `30aa524` và evidence trong CHECKS của từng task.
- Không chạy lại toàn bộ Jest (khoảng 1.360 test) và ESLint trên máy vì giới hạn thời gian mỗi lệnh. CI đã chạy cả hai và đều Pass.
- Thư mục IE307 trên máy đang báo 638 file "modified", nhưng đó chỉ là khác biệt CRLF/LF, không có thay đổi nội dung. Nên đặt `core.autocrlf` hoặc chạy `git checkout -- .` để working tree sạch.
- Số liệu board được đọc lúc kiểm và có thể đổi sau đó.
