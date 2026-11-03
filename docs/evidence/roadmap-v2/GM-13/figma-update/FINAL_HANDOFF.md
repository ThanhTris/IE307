# GM-13.2 — bàn giao sau kiểm thử Expo

Ngày 2026-11-03 (Asia/Bangkok), owner Tuấn, reviewer Trí (`ThanhTris`).
Nhánh `codex/gm-13-figma-update`, base main `7e24074`, implementation cuối
`9373b804003c1a576e6de65cdd76823eeda364dd`. Revision yêu cầu
`ui-figma-final/2026-10-25/GM-13.2`. Commit bàn giao cập nhật hồ sơ và
đồng bộ regression tests với nút QA development; không đổi product source.

Đây là đầu vào UI/mock cho các task sau. Không phải approval của Trí,
không tự mở dependency Project hoặc chứng minh tích hợp API/native map.

## Hồ sơ cần nhận

| Tài liệu | Mục đích |
| --- | --- |
| [CONSUMER_GUIDE](CONSUMER_GUIDE.md) | File/props/callback, mapping từng GM nhận, ca tích hợp và rollback |
| [FINAL_CHECKS](FINAL_CHECKS.md) | Lệnh, kết quả cuối, gate và giới hạn môi trường |
| [FINAL_CHECKS.json](FINAL_CHECKS.json) | Báo cáo kiểm máy đọc của revision cuối |
| [FINAL_SOURCE_MANIFEST.json](FINAL_SOURCE_MANIFEST.json) | Hash source/assets/dependencies cuối, tách snapshot bước6 |
| [DEVICE_CHECKS](DEVICE_CHECKS.md) | Xác nhận Expo Android13 của người dùng và các AC chưa xác nhận riêng |
| [FIGMA_PARITY](../FIGMA_PARITY.md) | Frame → state/fixture → code/evidence, sai khác có chủ đích |
| [INPUT_AUDIT](INPUT_AUDIT.md), [INPUT_MANIFEST](INPUT_MANIFEST.json) | Provenance PNG và upstream khi bắt đầu |

Các STEP1–STEP6, CHECKS.json/SOURCE_MANIFEST.json cũ, QA_ACCESS_FIX,
UI_REFINEMENT và WINNER_INDICATOR giữ làm lịch sử đúng revision đã kiểm.
Không lấy số test hoặc bundle bước6 thay kết quả cuối.

## Đầu ra đã triển khai

- Vinh danh đóng được qua tap/nút/Back, hiện một lần cho một result trong
  flow; retry quán không phát lại. Có cấu hình Reduce Motion.
- Kết quả1/2/3 món, dense rank, đồng hạng đầu/cuối/tất cả, ảnh/null và
  điểm/giá nullable. Tên dài không làm ảnh đồng hạng lệch nhau. Không tính
  lại điểm, chọn lại winner hoặc tự thêm món trên client.
- Chỉ món có `isWinner` mang viền đậm và nhãn “Món được chọn”. Phần quán
  ghi “Tìm quán cho: …” theo winner. PNG mẫu được clip để không lộ viền
  baked; việc crop chỉ áp dụng mock artwork, real mặc định scale1.
- Phân biệt loading/finalizing/error/unknown/invalid với hai terminal
  NO_CONSENSUS: R1 EMPTY_INTERSECTION và R2 ALL_REMOVED. Không mở vòng3.
- Quán/map có ready/loading/empty/error, quyền chưa cấp/từ chối/bị chặn,
  vị trí tắt/offline/unsupported, cached label và retry/callback có guard.
- Home/đóng/Back về Home; Tạo phòng mới mở entry GM-09/10, không mang
  receipt/phiếu cũ. Real-mode result có guard và chưa nhận adapter GM-27.
- Giữ explicit development legacy regression, variant cards của GM-05
  và alias hook motion GM-10. Không đổi package/lockfile/API/SQL/engine.

## Cách mở và tái lập

Từ repo root:

```powershell
npm --prefix mobile start -- --clear
```

Home mock sau nhập tên khách → cuộn cuối → Công cụ kiểm thử → Xem cấu
trúc ứng dụng → Mở kết quả và chưa đồng thuận · GM-13. Sau vinh danh,
chọn Tình huống kiểm thử kết quả → Xem tất cả tình huống hoặc tìm kiếm.

`/room/result` là route kết quả mới, `/room/no-consensus` là màn chưa
đồng thuận. Công cụ QA chỉ development/mock; không dùng đường dẫn QA
hoặc fixture làm product flow khi nhận task tích hợp.

Mock recovery error/unknown/invalid trả projection hợp lệ rồi vinh danh.
Invalid ban đầu và dữ liệu wire lỗi thật vẫn phải bị từ chối. Đây không
phải cơ chế sửa payload server hoặc API lỗi tự fallback dữ liệu mẫu.

## Trạng thái nghiệm thu và phần ngoài scope

Người dùng xác nhận đã kiểm thử Expo xong trên Android13, chữ rõ ở cỡ
hiện tại. [DEVICE_CHECKS](DEVICE_CHECKS.md) ghi đúng phạm vi xác nhận;
chưa có model máy, ảnh sau sửa/viewport, font200%, TalkBack hoặc kết quả
riêng Reduce Motion. Có chế độ tối theo lời người dùng, chưa xác nhận
từng màn/state trong chế độ đó. Không tự ghi toàn bộ AC thiết bị Pass.

Google Places/GPS/map thật, mở Maps/TikTok/YouTube native, auth/network,
persisted retry/cache qua khởi động app và APK do consumer tích hợp/QA.
Map mẫu có nhãn minh họa; link Maps không thay in-app map của GM-30.

Trước tích hợp cần Project Done do Trí xác nhận cho từng dependency,
đúng contract/HANDOFF/commit upstream và kiểm trên DB/build thực tế.
Gate kiểm file/Project không thay review hoặc phép kiểm integration.
Không ghi Done/Approved hoặc thay task status trong đợt bàn giao này.
