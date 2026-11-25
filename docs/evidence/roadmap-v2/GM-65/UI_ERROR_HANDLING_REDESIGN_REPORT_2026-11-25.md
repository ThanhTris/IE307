# Báo cáo Tái thiết kế UI/UX Xử lý Lỗi, Thông báo Nổi/Ẩn & Điều hướng — GM-65 (PR #221)

- **Ngày lập báo cáo:** `2026-11-25`
- **PR liên quan:** `#221` (`feat/gm-65-error-recovery` → `main`)
- **Commit nền trước đợt tái thiết kế:** `d83d5af69ed3c6618e7fccb26069aa4c1d75d564` (`feat(GM-65): error recovery routing, in-app error reports and lobby failure exits (WIP)`)
- **Mục đích tài liệu:** Tổng hợp trọn vẹn bối cảnh, các quyết định thiết kế đã chốt cùng chủ dự án trong quá trình làm việc, cơ chế kỹ thuật xử lý thông báo nổi/tự ẩn/đóng, bản đồ 61 file đã sửa, kết quả kiểm thử tự động & kiểm thử thực tế trên Android Emulator (`emulator-5554`), các lỗi thật mới phát hiện và checklist bàn giao để AI hoặc lập trình viên kế tiếp đọc là nắm rõ ngay toàn bộ trạng thái hiện tại.

---

## 1. Tóm tắt bối cảnh & chuỗi quyết định thiết kế

### 1.1. Vấn đề ở bản PR #221 ban đầu (`d83d5af6`)
1. **Rối mắt do nút `"Báo lỗi"` xuất hiện dày đặc:** Nhiều màn hình đặt nút/liên kết báo lỗi lộ thiên ngay cả khi lỗi mạng thoáng qua lần đầu hoặc khi phòng kết thúc bình thường.
2. **Xô lệch bố cục (`layout shift`) khi báo lỗi:** Một số thông báo lỗi/thoát phòng (điển hình là `FailureNotice` trên `HomeScreen`, banner ngoại tuyến trên `HistoryScreen`, lỗi link trên `JoinRoomScreen`, lỗi validation trên `AccountAccessScreen`, footer `<HelpLink>` trên `GuestEntryScreen`/`LobbyScreen`/`FinalRoundScreen`) được render inline trong luồng tài liệu, làm đẩy toàn bộ nội dung chính (như tiêu đề `"Hôm nay cả nhóm ăn gì?"`) tụt xuống.
3. **Kẽ hở điều hướng & copy kỹ thuật:** Một số màn hình vẫn để lọt mã lỗi kỹ thuật thô, dùng nền modal cứng `#f5f5f5` gãy Dark Mode, hiển thị sai màn `"Phiên khách đã hết hạn"` cho tài khoản email, hoặc báo giả `"Liên kết bị chặn"` với URL khởi chạy vô hại (`exp://...`, `gi-cung-duoc:///`).

### 1.2. Các quyết định đã chốt cùng chủ dự án
1. **Kiến trúc hiển thị lỗi 5 tầng thống nhất:**
   - **Tầng 1 — Lỗi nhập liệu tại trường (`FormField` / `RoomCodeField`):** Viền đỏ, icon cảnh báo và thông báo ngay dưới ô nhập liệu; **không** bắn Toast trùng lặp.
   - **Tầng 2 — Thông báo nổi (`Toast` / `ToastNotice`):** Dùng cho lỗi mạng/API, thao tác tạo/thêm/sửa/xóa, trạng thái ngoại tuyến/dữ liệu cũ. Nổi ở lớp phủ trên cùng (`0px` đẩy bố cục).
   - **Tầng 3 — Thông báo khi bị điều hướng thoát màn (`FailureNotice`):** Khi phòng đóng/hết hạn/mất quyền hoặc lệch phiên bản hợp đồng và app đưa người dùng về Trang chủ hoặc Đăng nhập, `FailureNotice` đẩy thông báo lên hệ thống `Toast` nổi (`0px` đẩy bố cục) thay vì vẽ banner inline.
   - **Tầng 4 — Trạng thái lỗi màn hình trống thân thiện (`ErrorRecovery variant="empty"`, `JoinEntryProblem`, `ResultReadNotice`, `StatusNotice`, `RequireActiveSession`, `GuestSessionExpiredScreen`):** Chỉ dùng khi toàn bộ màn hình chưa có dữ liệu ban đầu để không bị trắng trang sau khi Toast tự ẩn.
   - **Tầng 5 — Ngôi nhà cố định cho Trợ giúp & Báo lỗi (`ProfileSettings` + `ReportErrorSheet`):** Gỡ nút `"Báo lỗi"` rời khỏi `ProfileScreen.tsx` và gom thành 1 dòng `"Trợ giúp & Báo lỗi"` trong mục **Cài đặt** của tab **Cá nhân**, kèm công tắc **"Đính kèm sự cố vừa gặp"** (lấy từ bộ nhớ RAM trong 30 phút qua `recordLastFailure`).
