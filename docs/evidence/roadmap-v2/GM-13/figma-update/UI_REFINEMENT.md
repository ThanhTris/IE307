# GM-13 — chỉnh UI theo phản hồi Expo

Ngày2026-11-03, sau commit `7571025`, branch `codex/gm-13-figma-update`.
Đối chiếu năm ảnh người dùng cung cấp; không đưa ảnh thiết bị lên Git.

- Retry lỗi tải/chưa xác nhận mở vinh danh khi lần đầu nhận kết quả hợp
  lệ. Bộ mẫu invalid trả projection hợp lệ mới cùng resultId khi retry;
  validator sản phẩm giữ nguyên, chọn lại invalid vẫn bị từ chối. Retry
  quán không phát lại vinh danh hoặc thay món thắng.
- Rút gọn trạng thái thành “Đang tìm quán”, “Bật vị trí để tìm quán” và
  nút “Thử lại” cho lỗi tải quán. Các nút retry trạng thái khác giữ copy cũ.
- Description R1 dùng14/22 để đủ một hàng trên chiều rộng mẫu ở cỡ chữ
  thường; giữ “Vòng 1.” bằng khoảng trắng không ngắt. Không ép single-line
  hoặc tắt font scaling, màn hẹp/chữ lớn vẫn được xuống dòng. R2 giữ style cũ.
- Podium dành các ô tên/điểm/attribution có chiều cao theo nội dung cao
  nhất, để ảnh của các món cùng hạng thẳng hàng dù tên dài khác nhau.
  Số dòng không bị cắt; đo lại theo width/fontScale/nội dung. Không thay
  rank, score, thứ tự dữ liệu, kích thước ảnh, chiều cao bục theo hạng,
  artwork, winner hoặc variant cards của consumer legacy.

Live start gate13:50:27Z ngày03/11: READY_TO_CLAIM; không ghi approval/Project.

Kiểm đã chạy trên bản sửa:

- 5 suites/41 tests Pass51.296s: recovery, podium, read states, Places,
  celebration. Bao gồm retry invalid/reselect invalid và retry quán giữ intro đóng.
- TypeScript và lint các file source/test sửa: Pass,0 warnings.
- Shared components và router:2 suites/33 tests Pass71.012s, gồm cả Home
  chính → Foundation → Result → NoConsensus → Home và legacy routes.
- Tổng7 suites/74 tests Pass; architecture, repository validator,
  task indexes và git diff --check: Pass.

Các CHECKS.json/SOURCE_MANIFEST.json và Android export của bước6 là
snapshot lịch sử, không đổi hash để gắn lượt kiểm cũ vào code mới.
Chưa chạy lại full mobile/Python regression hoặc native export cho bản vá.
Visual/font lớn/motion trên Expo cần người dùng tải lại và xác nhận;
ảnh lỗi đầu vào không là evidence UI sau sửa. Lưu bản vá bằng commit local
theo yêu cầu người dùng; không push trong đợt sửa này.
