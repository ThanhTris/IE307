# Figma Parity — GM-54

- **Task ID**: `GM-54` — Cấu hình bản build Android, cổng phiên bản và Places
- **Issue**: [#190](https://github.com/ThanhTris/IE307/issues/190)
- **Reviewer**: Trí (`@ThanhTris`, ADR-013)
- **Spec nguồn**: [UI Final Handoff 2026-10-25](../../../design/UI_FINAL_HANDOFF_2026-10-25.md) · [UI Spec](../../../specs/UI_SPEC.md) · [UI Figma Task Map](../../../design/UI_FIGMA_TASK_MAP.json)

## 1. Độ phủ node Figma & giới hạn công cụ hiện tại

- **Assigned Figma node trong `UI_FIGMA_TASK_MAP.json`**: Không có (`UI_FIGMA_TASK_MAP.json` chốt ngày 2026-10-25 cho `GM-02..GM-39`; màn `"Cần cập nhật"` và Android Splash thuộc phạm vi `RELEASE_V1_SCOPE.md` mở sau ngày 2026-11-23).
- **Đối chiếu ảnh app trên AVD với frame Figma**: **Not run** trong sandbox hiện tại vì:
  1. Không có frame riêng trong Figma cho `"Cần cập nhật"` và Android adaptive icon/splash (`UI_FIGMA_TASK_MAP.json` chỉ có các node nền tảng dùng chung ở trang `01 · Màu sắc`, `02 · Components`, `03 · Màn hình`).
  2. Không có Figma MCP server trong workspace để xuất render PNG từ node tham chiếu.
  3. Máy local không có Android SDK / AVD (`%LOCALAPPDATA%\Android\Sdk` và `~/.android/avd` không tồn tại, thiếu `adb` / `emulator`) và chưa có tài khoản Expo để build APK `preview` chụp splash/adaptive icon thật (Expo Go không hiển thị Android adaptive icon / native splash `expo-splash-screen`).

## 2. Đối chiếu token thiết kế & component (Figma Design System vs Implementation)

Mặc dù chưa chụp được cặp ảnh AVD–Figma, màn `"Cần cập nhật"` và bộ tài nguyên Splash / Adaptive Icon đã được đối chiếu trực tiếp với hệ thống token và component chuẩn của repo ([`tokens.ts`](../../../../mobile/src/shared/theme/tokens.ts)):

| Hạng mục UI | Node / Spec Figma tham chiếu | Triển khai hiện hành (`GM-54`) | Ghi chú đối chiếu |
| --- | --- | --- | --- |
| **Android Splash Screen** (`expo-splash-screen`) | `01 · Màu sắc` (`0:1`), `01 · Mở đầu` ([`330:3066`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3066)), `Mở app` ([`298:2309`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=298-2309)); Light nền kem `#FFFCF3`, giữ hỗ trợ Dark hiện có `#13161B` | [`app.config.ts`](../../../../mobile/app.config.ts#L45-L56) dùng `backgroundColor: '#FFFCF3'` (`lightColors.bg`), `dark.backgroundColor: '#13161B'` (`darkColors.bg`), `resizeMode: 'contain'`, `imageWidth: 220`, ảnh [`gi-cung-duoc-splash.png`](../../../../mobile/assets/brand/gi-cung-duoc-splash.png) (`1024×1024`, RGBA8 có alpha) | Khớp token nền Light/Dark (`#FFFCF3` / `#13161B`); logo căn giữa an toàn; chờ ảnh chụp từ APK `preview` |
| **App Icon & Adaptive Icon** | Biểu tượng chữ G thương hiệu Gì Cũng Được (xanh trang trí `#46C34F` / raster icon `#4DC14C` từ asset gốc [`gi-cung-duoc-icon.png`](../../../../mobile/assets/brand/gi-cung-duoc-icon.png)) | [`gi-cung-duoc-adaptive-foreground.png`](../../../../mobile/assets/brand/gi-cung-duoc-adaptive-foreground.png) (`1024×1024`, RGBA8) thu logo trong vùng an toàn `66%` (`676dp/1024`); `adaptiveIcon.backgroundColor: '#4DC14C'` khớp nền raster của `gi-cung-duoc-icon.png` (`1024×1024`, RGBA8) | Dùng `#4DC14C` thay vì `#46C34F` ở nền adaptive icon để khớp chính xác mảng xanh gốc của `gi-cung-duoc-icon.png` và tránh viền lệch màu khi launcher bo mask |
| **Màn `"Cần cập nhật"`** (`UpdateRequiredScreen`) — Bố cục & Card | `02 · Components` (`8:2`), `03 · Màn hình` (`33:2`), mẫu error/blocking state với card bo góc, khoảng đệm `24px`, icon tròn đầu card, tiêu đề căn giữa, nút chính cuối card | [`UpdateRequiredScreen.tsx`](../../../../mobile/src/features/release/screens/UpdateRequiredScreen.tsx): `SafeAreaView` (`colors.background` = `#FFFCF3` / `#13161B`) + `ScrollView` (`padding: 24`, `FOCUSED_STYLE`) + Card (`surface`, `borderColor: colors.line`, `borderRadius: 20` = `radii.xl`, `padding: 24` = `spacing.xxl`, `gap: 16` = `spacing.lg`) | Khớp 100% token `spacing`/`radii`/`colors` từ [`tokens.ts`](../../../../mobile/src/shared/theme/tokens.ts) |
| **Typography & Màu chữ / CTA** | Inter (`InterRegular` 400, `InterMedium` 500, `InterBold` 700); quy tắc UI Spec: không đặt chữ lên nền xanh `#46C34F`, CTA dùng token tương phản `primary` (`#238633` / `#FFFFFF`) | Dùng `useAppFonts().textStyle(400|500|700)`, `ScaledText`, title `24/32` (`colors.text`), body `15/22` (`colors.muted`), box phiên bản `warm` (`#ECF8EB` / `#193322`), [`GCD / Button`](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=9-77) qua `AppButton` (`"Cập nhật ứng dụng"`, chạm ≥ 48dp, `primary` `#238633` chữ trắng `#FFFFFF`), lỗi mở store dùng `accessibilityRole="alert"` + `colors.danger` | Component & accessibility test đã đạt (`releaseSafetyAndMap.test.tsx`); cần đối chiếu trực quan fontScale `200%` & Dark mode trên AVD |
| **Places / Bản đồ khi không có key hoặc có key** | `GCD / Nearby Places State` (`379:1478`), `GCD / Nearby Places Map` (`206:913`), `11 · Vinh danh / Kết quả` (`330:3075`) | [`EmbeddedDishMap.tsx`](../../../../mobile/src/features/result/components/EmbeddedDishMap.tsx) và [`NearbyPlacesSection.tsx`](../../../../mobile/src/features/result/components/NearbyPlacesSection.tsx): bỏ `&output=embed`; khi chưa có key chỉ ẩn `WebView` rỗng và giữ nguyên nút chính `"Mở Google Maps"`; khi có key dùng Maps Embed API v1 | Unit + component test đạt; cần ảnh AVD cho ca không key, có key và lỗi 403/quota |

## 3. Danh sách ảnh cần chụp khi chạy AVD (bàn giao cho lượt Chặng 3A / `GM-58`)

Khi có môi trường Android SDK/AVD + APK `preview`:

1. `avd-splash-light-412.png` & `avd-splash-dark-412.png`: Cold start APK `preview` để kiểm splash `#FFFCF3` / `#13161B` và logo `gi-cung-duoc-splash.png` không bị cắt chữ.
2. `avd-adaptive-icon-launcher.png`: Icon app trên màn hình chính / App Drawer của Android launcher kiểm safe-zone `66%` của `gi-cung-duoc-adaptive-foreground.png`.
3. `avd-update-required-412.png` & `avd-update-required-320-200.png`: Màn `"Cần cập nhật"` nối DB QA có `0069` với `minimum_version = '1.2.0'` ở viewport chuẩn `412dp` (Light & Dark) và `320dp` với cỡ chữ `200%` + TalkBack.
4. `avd-places-unkeyed-412.png`, `avd-places-keyed-412.png`, `avd-places-error-412.png`: Màn kết quả `LiveDishResultScreen` với Places không key, có key + SHA-1 restriction, và lỗi 403 / quota 429 (xác nhận winner & Top 3 không đổi).
5. Nếu Trí bổ sung node Figma riêng cho `"Cần cập nhật"` và Splash trong file `3Ysh0mOAEkAgA5DgZPSC1j`, ghép ảnh render Figma bên cạnh các ảnh AVD ở trên và cập nhật bảng mục 2.