2. **Quy tắc chống rối mắt (`shouldOfferHelp` trong `mobile/src/shared/errors/describeError.ts`):**
   - **Không** đặt icon `?` hay nút `"Báo lỗi"` trên `AppHeader` của các màn sản phẩm.
   - **Không** hiện `"Báo lỗi"` ở lần lỗi mạng/timeout/rate-limit/xung đột đầu tiên hoặc khi phòng kết thúc/hết hạn bình thường.
   - Chỉ hiển thị chip `"Báo lỗi"` (trong Toast) hoặc `<HelpLink>` (ở màn hình lỗi trống) khi:
     - Gặp lỗi cấu trúc/hợp đồng dữ liệu (`MALFORMED_RESPONSE`, `CONTRACT_MISMATCH`) — hiện **ngay lập tức**; hoặc
     - Gặp lỗi thuộc nhóm `reportable` thất bại liên tiếp **`≥ 2` lần** (`failureCount >= 2`).
3. **Quy tắc bắt buộc `0px` layout shift (chủ dự án yêu cầu trực tiếp):**
   - Mọi phần tử báo lỗi tức thời phải nổi ở lớp overlay cao hơn (`position: 'absolute'`, `zIndex: 1000`, `elevation: 1000`), tuyệt đối không chen vào bố cục làm đẩy nội dung trang xuống.

---

## 2. Cơ chế xử lý thông báo nổi, tự ẩn, đóng tay & lớp phủ Modal

Đây là phần cốt lõi giải quyết cả trải nghiệm chống đẩy giao diện lẫn quản lý vòng đời ẩn/hiện thông báo.

### 2.1. Kiến trúc lớp phủ nổi (`mobile/src/shared/ui/feedback/Toast.tsx`)
- **Định vị tuyệt đối, không chiếm chỗ (`0px` layout footprint):**
  - `ToastLayer` dùng `styles.host`: `position: 'absolute'`, `left: 0`, `right: 0`, `top: insets.top + spacing.sm`, `zIndex: 1000`, `elevation: 1000`, `pointerEvents="box-none"` (người dùng vẫn thao tác bình thường vào các phần tử bên dưới vùng trống).
  - Cả `ToastNotice` và `FailureNotice` khi phát hiện có `ToastProvider` (`const toast = useToast()`) đều gọi `toast.show(...)` trong `useEffect` và **`return null`** — hoàn toàn không tạo node layout trong màn hình gọi.
- **Hiển thị đúng trên Native `Modal` / `SheetDialog` (`ToastHost`):**
  - Vì `Modal` của React Native mở một cửa sổ native tách biệt nằm đè lên root view, `ToastProvider` duy trì stack `hosts` (`ROOT_HOST = 0` và các `<ToastHost />` được mount bên trong `SheetDialog`/modal).
  - Chỉ `host` trên cùng (`top = hosts.length ? hosts[hosts.length - 1] : ROOT_HOST`) được phép vẽ `ToastLayer`. Nhờ vậy Toast **không bao giờ bị vẽ đúp** và **luôn nổi phía trên modal đang mở**.

### 2.2. Bốn cơ chế ẩn / đóng thông báo (`ToastCard`)
1. **Tự động ẩn theo thời lượng (`duration`):**
   - `ToastProvider.show` tự tính `defaultDuration` nếu caller không truyền `duration`:
     - **`6000ms`** khi Toast có nút hành động (`actionLabel`, ví dụ `"Báo lỗi"`, `"Thử kết nối lại"`, `"Thử lại"`), giúp người dùng đủ thời gian đọc và bấm.
     - **`4500ms`** cho tone `error`, `warning`, hoặc `info` có kèm dòng mô tả `message`.
     - **`3000ms`** cho `success` hoặc `info` ngắn gọn một dòng.
   - `ToastCard` đặt `setTimeout(hide, item.duration)` trong `useEffect` và dọn `clearTimeout(timer)` khi unmount hoặc khi thẻ bị thay thế.
