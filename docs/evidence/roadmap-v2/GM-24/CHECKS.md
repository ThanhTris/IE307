# GM-24 checks

## Revision follow-up — PR #119 / working tree after `8e8aac2`

- Fixed the four post-form-extraction regressions: preview confirmation is bound to the exact draft context, invalidated preview requests clear busy state, GM-10/GM-24 budget fields render the raw input string, and GM-24 date/time fields retain incomplete keyboard input until it parses.
- Every draft edit now invalidates preview/confirmation and request generations. Late success, error, rejection, and finally handlers cannot restore an older preview or stop a newer request. Retry preserves the selected target, while an explicit Eat Now action is the only operation that applies the server-time +15 minute buffer.
- Native scenario discovery/retry does not request GPS automatically; foreground location is requested only from the explicit suggestion action. Live preview uses the GM-18 discovery adapter; Mock retains its deterministic fixture path.
- Added intended-behaviour regressions for time changes, concurrent preview responses, raw keyboard input, and GM-10 budget display. Current mobile suite: 21 suites, 616 tests; Expo export and repository/Python checks pass. Android device, native rebuild/manifest, and deployed backend remain `Not run`.
- Merge readiness was rerun against `origin/main=daa917461e68353f6ba015f2f746e805ec19710e`: `BLOCKED_ON_BASE` because the shared `ContextScreen.tsx` artifact differs from the GM-10 Project artifact. `main` is an ancestor of the working HEAD; no checker bypass or status change was made.

## Review follow-up — PR #119 / post-`321d1b2`

