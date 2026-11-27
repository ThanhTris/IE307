# Figma Parity — GM-54

- **Task ID**: `GM-54`
- **Issue**: [#190](https://github.com/ThanhTris/IE307/issues/190)
- **Reviewer**: Trí (`@ThanhTris`)

## Scope Alignment

- **Assigned Figma node in `UI_FIGMA_TASK_MAP.json`**: None (`GM-54` is a release configuration, startup version gate, push-visibility, and Places/Maps compliance task created under `RELEASE_V1_SCOPE.md`).
- **UI surfaces touched**:
  1. **`UpdateRequiredScreen`** (`mobile/src/features/release/screens/UpdateRequiredScreen.tsx`): Newly added startup screen for `TC-REL-003` ("Cần cập nhật"). Built exclusively from existing design system primitives (`SafeAreaView`, `ScrollView`, `FOCUSED_STYLE`, `ScaledText`, `AppButton`, `MaterialCommunityIcons`, `useShellTheme` tokens for light `#FFFCF3` / dark `#13161B`, `48dp+` touch targets, `accessibilityRole="header"` / `"alert"`, `fontScale >= 2.0` safe wrapping/scrolling).
  2. **Brand & Splash artwork** (`mobile/assets/brand/gi-cung-duoc-adaptive-foreground.png`, `mobile/assets/brand/gi-cung-duoc-splash.png`, `mobile/app.config.ts`): Derived from existing brand icon `mobile/assets/brand/gi-cung-duoc-icon.png` (`#4DC14C` brand green adaptive background + safe-zone centered white `'G'` foreground; `#FFFCF3` light and `#13161B` dark splash backgrounds matching `shared/theme/tokens.ts`). No placeholder Expo starter icons remain.
  3. **Embedded Map & Result fallback** (`EmbeddedDishMap.tsx`, `NearbyPlacesSection.tsx`): Removed `&output=embed` scrape URL. Shows official Maps Embed API v1 only when a Maps key is configured; otherwise hides the empty WebView frame cleanly while preserving the existing primary `"Mở Google Maps"` button layout.
  4. **Unconfigured Push UI** (`PushSettingsScreen.tsx`, `push-settings.tsx`, `PermissionsWelcomeScreen.tsx`): Hides `"Thiếu cấu hình EAS Project ID"` notice, push registration controls, and unavailable `"Thông báo"` permission row when EAS project ID is unset (`TC-REL-009`), keeping Inbox, in-app `NotificationBanner`, and Camera/Location permission prompts intact.

## Visual & Device Verification Status

- **Figma MCP side-by-side audit**: Not run (no new Figma screen node specified for `GM-54`).
- **Android AVD / real phone screenshots** (splash screen, launcher adaptive icon masks, dark mode, 200% font scaling on `"Cần cập nhật"`): Not run (no Android emulator or EAS native build available locally; required before `GM-58` / `GM-59` release handoff).