2. **Hiệu ứng xuất hiện & biến mất mượt (`Animated`):**
   - Khi xuất hiện: `Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 })`, trượt từ `translateY: -80` về `0` cùng `opacity: 0 → 1`.
   - Khi ẩn (`hide()`): `Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone(item.id))` — chờ hoàn tất animation 200ms rồi mới gỡ `item.id` khỏi state `items`.
3. **Vuốt lên để ẩn (`PanResponder`):**
   - Bắt cử chỉ vuốt dọc hướng lên trên (`gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx)`).
   - Kéo thẻ theo ngón tay lên trên (`drag.setValue(Math.min(0, gesture.dy))`).
   - Khi thả tay: nếu kéo quá `24px` lên trên hoặc vận tốc vuốt nhanh (`gesture.dy < -24 || gesture.vy < -0.5`) thì gọi `hide()`; ngược lại bật lò xo về `0`.
4. **Đóng chủ động bằng chạm hoặc nút `×`:**
   - Nút đóng `×` nhỏ gọn góc phải (`accessibilityLabel="Đóng thông báo"`, `hitSlop={8}`, `width: 28, height: 28`): gọi `event.stopPropagation?.(); hide()`.
   - Bấm chip hành động (`actionLabel`): gọi `event.stopPropagation?.(); item.onAction?.(); hide()`.
   - Chạm vào thân thẻ Toast: gọi `item.onPress?.(); hide()`.

### 2.3. Chống xếp chồng lặp, nâng cấp tại chỗ & hàng đợi
- **Thay thế tại chỗ (`in-place replacement`):** Trong `ToastProvider.show`, nếu đang có Toast trùng cả `title` và `message`, item mới (`id: ++nextId`) sẽ **thay thế đúng vị trí item cũ** (`current.map(...)`) thay vì đẩy thêm một thẻ trùng. Cơ chế này cho phép lần thử lại thất bại thứ 2 nâng cấp trực tiếp Toast hiện tại để gắn thêm chip `"Báo lỗi"` và làm mới bộ đếm tự ẩn mà không bị chồng 2 Toast giống hệt nhau.
- **Kích hoạt lại bằng `triggerKey` & ổn định callback bằng `onActionRef`:** `ToastNotice` nhận `triggerKey?: string | number` (như `failureCount`, `submitRetryCount`) đưa vào dependency array của `useEffect` để bắn/nâng cấp lại Toast khi cùng một lỗi lặp lại; đồng thời lưu `onAction` trong `useRef` để tránh re-trigger Toast mỗi khi parent re-render tạo closure mới.
- **Giới hạn hàng đợi tối đa 3 Toast:** Nếu có nhiều thông báo khác nhau liên tiếp, chỉ giữ tối đa 3 thẻ mới nhất (`[...current.slice(-2), item]`).

### 2.4. Vòng đời sự cố 1 lần (`FailureNotice`), ghi nhớ 30 phút (`recordLastFailure`) & Fallback cho test
- **Hiển thị 1 lần rồi tự xóa (`mobile/src/shared/ui/feedback/FailureNotice.tsx` & `mobile/src/shared/errors/incident.ts`):**
  - Khi một màn bị thoát do lỗi (qua `leaveAfterFailure`), sự cố được đặt vào store tạm bằng `setIncident(...)`.
  - Khi màn đích (`HomeScreen` hoặc `AccountFormFrame`) mount, `FailureNotice` đọc `useIncident(destination)`, đẩy ngay vào `toast.show(...)` (kèm chip `"Báo lỗi"` nếu `incident.report && help`) và gọi `clearIncident()` ngay lập tức để thông báo không hiện lặp lại khi người dùng chuyển tab qua lại.
- **Ghi nhớ sự cố gần nhất trong RAM (`recordLastFailure`):**
  - Các lỗi `reportable` được ghi tạm trong bộ nhớ RAM (TTL 30 phút, không lưu xuống đĩa và không chứa mã phòng/địa chỉ cá nhân). Khi người dùng chủ động vào `Cá nhân → Cài đặt → Trợ giúp & Báo lỗi`, `ReportErrorSheet` hiện công tắc **"Đính kèm sự cố vừa gặp"** để gửi kèm bối cảnh kỹ thuật.
- **Fallback inline cho test cô lập:**
  - Nếu một component test render màn hình trực tiếp mà không bọc `<ToastProvider>` (`useToast() === null`), cả `ToastNotice` và `FailureNotice` tự fallback sang render `<View accessibilityRole="alert">` nội tuyến (gồm đầy đủ `title`, `message` và nút `actionLabel` nếu có) nên không làm hỏng các bài test component cô lập.
