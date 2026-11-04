# GM-12.2 — Ma trận đối chiếu thiết kế Figma và Implementation

**Bản cập nhật:** 2026-11-03 theo yêu cầu rà soát Figma ngày 2026-10-28 của chủ dự án Trí (`ThanhTris`).
**Mục tiêu:** Nâng cấp màn hình Vòng 1 (`VoteScreen.tsx`) sang chế độ Flashcard tương tác cử chỉ và Vòng 2 (`FinalRoundScreen.tsx`) sang cơ chế giới hạn loại Cap 30% ($\max(1, \lfloor 0.30 \times N \rfloor)$), đếm ngược chờ 60 giây và kiểm soát quyền chốt sớm của Host ($A_r > M/2$).

---

## 1. Thông tin đối chiếu Figma Nodes

| Node ID | Tên Frame Figma | Route / Màn hình | Trạng thái / Dữ liệu mô phỏng | Kết quả đối chiếu Implementation |
|---|---|---|---|---|
| [`330:3071`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3071) | 07 · Vòng 1 / Chọn món / Gửi phiếu | `/room/vote` (`VoteScreen.tsx`) | 10–20 món trong pool đã khóa; chế độ flashcard | **Khớp**: Giao diện flashcard từng thẻ (`FlashcardDeckView.tsx`), hiển thị số thứ tự $k/N$, thanh tiến trình, 3 nút cử chỉ thay thế ($\ge 48\text{dp}$ touch target: `✕ Không ăn` - NO, `★ Muốn ăn` - WANT, `✓ Ăn được` - OK), chạm hai lần (double-tap) đặt WANT, hoàn tác thẻ trước khi nộp, khóa nút khi pending/ACK |
| [`330:3072`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3072) | 08 · Chờ vòng 1 / Chốt ngay / Rời phòng | `/room/vote` (`VoteScreen.tsx`) | Sau ACK Vòng 1, trạng thái phòng chờ kết quả | **Khớp**: Hiển thị `WaitingSummary` với đồng hồ đếm ngược 60 giây server deadline, số lượng thành viên đã nộp ($A_r/M$). Nút "Chốt ngay" chỉ bật cho Host khi $A_r > M/2$; kịch bản $1/3$ bị disabled, $2/3$ bật |
| [`330:3073`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3073) | 09 · Vòng 2 / Pool còn lại / Giới hạn loại | `/room/vote` / `/room/final` (`FinalRoundScreen.tsx`) | Pool còn lại $N \ge 1$; áp dụng Cap 30% | **Khớp**: Thẻ ứng viên `CandidateKeepRemoveCard` với lựa chọn Giữ/Loại; tự động chặn nút Loại khi đã chạm trần $\max(1, \lfloor 0.30 \times N \rfloor)$; loại bỏ nút "Chọn loại tất cả" không giới hạn; giữ nút an toàn "Giữ tất cả"; hiển thị huy hiệu trần loại |
| [`330:3074`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3074) | 10 · Chờ vòng 2 / Xác nhận / Gửi lỗi / Kết nối lại | `/room/final` (`FinalRoundScreen.tsx`) | Nộp phiếu Vòng 2, xác nhận modal, chờ kết quả cuối | **Khớp**: SheetDialog xác nhận chi tiết số món giữ và số món loại trước khi gửi; cảnh báo rủi ro `ALL_REMOVED` nếu loại hết; hỗ trợ banner lỗi mạng và nút "Thử lại"; đếm ngược 60 giây và chốt sớm đa số $A_r > M/2$ |
| [`638:9369`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=638-9369) | Vòng 2 — Còn 1 món · Đã loại | `/room/final` (`FinalRoundScreen.tsx`) | Pool $N=1$, Cap = 1 món, trạng thái đã loại/chưa loại | **Khớp**: $N=1$ vẫn mở Vòng 2 thật sự; người chơi được quyền loại 1 món (chạm trần Cap 1) hoặc giữ; không tự động chốt winner trước khi biểu quyết Vòng 2 |
| [`617:1671`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=617-1671) | GCD / Result Podium · Đồng hạng | `/room/final` (`FinalRoundHeaderAndOutcome.tsx`) | Kết quả Vòng 2 sau khi có winner hoặc đồng thuận | **Khớp**: Khối hiển thị quán quân từ `result` fixture hợp lệ; tích hợp liên kết điều hướng sang `/room/result` để xem chi tiết địa điểm/bản đồ |

---

## 2. Chi tiết các điểm nâng cấp và khắc phục sai khác