- Live configuration no longer defaults to an emulator or LAN URL. Only HTTPS origins or HTTP loopback (`127.0.0.1`, `localhost`, `[::1]`) are accepted; missing, malformed, or unsafe values fail before a request. USB development uses `adb reverse tcp:54321 tcp:54321` with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`; cleanup is `adb reverse --remove tcp:54321`.
- `ContextDraftFields` is rendered by both GM-10 `ContextScreen` and GM-24 `Gm24ContextScreen`. GM-24 owns only draft/discovery/preview/receipt state and never calls room lifecycle writes. Preview and confirmation re-check server time, clear dependent state when an Eat Now target expires, and ignore late preview responses after edits/session changes.
- `LocationService` defaults through `createDefaultLocationAdapter()` and the singleton uses the same platform composition. Native location no longer probes `globalThis` or silently falls back to a web adapter.
- New regression coverage includes preview confirmation, expiry after opening the form, and default platform composition. Physical Android, native rebuild/manifest, and deployed backend discovery/preview remain `Not run`.

## Merge follow-up — PR #119 / 2026-10-16

- Main received: `daa917461e68353f6ba015f2f746e805ec19710e` (fetched `origin/main`).
- Merge commit: `ad78d98` (`origin/main` is an ancestor of HEAD); PR base was `e958e56`.
- Conflicts were resolved by retaining the GM-10 `ContextScreen` and route, while the GM-24 harness now lives in `Gm24ContextScreen` and `/gm24/context`.
- Live mode now composes `createAuthenticatedApiClient` (GM-16), restores a stored guest session, requires an explicit guest action when no session exists, and clears anchors/selection on auth, empty, malformed, timeout, or network failures. Responses from an invalidated load generation are ignored.
- Android foreground location uses `expo-location ~57.0.21` through the injected `NativeLocationProvider`; `blockedPermissions` no longer blocks foreground location. Background tracking and raw GPS payloads remain out of scope.
- Eat Now is `serverTime + 15 minutes`; scheduled time does not add a second buffer.

### Verification on merged revision

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Pass |
| Expo baseline / compatibility | Pass (`npm run test:expo-baseline`, `npm run check:expo`) |
| Mobile Jest | Pass — 21 suites, 612 tests |
| GM-24 focused component regression | Pass — 17 tests, including preview confirmation, expiry re-check, and mock anchor cleared after Live `AUTH_REQUIRED` |
| Android bundle | Pass — `npm run bundle:android`, exported `mobile/dist/android` |
| Repository validator | Pass |
| Python regression | Pass — 550 tests, 6 skipped |
| Task indexes | Pass — `python scripts/task_readiness.py --check-docs` |
| Merge gate | `READY_FOR_MERGE_REVIEW`; main ancestor verified |

Device Android, Expo Go permission prompts, and backend discovery/preview against a deployed Supabase instance remain **Not run**. The bundle is JavaScript export evidence only; a native rebuild is required to verify the updated location manifest.

- Task/contract: GM-24 / `food-v1/roadmap-v2/GM-24.1`
- Owner: Trang (@rosy179)
- Reviewer: Trí (@ThanhTris)
- Base revision: `daa9174` (origin/main at merge)
- Upstream dependencies & provenance:
  - GM-05 (Shared UI Components & Theme tokens): `mobile/src/shared/theme/tokens.ts`
  - GM-07 (API Client Contracts & Mock): `mobile/src/data/api/contracts.ts`
  - GM-16 (Session & Auth): `mobile/src/data/auth/session.ts`
  - GM-18 (Discovery Context & Preview): `mobile/src/data/discovery/index.ts`
- Target deliverables:
  - `mobile/src/features/context/services/location.ts`
  - `mobile/src/features/context/screens/Gm24ContextScreen.tsx`
  - `mobile/src/features/context/components/ContextDraftFields.tsx`
  - `mobile/src/features/context/index.ts`
  - `mobile/src/app/gm24/context.tsx`
  - `mobile/tests/unit/locationService.test.ts`
  - `mobile/tests/component/contextScreen.test.tsx`
  - `mobile/tests/integration/routes.test.tsx`
- Schema/dataset: Pure client location adapter and discovery contract integration; no DB tables created directly in GM-24.
- Environment: Windows, Node v22.11.0, npm 11.3.0, Expo SDK 57, React Native 0.86.3.

| Case / AC | Command or route | Input and expected | Actual / assertion | Result |
| --- | --- | --- | --- | --- |
| 1. Tính khoảng cách Haversine & tìm điểm hẹn công cộng gần nhất | `cd mobile; npm test tests/unit/locationService.test.ts -t "calculateDistanceM"` | Tọa độ trùng trả về 0; khoảng cách giữa Hồ Con Rùa (10.7828, 106.6958) và Phố Đi Bộ (10.7743, 106.7034) nằm trong khoảng 1.100m – 1.400m; đầu vào không hợp lệ trả về NaN | 3 assertions passed: tính toán chính xác số mét đường chim bay | Pass (automated unit) |
| 2. Gợi ý điểm hẹn gần nhất & phát hiện ngoài vùng phủ sóng | `cd mobile; npm test tests/unit/locationService.test.ts -t "findNearestAnchor"` | Người dùng gần Hồ Con Rùa tự động gợi ý Hồ Con Rùa (~0m), `isOutsideCoverage: false`; tọa độ Hà Nội (~1.140 km) trả về `isOutsideCoverage: true`; danh sách rỗng xử lý an toàn | 7 assertions passed: xếp hạng theo khoảng cách tăng dần | Pass (automated unit) |
| 3. Ăn ngay (Eat Now): Lấy server now + 15 phút buffer một lần duy nhất | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx -t "Eat Now|Scheduled|expires"` | Cộng buffer 15 phút tại thao tác; không cộng lặp lại; preview/xác nhận sau khi target hết hạn bị khóa và xóa bản nháp | Service contract và component assertions pass; màn GM-24 hiển thị `Buffer 15p` | Pass (automated unit/component) |
| 4. Đặt giờ trước (Scheduled): Không cộng lại buffer, kiểm tra giờ quá khứ và ngưỡng 7 ngày | `cd mobile; npm test tests/unit/locationService.test.ts tests/component/contextScreen.test.tsx -t "Scheduled|expires"` | Giờ hợp lệ trong tương lai trả về `isValid: true`; giờ trong quá khứ trả về `isPast: true`, `DESIRED_TIME_PASSED`; giờ vượt quá 7 ngày trả về `isTooFarFuture: true`; điều chỉnh không cộng buffer lặp lại | Unit và component assertions pass, gồm clock re-check ở thao tác xác nhận | Pass (automated unit/component) |
| 5. Quyền riêng tư: Payload server chỉ chứa anchorId/radiusM/desiredAt; 0 GPS thô trong log/request | `cd mobile; npm test tests/unit/locationService.test.ts -t "Privacy Boundary"` | `sanitizeContextForServer` lọc sạch và chỉ giữ các trường bối cảnh phòng hợp lệ; cấm tuyệt đối tọa độ (`latitude`, `longitude`, `coords`, `rawGps`); `redactLocationFromLog` xóa đệ quy tọa độ thành `[REDACTED_GPS]` | 12 assertions passed: loại bỏ hoàn toàn khóa GPS thô | Pass (automated unit) |
| 6. Tách biệt rõ ràng Mock, Web và Native Location Adapters | `cd mobile; npm test tests/unit/locationService.test.ts -t "NativeLocationAdapter"` | `NativeLocationAdapter` sử dụng `PermissionsAndroid` trên Android native; ủy quyền provider vị trí foreground khi có; xử lý từ chối quyền, lỗi GPS và ném `NATIVE_GPS_UNAVAILABLE` khi không có bridge native; `WebLocationAdapter` kiểm tra `navigator.geolocation` trên web | 4 assertions passed: tách biệt rõ ràng web / mock / native foreground adapter | Pass (automated unit) |
| 7. Giao diện ContextScreen & Kịch bản: chặn giờ quá khứ, bảo toàn giờ đặt, xóa lỗi cũ khi hồi phục | `cd mobile; npm test tests/component/contextScreen.test.tsx` | Chặn lưu khi giờ ở quá khứ (`disabled={true}`), nút "Điều chỉnh thành giờ hợp lệ" hồi phục giờ tương lai và mở khóa nút lưu; xóa lỗi máy chủ cũ khi chuyển sang kịch bản thành công; giữ nguyên mốc giờ đã đặt khi tải lại | 17 component tests passed (100% scenarios covered) | Pass (component scope) |
| 8. Chế độ Máy chủ thật (Live Supabase API - GM-18 & GM-16) | `cd mobile; npm test tests/component/contextScreen.test.tsx -t "real API|401"` và `npm test tests/unit/authTransport.test.ts` | Không có session thì không tự signup; transport dùng `apikey`/Bearer sau restore hoặc nút guest rõ ràng; HTTPS/loopback được chấp nhận, LAN HTTP bị từ chối trước request; 401 xóa anchor mock và khóa lưu | Auth transport và component assertions pass; deployed backend not run | Pass (automated; deployed backend not run) |
| 9. Điều hướng Expo Router | `cd mobile; npm test tests/integration/routes.test.tsx` | Điều hướng từ App Shell qua nút `Mở vị trí và bối cảnh GM-24` đến route `/gm24/context`, render màn hình thành công và quay lại | 5 route tests passed: tích hợp router hoàn chỉnh | Pass (automated integration) |
| 10. TypeScript strict check | `cd mobile; npm run typecheck` | `tsc --noEmit` toàn bộ repo mobile | 0 errors | Pass |
| 11. ESLint check | `cd mobile; npm run lint` | ESLint trên toàn bộ mobile | 0 errors (4 pre-existing warnings từ contracts/index) | Pass |
| 12. Architecture boundary guard | `cd mobile; npm run check:architecture` | Kiểm tra giới hạn kiến trúc tĩnh | "Architecture boundaries OK" | Pass |
| 13. Android JS bundle export | `cd mobile; npm run bundle:android` | Xuất gói Android qua Metro bundler | Export thành công, `dist/android` tạo được | Pass (bundle only; not app launch) |
| 14. Thiết bị Android / Expo Go thực tế | Mở Expo Go trên Android, vào route `/gm24/context` | Kiểm tra thực tế trên điện thoại: xin quyền vị trí foreground, tính khoảng cách thực tế, chọn thủ công, chọn bán kính, đổi giờ ăn và kiểm tra panel audit bảo mật | Màn hình đã tích hợp sẵn Scenario Picker và native location adapter, sẵn sàng chạy trên Expo Go Android. Do chưa chạy trên thiết bị vật lý có ghi nhận log phần cứng, mục này ghi Not run theo quy định | Not run (chờ reviewer/chủ dự án kiểm tra thực tế trên thiết bị) |
| 15. Kiểm tra Repository và Task indexes | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs` | Kiểm tra tính toàn vẹn repository, link markdown và task index | Repository OK; task indexes match task metadata | Pass |

## Limits

Task GM-24 bàn giao service vị trí (`location.ts`), adapter định vị foreground, pure distance calculation, bộ phân giải server-time buffer và harness (`Gm24ContextScreen.tsx` tại route `/gm24/context`). GM-10 vẫn sở hữu `ContextScreen.tsx` của luồng room context.
- Tọa độ GPS thô được giữ cục bộ trên thiết bị và chỉ dùng để tìm điểm hẹn công cộng gần nhất. Server chỉ nhận `anchorId`, `radiusM`, `desiredAt`, `mealSlot`, `serviceMode`.
- Không sử dụng background tracking hoặc thu thập vị trí ngầm.
- Phục vụ bàn giao cho task GM-25 (nối ContextScreen với luồng tạo phòng và lobby) và GM-30 (nối bản đồ/bối cảnh phòng).
- Bằng chứng kiểm tra và artifact không tự thay đổi trạng thái Approval/Done.