- **Phân tách theo ADR-026:** `Toast` chỉ xử lý lỗi API, thao tác tạo/thêm/sửa/xóa và trạng thái điều hướng cục bộ; sự kiện do người khác tạo ra (lời mời kết bạn, rủ ăn, kết quả phòng) vẫn giữ ở `NotificationBanner` riêng.
- **Bảng màu 4 tone (Light & Dark):**
  - **Light (`toastPalette`):** `success` (`#ECFDF3`/`#BBF7D0`), `error` (`#FEF2F2`/`#FECACA`), `warning` (`#FFFBEB`/`#FDE68A`), `info` (`#EEF7F0`/`#B9DFC3`).
  - **Dark (`darkToastPalette`):** `success` (`#14291D`/`#1E462D`), `error` (`#2D1619`/`#542429`), `warning` (`#2B2111`/`#4F3B19`), `info` (`#16271E`/`#284936`).

---

## 3. Bản đồ toàn bộ 61 file đã chỉnh sửa

### 3.1. Shared Error & Feedback Layer (8 file)
- `mobile/src/shared/ui/feedback/Toast.tsx`: Thêm tone `info`, bảng màu Light/Dark, nút đóng `×`, `actionAccessibilityLabel`, `triggerKey`, `onActionRef`, thay thế tại chỗ khi trùng nội dung, fallback nút hành động khi không có `ToastProvider`.
- `mobile/src/shared/ui/feedback/FailureNotice.tsx`: Chuyển từ thẻ inline `failure-callout` sang đẩy sự cố vào `ToastProvider` + `clearIncident()`, trả `null` (`0px` layout shift).
- `mobile/src/shared/ui/feedback/ErrorRecovery.tsx`: Ở `variant="inline"`, chuyển `onHelp` từ footer inline `<HelpLink>` thành chip `"Báo lỗi"` ngay trong `<ToastNotice>`.
- `mobile/src/shared/ui/feedback/StatusNotice.tsx`: Chuẩn hóa hiển thị lỗi có/không có nút hành động cùng `ToastNotice`.
- `mobile/src/shared/ui/forms/FormField.tsx`: Bổ sung viền đỏ `1.5px`, icon cảnh báo và thông báo lỗi gọn ngay dưới ô nhập liệu.
- `mobile/src/shared/errors/describeError.ts`: Định nghĩa đủ 40 `ErrorCode` với bản sao tiếng Việt dễ hiểu, loại bỏ mã lỗi thô, thêm helper `shouldOfferHelp(code, failureCount)`.
- `mobile/src/shared/errors/failure.ts`: Chuẩn hóa `destinationFor`, `incidentFor`, phân loại `tone` (`info` cho phòng đóng/hết hạn bình thường, `warning` cho `AUTH_REQUIRED`, `error` + `report` cho lỗi bất thường như `ROOM_NOT_FOUND`/`CONTRACT_MISMATCH`).
- `mobile/src/shared/errors/incident.ts`: Bổ sung `recordLastFailure` / `getLastFailure` trong RAM (TTL 30 phút) để nối với `ReportErrorSheet`.

### 3.2. App Routes & Điều hướng an toàn (10 file)
- `mobile/src/app/friends.tsx`, `mobile/src/app/history.tsx`, `mobile/src/app/inbox.tsx`, `mobile/src/app/profile.tsx`: Truyền `onSignIn` / xử lý `AUTH_REQUIRED` sạch cho `RequireActiveSession` và các màn xã hội.
- `mobile/src/app/room/join.tsx`: Xử lý `linkError`, `onClearLinkError`, điều hướng `onExit` qua `leaveAfterFailure`.
- `mobile/src/app/room/setup.tsx`, `mobile/src/app/room/vote.tsx`, `mobile/src/app/room/final-round.tsx`, `mobile/src/app/room/result.tsx`, `mobile/src/app/room/no-consensus.tsx`: Chuyển `R1 → R2` bằng `router.replace` để Back Android không quay ngược Vòng 1; nối `onExit` về Trang chủ/Đăng nhập khi phòng đóng hoặc mất quyền.