1. **Vòng 1 — Flashcard tương tác và thay thế danh sách cuộn cũ:**
   - Phiên bản trước sử dụng FlatList cuộn dọc truyền thống. Đợt nâng cấp này bổ sung `FlashcardDeckView.tsx` làm chế độ mặc định (`initialViewMode="flashcard"`), tập trung người dùng vào từng món ăn một cách trực quan.
   - Thao tác:
     - Vuốt/chọn: Nút `✕ Không ăn` (NO - đỏ), `★ Muốn ăn` (WANT - xanh chính), `✓ Ăn được` (OK - xanh nhạt). Cả 3 nút đều có chiều cao $\ge 48\text{dp}$ đáp ứng chuẩn Accessibility/TalkBack.
     - Cử chỉ chạm hai lần (Double-tap) trực tiếp trên thẻ món ăn để chọn nhanh WANT.
     - Nút hoàn tác (Undo) cho phép quay lại thẻ trước để thay đổi ý định trước khi nộp.
     - Sau khi duyệt hết $N$ món, xuất hiện nút "Xác nhận nộp phiếu Vòng 1". Khi pending hoặc ACK, toàn bộ thao tác bình chọn và hoàn tác bị khóa cứng để chống gửi trùng.

2. **Vòng 2 — Áp dụng triệt để giới hạn loại Cap 30%:**
   - Công thức: $\text{eliminationCap} = \max(1, \lfloor 0.30 \times N \rfloor)$.
     - $N=1 \implies \text{Cap} = 1$.
     - $N=3 \implies \text{Cap} = 1$.
     - $N=4 \implies \text{Cap} = 1$ (sửa lỗi cũ cho phép loại 2 món ở $N=4$).
     - $N=10 \implies \text{Cap} = 3$.
   - **Xóa bỏ nút "Chọn loại tất cả":** Loại bỏ hoàn toàn nút chọn loại tất cả không giới hạn trong giao diện mới để ngăn chặn người dùng vi phạm Cap.
   - Giữ lại nút tiện ích an toàn **"Giữ tất cả các món còn lại"** (`handleSetAllKeep`).
   - Thẻ `CandidateKeepRemoveCard`: Nút "✕ Loại" tự động bị vô hiệu hóa (`disabled={!canRemove}`) khi số món đã loại đạt trần $\text{Cap}$, kèm theo nhãn thông báo rõ ràng "Đã đạt giới hạn loại".

3. **Phòng chờ (Waiting State) — Đếm ngược 60 giây và quyền Host Chốt ngay:**
   - Đồng hồ đếm ngược 60 giây (`WAITING_DEADLINE_SECONDS = 60`) được kích hoạt ngay khi có người đầu tiên gửi ballot thành công và nhận ACK từ server.
   - Host chỉ có quyền nhấn "Chốt ngay" khi và chỉ khi:
     $$A_r > \frac{M}{2} \iff A_r \ge \left\lfloor \frac{M}{2} \right\rfloor + 1$$
     với $A_r$ là số thành viên đã ACK phiếu của vòng hiện tại và $M$ là tổng số thành viên trong roster khóa.
   - Kiểm thử thực tế trên Scenario Picker:
     - Roster 3 người ($M=3$), $1/3$ nộp: Nút "Chốt phiếu ngay (Host)" bị **vô hiệu hóa** (disabled).
     - Roster 3 người ($M=3$), $2/3$ nộp: Nút "Chốt phiếu ngay (Host)" được **kích hoạt** (enabled).
     - Thành viên thông thường (không phải Host): Nút không hiển thị hoặc không có quyền kích hoạt.

4. **Trình chọn kịch bản (Scenario Picker) phục vụ kiểm thử:**
   - Tích hợp thanh công cụ kịch bản ngay trên đầu màn hình Expo Go:
     - Vòng 1: Chọn vai trò Host/Member, chuyển đổi tiến độ nộp $1/3$ vs $2/3$, chuyển đổi giữa chế độ Flashcard và Danh sách (List mode).
     - Vòng 2: Chuyển đổi giữa các kịch bản Đồng thuận (`consensus`), Cả nhóm loại hết (`all_removed`), Lỗi mạng (`error`), và Chờ thành viên (`waiting`).

---

## 3. Trạng thái kiểm tra trực quan và thiết bị (Visual Acceptance)

- **Kiểm thử Component & Interaction:** 23/23 bài kiểm thử Jest đạt (PASS) trong `mobile/tests/component/votingScreens.test.tsx`.
- **Kiểm thử Route Navigation:** 29/29 bài kiểm thử Jest đạt (PASS) trong `mobile/tests/integration/routes.test.tsx` và `resultRoutes.test.tsx`.
- **TypeScript strict & ESLint:** 0 lỗi, 0 cảnh báo.
- **Android JS Bundle:** Biên dịch thành công 1,555 module, xuất `dist/android` hoàn chỉnh.
- **Kiểm tra trên thiết bị vật lý (Physical Device):** Ghi nhận `Not run` chờ chủ dự án Trí (`ThanhTris`) mở Expo Go trực tiếp kiểm tra và nghiệm thu visual theo quy trình DoD.
