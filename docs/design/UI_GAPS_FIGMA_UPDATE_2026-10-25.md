# Bổ sung UI G01–G05 — 2026-10-25

Theo yêu cầu của Trí sau khi xem và đồng ý các đề xuất, đã cập nhật 12 frame bằng layer chỉnh sửa được trong Figma. Không sửa app, API, database, Project status, owner hoặc deadline. Đây là bàn giao thiết kế bổ sung, chưa là nghiệm thu task/runtime; Trí review cuối.

File `3Ysh0mOAEkAgA5DgZPSC1j`, trang màn hình `33:2`, trang component `8:2`. Không lấy được revision Figma; định danh bằng ngày kiểm, file/page/node và ảnh xuất. Baseline repo đối chiếu khi cập nhật: `f64713df1760cb6be534e42a16872467073c1904`.

## Frame cụ thể

| Gap | State | Node / link |
|---|---|---|
| G01 | Đang tìm, giữ Ngọc Anh | [801:9510](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9510) |
| G01 | Không có kết quả, Xóa từ khóa | [801:9542](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9542) |
| G01 | Lỗi tải, giữ truy vấn, Thử lại | [801:9575](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9575) |
| G02 | Inbox thông báo rỗng | [801:9627](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9627) |
| G02 | Inbox tải lỗi | [801:9655](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9655) |
| G03 | Lỗi tải lần đầu | [801:9695](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9695) |
| G03 | Offline có cache, fetchedAt và cảnh báo cũ | [801:9846](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9846) |
| G03 | Offline chưa có cache | [801:9775](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9775) |
| G04 | Đang lưu hồ sơ | [801:9899](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9899) |
| G04 | Lỗi giữ Minh Trí, cho sửa/thử lại | [801:9939](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9939) |
| G05 | Đang đổi mật khẩu, che cả 3 ô | [801:9991](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991) |
| G05 | Lỗi mạng/server xóa cả 3 ô, Lưu disabled | [801:10030](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) |

Các frame nằm cùng hàng với nhóm gốc Bạn bè, Thông báo, Lịch sử, Cá nhân trên trang 03. Sửa trực tiếp ID bản nháp đã có, bỏ section nháp trùng sau khi chuyển; không nhân bản cả luồng. Gỡ một starting point Lịch sử trùng kế thừa từ bản nháp, giữ đúng 12 điểm bắt đầu chính. Không thay đổi luật vote.

## Component và tokens

- [GCD / Collection State](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1746): Empty / Error / Loading, Title/Message/Icon và tùy chọn hiện message/action. Loading chỉ hiện loader và skeleton.
- [GCD / Search Skeleton Row](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1663).
- [GCD / Request Banner](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1775): Offline / Error, copy và retry tùy chọn.
- Tái dùng Header, Button, Form Field, status bar/nav hiện có. Thêm hai icon vector Search Person/Wifi Off và alias `color/status/error-surface`; CTA theo token action xanh tương phản.
- Các phần mới là native editable nodes, Inter, không nhập cả ảnh UI làm background. Main frame 412×915. Kiểm cấu trúc không có image-fill mới trong 12 frame.

## Kiểm tra và giới hạn

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| 12 frame state và nội dung | Pass visual | Đã xem ảnh xuất từng frame; sửa nút đen, skeleton quá đậm và lệch tiêu đề tìm kiếm |
| Component và layout | Pass visual / structural | Auto-layout phần trạng thái; props/variant được sử dụng từ instance; kiểm ảnh component sheet |
| G05 bảo mật form ở state lỗi | Pass visual | Cả 3 ô là placeholder trống, nút Lưu disabled; không phải bằng chứng xử lý password runtime |
| Bố cục và điểm bắt đầu | Pass structural | Cùng nhóm xếp ngang, readback 12 starting points; ghi chú handoff trỏ frame thật |
| Retry, lưu, Back và Present | Not run | Lượt này cập nhật UI; chưa nối/chạy tương tác các state bổ sung |
| Android, TalkBack, 200%, API/ACL/cache | Not run | Cần implementation và kiểm thực tế tại task tương ứng |
| Review cuối | Chờ Trí | Không tự ghi Approved/Done |

Ảnh và ledger trên máy: `C:/Users/ADMIN/.codex/visualizations/2026/10/16/01a145b9-5d6a-7e00-ae1f-a2f72809de03/ui-gap-proposals-2026-10-25/`. Trong `figma-evidence/`, ảnh có hậu tố `final` và `components-final.png` thay các bản trước khi sửa. Ledger lưu node và phạm vi kiểm; đây không phải revision giả hoặc bằng chứng runtime.

GM-14 nhận G01–G03, GM-28/31 nhận tích hợp; GM-35 giữ G04/G05 ở P1. Task map ghi `Designed — pending final review`, khác với Pending design chưa có frame và khác với nghiệm thu implementation. Chưa cập nhật GitHub issue/Project trong lượt này.

## Kiểm tra hồ sơ local

- `python scripts/validate_repository.py`: Pass.
- `python scripts/task_readiness.py --check-docs`: Pass, indexes khớp metadata.
- `python -m unittest discover -s tests -p 'test_ui_refinement_task.py'`: 5/5 Pass. Cập nhật assertion map từ note Pending design/null sang 12 frame thật, review cuối còn chờ và Present Not run.
- `git diff --check`: Pass.
- Regression toàn repo: 594 tests, 21 failures, 6 skipped. Các lỗi nằm trong `test_mobile_api_test_plan.py`: task/handoff GM-24..31/33/35 không còn khớp assertion link `MOBILE_API_TEST_MATRIX.md` và cụm `Android thật`. Các task/manifest/test này không được sửa trong lượt bổ sung Figma; không sửa lan sang chúng để làm xanh regression. Không báo toàn repo Pass.