### 3.3. Auth, Home & Guest Entry (6 file)
- `mobile/src/features/auth/components/RequireActiveSession.tsx`: Không hiện màn `"Phiên khách đã hết hạn"` cho tài khoản email (`isGuest === false`); hiện nút `"Đăng nhập lại"` rõ ràng; bỏ từ ngữ kỹ thuật (`"phiên cục bộ"`, `"ngắt danh tính"`).
- `mobile/src/features/home/screens/GuestEntryScreen.tsx`: Bỏ `<HelpLink>` inline trong thẻ trắng; đưa chip `"Báo lỗi"` tăng dần + `triggerKey={failureCount}` vào `failureToast`.
- `mobile/src/features/home/screens/GuestSessionExpiredScreen.tsx`: Chuẩn hóa copy và Toast lỗi khi xóa phiên cũ.
- `mobile/src/features/home/screens/HomeScreen.tsx`: Chuyển toàn bộ `sessionNotice` lỗi/cảnh báo, `room.error` và trạng thái phòng hết hạn/kết thúc sang `<ToastNotice>` nổi (`0px` shift).
- `mobile/src/features/home/screens/ContinueSessionScreen.tsx`: Chuẩn hóa thông điệp kiểm tra/tiếp tục phòng.
- `mobile/src/features/rooms/components/ReturnToRoomCard.tsx`: Chuyển trạng thái `error` từ `<StatusNotice>` inline sang `<ToastNotice>` nổi dùng `describeError`.

### 3.4. Rooms, Setup & Lobby (8 file)
- `mobile/src/features/rooms/services/joinLinks.ts`: Bỏ qua URL khởi chạy vô hại (`exp://...`, `gi-cung-duoc:///`) để không báo giả `"Liên kết bị chặn"`, vẫn chặn URL chứa payload đáng ngờ.
- `mobile/src/features/rooms/components/RoomCodeField.tsx` & `JoinEntryProblem.tsx`: Chuẩn hóa lỗi inline dưới ô 6 ký tự và trạng thái màn hình trống thân thiện có ngưỡng `"Báo lỗi & trợ giúp"`.
- `mobile/src/features/rooms/screens/JoinRoomScreen.tsx`: Chuyển `linkError` (`"Liên kết bị chặn"`) sang `<ToastNotice tone="warning" />` nổi; tự xóa lỗi link khi người dùng nhập mã mới.
- `mobile/src/features/context/hooks/useDishSetupFlow.ts` & `DishSetupFlow.tsx`: Tự thoát về Trang chủ khi phòng đóng bên ngoài; chuẩn hóa thông báo lỗi qua `describeError`.
- `mobile/src/features/rooms/hooks/useLobby.ts` & `LobbyScreen.tsx`: Gỡ `<HelpLink>` inline; gắn `triggerKey={lobby.actionFailureCount}` và chip `"Báo lỗi"` tăng dần vào `<ToastNotice>`; dùng `ErrorRecovery variant="empty"` khi tải phòng chờ thất bại.

### 3.5. Voting (Vòng 1 & Vòng 2) (5 file)
- `mobile/src/features/voting/hooks/useRoundOneVoting.ts` & `useRoundTwoVoting.ts`: Tự thoát khi phòng kết thúc/hết hạn/mất quyền; giữ nguyên `localPool`/`localCandidates` khi lỗi mạng nền; đếm `snapshotRetryCount` và `submitRetryCount`.
- `mobile/src/features/voting/components/FlashcardRoundView.tsx`: Chuẩn hóa thẻ thử lại khi gửi phiếu thất bại.
- `mobile/src/features/voting/screens/VoteScreen.tsx` & `FinalRoundScreen.tsx`: Thêm hộp thoại xác nhận rời màn bình chọn khi bấm Back; bỏ mã lỗi thô (`${code}`, `UNSET`, `ALL_REMOVED`) và nền modal `#f5f5f5` gãy Dark Mode; trên `FinalRoundScreen` gỡ `helpFooter` inline và đưa chip `"Báo lỗi"` tăng dần + `triggerKey={submitRetryCount}` vào `<ToastNotice>`.

### 3.6. Result & Nearby Places (5 file)
- `mobile/src/features/result/screens/DishResultEntry.tsx`, `DishResultFlow.tsx`, `LiveDishResultScreen.tsx`: Nối `onExit` khi phòng không còn, truyền `errorCode` và `retryCount` xuống `ResultReadNotice`.
- `mobile/src/features/result/components/ResultReadNotice.tsx`: Dùng `ErrorRecovery variant="empty"` kèm ngưỡng `"Báo lỗi & trợ giúp"`.
- `mobile/src/features/result/components/NearbyPlacesSection.tsx`: Hiển thị callout gọn cho trạng thái quyền vị trí bị từ chối/chặn và Toast nổi cho lỗi tải quán/ngoại tuyến.

### 3.7. Friends, Inbox, History, Account & Support (9 file)
- `mobile/src/features/friends/screens/FriendsScreen.tsx`: Xử lý `AUTH_REQUIRED`, thống nhất thông báo qua `describeError`, ghi `recordLastFailure`.
- `mobile/src/features/inbox/screens/InboxScreen.tsx`: Bỏ cụm kỹ thuật `metadata.invitationId` và hậu tố `(${key})`; vào thẳng `/room/lobby` khi `acceptRoom` đã thành công nhưng `resolveAcceptedRoom` lỗi mạng tạm thời.
- `mobile/src/features/history/screens/HistoryScreen.tsx`: Chuyển `stale && fetchedAt` (`"Đang ngoại tuyến"`) từ `offlineBanner` inline sang `<ToastNotice tone="warning" actionLabel="Thử lại" />` nổi (`0px` shift).
- `mobile/src/features/account/screens/AccountAccessScreen.tsx`: Chuyển lỗi `validation` từ khung đỏ inline phía trên các ô nhập sang `<ToastNotice title={validation} tone="error" />` nổi.
- `mobile/src/features/account/screens/ProfileScreen.tsx` & `ProfileSettings.tsx`: Gỡ nút `"Báo lỗi"` rời khỏi `ProfileScreen`, đưa thành 1 dòng `"Trợ giúp & Báo lỗi"` trong thẻ **Cài đặt** của `ProfileSettings`.
- `mobile/src/features/support/HelpProvider.tsx`, `HelpTopics.tsx`, `ReportErrorSheet.tsx`: Hỗ trợ đính kèm sự cố vừa gặp (`recentFailure` từ `recordLastFailure`), hiển thị mã ticket thật `GCD-...` sau khi gửi.

### 3.8. Unit & Component Tests (10 file)
- `mobile/tests/component/feedbackRules.test.tsx`, `dishSetupFlow.test.tsx`, `guestEntryScreen.test.tsx`, `joinRoomEntry.test.tsx`, `liveRoomLifecycle.test.tsx`, `profileScreen.test.tsx`, `votingSnapshotLifecycle.test.tsx`.
- `mobile/tests/unit/describeError.test.ts`, `failureRules.test.ts`, `joinLinks.test.ts`.

---

## 4. Kết quả kiểm thử tự động & kiểm thử thực tế trên Android Emulator

### 4.1. Kiểm tra tự động (đã chạy lại sau chỉnh sửa cuối cùng — tất cả đạt)
| Lệnh kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm run typecheck` (trong `mobile/`) | Thoát `0` | Không lỗi TypeScript |
| `npm run lint` (trong `mobile/`) | Thoát `0` | `0` errors, `0` warnings |
| `npm run check:architecture` (trong `mobile/`) | Thoát `0` | Ranh giới kiến trúc hợp lệ |
| `npx jest --runInBand` (trong `mobile/`) | Thoát `0` | **103/104 suites passed, 1576/1577 tests passed, 0 failed** (`1` suite live test `gm32OutboxLive.test.ts` skip sẵn khi `GM32_OUTBOX_LIVE !== '1'`) |
| `python scripts/validate_repository.py` | Thoát `0` | Tài liệu, liên kết, JSON, manifest hợp lệ |
| `python scripts/task_readiness.py --check-docs` | Thoát `0` | Chỉ mục task khớp metadata |

### 4.2. Kiểm thử trực quan trên Android Emulator (`emulator-5554` + QA Supabase local + HTTP Fault Proxy)
- **Đợt 1 — Xác minh đủ 5 tầng lỗi, `0px` shift & Dark Mode (8 ảnh đã kiểm mắt trực tiếp):**
  1. `ui_01_inline_field_error.png`: Lỗi nhập liệu tại `FormField` (viền đỏ + icon cảnh báo, không bắn Toast trùng).
  2. `ui_02_toast_first_retry_clean.png`: Lỗi `503` lần đầu trên `GuestEntryScreen` — Toast nổi sạch, chưa có `"Báo lỗi"`.
  3. `ui_03_progressive_help_pill.png`: Lỗi `503` liên tiếp lần 2 trên `GuestEntryScreen` — Toast nổi tự nâng cấp tại chỗ gắn chip `"Báo lỗi"` + nút `×`, thẻ trắng bên dưới giữ nguyên chiều cao (`0px` shift).
  4. `ui_04_home_callout_banner.png`: `FailureNotice` (`NOT_IN_ROOM` / `"Bạn không còn trong phòng này"`) nổi trên phần đầu `HomeScreen` kèm nút `×`; kiểm tra `uiautomator` xác nhận `"Hôm nay cả nhóm ăn gì?"` giữ nguyên tọa độ mặc định `[63,263][1017,495]` (**`0px` layout shift**).
  5. `ui_05_empty_error_state.png`: `JoinEntryProblem` màn hình lỗi trống thân thiện có mã phòng và nút `"Thử lại"`.
  6. `ui_06_profile_settings_entry.png`, `ui_07_report_sheet_and_ticket.png`, `ui_07b_report_ticket_sent.png`: Dòng `"Trợ giúp & Báo lỗi"` trong `ProfileSettings`, `ReportErrorSheet` có công tắc `"Đính kèm sự cố vừa gặp"` và gửi báo lỗi thật về Supabase nhận mã `GCD-...`.
  7. `ui_08_dark_mode_toast_and_banner.png`: Dark Mode Toast nổi (`#2D1619`/`#542429`) kèm nút `×` phủ lên màn `Tạo phòng` không đẩy nút chọn bên dưới.
- **Đợt 2 — Quét mở rộng theo ma trận 40 mã lỗi × 30 bề mặt (dùng `fault_proxy.mjs` hỗ trợ `code:<ERROR_CODE>`):**
  - **Guest Entry (`guest_00..05`):** đã chạy `503` lần 1, `503` lần 2 (lên chip `"Báo lỗi"`), `malformed` (lên ngay chip `"Báo lỗi"`), `close` (đứt kết nối), và `401`.
  - **Join Room (`join_01..14`, gọi qua `exp://127.0.0.1:8081/--/room/join?code=...`):** đã chạy `ROOM_NOT_FOUND`, `ROOM_EXPIRED`, `ROOM_TERMINAL`, `ROOM_FULL`, `ROOM_LOCKED`, `RATE_LIMITED`, `TIMEOUT`, `malformed`, `503`, `CONTRACT_MISMATCH`, `UNKNOWN_ERROR`, `INVALID_INPUT`, `AUTH_REQUIRED` (tự chuyển về `RequireActiveSession`).
  - **Session (`session_01..04`):** đã chụp `RequireActiveSession` (`session-recovery-required`, `session-revoked`) và `GuestSessionExpiredScreen`.
  - **Home (`home_00..01`):** đã chụp Trang chủ sạch và lỗi tra cứu phòng `503`.

---

## 5. Các lỗi thật mới phát hiện & Checklist bàn giao cho AI / lập trình viên tiếp theo

> [!NOTE]
> Các mục dưới đây được phát hiện trong đợt rà mã và quét lỗi mở rộng cuối cuộc hội thoại, **chưa sửa trong commit này** để chốt báo cáo và đẩy lên PR #221 theo yêu cầu của chủ dự án. AI/dev kế tiếp có thể xử lý lần lượt theo đúng thứ tự này:

### 5.1. Hai lỗi logic/copy phát hiện từ ảnh chụp đợt 2
1. **Copy `401` gây hiểu nhầm ở màn đăng ký khách (`GuestEntryScreen`):**
   - **Hiện tượng:** Khi `POST /auth/v1/signup` tạo phiên khách nhận HTTP `401` (`guest_05_401.png`), Toast hiển thị `"Phiên đăng nhập đã hết hạn — Đăng nhập lại để tiếp tục."` trong khi người dùng chưa hề có phiên.
   - **Hướng sửa:** Phân nhánh thông điệp riêng khi `AUTH_REQUIRED` xảy ra trong luồng tạo phiên khách mới (ví dụ `"Chưa tạo được phiên khách — Hãy thử lại."`).
2. **`previewJoin` map phản hồi `malformed` thành `ROOM_NOT_FOUND`:**
   - **Hiện tượng:** Khi `dish_session` (`previewJoin`) trả JSON hỏng (`{ broken: true }`), `join_08_malformed.png` báo inline `"Kiểm tra lại mã mời hoặc xin mã mới."` như thể người dùng gõ sai mã phòng, thay vì `MALFORMED_RESPONSE` (làm mất màn hình lỗi kèm `"Báo lỗi & trợ giúp"`).
   - **Vị trí cần kiểm tra:** `mobile/src/features/rooms/services/roomRepository.ts` hàm `previewJoin` (dòng `raw && !raw.ok` fallback `ROOM_NOT_FOUND` khi `raw.ok` là `undefined`).
   - **Hướng sửa:** Chỉ vào nhánh lỗi nghiệp vụ khi `raw.ok === false`; nếu `raw.ok !== true && raw.ok !== false` thì trả `MALFORMED_RESPONSE`.

### 5.2. Ba vị trí inline notice/help nhỏ còn sót từ lần quét toàn repo
1. `mobile/src/features/context/components/ScheduleSheet.tsx:37`: `{error ? <StatusNotice title={error} colors={colors} /> : null}` → đổi sang `<ToastNotice title={error} tone="warning" />` (`SheetDialog` đã có sẵn `<ToastHost />` nên sẽ nổi trên modal mà không đẩy vòng quay giờ/phút; vẫn giữ đúng text cho `dishSchedule.test.tsx`).
2. `mobile/src/features/context/screens/DishSetupScreen.tsx:28`: `{invalid ? <StatusNotice title={invalid} colors={colors} /> : null}` → đổi sang `<ToastNotice title={invalid} tone="warning" />` để không đẩy `"Buổi ăn *"` xuống.
3. `mobile/src/features/voting/screens/VoteScreen.tsx:217,227` & `mobile/src/features/voting/components/FlashcardRoundView.tsx:54`:
   - `VoteScreen` đã có sẵn `submitFailureCode` và `submitRetryCount` từ `useRoundOneVoting` nhưng chưa truyền `triggerKey` + chip `"Báo lỗi"` vào `<ToastNotice title="Chưa gửi được phiếu" ... />` như `FinalRoundScreen`.
   - Nên đồng bộ với `FinalRoundScreen` và gỡ `<HelpLink>` inline trong thẻ retry của `FlashcardRoundView` để tránh giãn chiều cao thẻ khi retry lần 2.

### 5.3. Các màn hình cần chụp bổ sung nếu muốn phủ đủ 100% ma trận 30 bề mặt
- `DishSetupScreen` / `ScheduleSheet` / `DishPreferencesScreen` (lưu ý: ở đợt 2, `setup_01..09` chưa tiêu thụ fault vì lệnh `Open-Url ""` trước đó chưa thoát khỏi `room/join`; nên mở thẳng `exp://127.0.0.1:8081/--/room/create` hoặc điều hướng từ Trang chủ đã xác nhận).
- `LobbyScreen` (load lỗi lần 2, `NOT_ENOUGH_MEMBERS`, `MEMBERS_NOT_READY`, `INSUFFICIENT_DISHES`, modal mời bạn bè lỗi `503`).
- `VoteScreen` & `FinalRoundScreen` (load lỗi, submit lỗi retry #2, giới hạn loại 30%, dialog xác nhận rời phòng; có thể kết hợp `/dev/round-two` và phòng thật).
- `LiveDishResultScreen`, `NoConsensus`, `NearbyPlacesSection` (có thể mở nhanh qua `/dev/result` để chụp đủ 10 trạng thái `NearbyStatus` + `EMPTY_INTERSECTION` + `ALL_REMOVED` + `error`).
- `FriendsScreen`, `InboxScreen`, `HistoryScreen` (đăng nhập tài khoản email trên QA local để mở khóa 3 tab), `AccountAccessScreen`, `AccountEditScreen`, `PushSettingsScreen`, `+not-found`.

### 5.4. Kinh nghiệm vận hành QA & Emulator cho AI kế tiếp
- Chạy QA backend cô lập bằng `npm run qa:start -- --run-id <id> --api-port <port1> --db-port <port2>` (không đụng các container QA khác đang chạy trên máy, ví dụ cổng `54591` / `gm03qa-gm65-1125-1408`); nhớ `npm run qa:stop -- --run-id <id>` khi xong.
- Truyền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` qua biến môi trường shell của phiên chạy Metro — **không** tạo file `.env` tạm trong workspace.
- Khi chụp Toast tự ẩn (`3s`–`6s`), **luôn gọi `adb exec-out screencap -p` trước `uiautomator dump`** (vì `uiautomator dump` mất ~1–2 giây và dễ làm lỡ cửa sổ hiển thị của Toast).
- Khi dùng `uiautomator dump /sdcard/ui.xml`, xóa `/sdcard/ui.xml` trước mỗi lần dump để tránh đọc nhầm file XML cũ nếu `UiTestAutomationBridge` báo `null root node`.
