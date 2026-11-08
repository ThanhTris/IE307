# GM-02 — UI foundation handoff

## Supplement 2026-11-05 — SVG Tooling & Phân loại cảnh báo Dependency

Đợt cập nhật này bàn giao cho các task UI tiếp theo (`GM-05`, `GM-09`, `GM-24..31`):
1. **Hỗ trợ vector SVG:**
   - Cài đặt `react-native-svg@15.16.0` (khóa trong `bundledNativeModules.json` của Expo SDK 58) và `react-native-svg-transformer@1.5.3` (cấu hình trong `metro.config.js`).
   - Mock transformer trong `jest.config.cjs` trỏ đến `mobile/tests/mocks/svgMock.tsx`.
   - Khai báo kiểu TypeScript cho `*.svg` trong `mobile/src/types/svg.d.ts`.
2. **Quy định tài sản thương hiệu:**
   - PNG `mobile/assets/brand/gi-cung-duoc-icon.png` chỉ dùng làm icon app trong `mobile/app.config.ts`.
   - Toàn bộ component UI hiển thị thương hiệu qua SVG vector `mobile/assets/brand/gi-cung-duoc-logo.svg` (Figma node `22:394`, SHA-256 `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`).
3. **Phân loại Dependency:**
   - 38 cảnh báo từ `npm audit` được phân loại rõ ràng trong [DEPENDENCIES.md](DEPENDENCIES.md): 0 cảnh báo ở runtime client, các cảnh báo còn lại thuộc build CLI và dev test. Không chạy `npm audit fix --force` để bảo vệ SDK 58.
4. **Kết quả kiểm thử:**
   - Baseline, typecheck, lint, architecture guard và Android JS export đạt theo [CHECKS](CHECKS.md). Jest toàn mobile của [CI commit `4903256`](https://github.com/ThanhTris/IE307/actions/runs/41957120783) đạt 56 suites / 954 tests; số `48 suites / 214 tests` ghi trước đó bị đính chính. Tập con local 93/93 tests của cùng revision không thay bằng chứng toàn bộ suite.
   - Route preview hiện hành: `/dev/foundation` và `/dev/components`. Visual/TalkBack trên thiết bị và icon/splash native của supplement SVG vẫn **Not run**; evidence thiết bị đời trước bên dưới chỉ áp dụng revision lịch sử.

## Supplement 2026-10-27 — Home now uses Figma shared components

Following the stale-UI report, the current working tree updates the Home composition against [GM-09 frame 330:3067](../GM-09/figma/330-3067-home.png). `Gm25HomeScreen` uses the shared `AppHeader`, `AppButton`, and `AvatarRow`, plus reusable `BrandBanner` and `AppBottomNavigation`; the official G mark, dining banner, and Home icons are bundled from Figma exports. Existing navigation/session/repository handlers are retained. Targeted automated checks passed (46 tests, typecheck, architecture, Android export); lint has four existing warnings. The updated Home has not yet been visually checked on emulator, so this is implementation evidence, not visual acceptance or task completion. See [CHECKS](CHECKS.md), [FIGMA_PARITY](FIGMA_PARITY.md), and [GM-09 handoff](../GM-09/HANDOFF.md).

## Supplement 2026-10-27 — partial Figma brand alignment

The current PR branch now uses the approved light theme colors (`#FFFCF3`, `#F0F4E9`, `#ECF8EB`, `#043B22`, `#B9CB9B`, `#238633`, `#1B6B29`, `#46C34F`) and the official G logo export in the shared `AppHeader`. Primary/secondary pressed states use the corresponding approved colors. Logo provenance and hash: `mobile/assets/brand/SOURCE.md`.

This is a limited shared-foundation update in response to the stale visual direction. It does not rebuild the Figma Home layout, banner illustration, friend section, or bottom navigation; those remain with GM-09. Targeted component test (9/9), typecheck, lint (zero errors; four existing warnings), and Android JS export (1,398 modules; logo included) passed. Android rendering of this exact patch is **Not run**; older screenshots are pre-patch only. Do not mark GM-05/GM-09 complete or claim full Figma parity.

## Supplement 2026-10-27 — SDK 58 and emulator verification

SDK 58 was installed and checked from a clean source copy. Baseline, typecheck, lint, all 708 Jest tests, architecture checks, Expo dependency compatibility, and Android JavaScript export passed. `AppFontProvider` loading/delay/fallback behavior and the 400/500/600/700 mapping are covered by controlled-loader component tests.

Android Studio AVD `Medium_Phone_API_37.0` (Android 17) ran the app through Expo Go 58.0.5. `/foundation`, Back navigation, 100%/200% font scaling and observed TalkBack labels/focus were checked. See [CHECKS](CHECKS.md) for limits and screenshots. This is emulator + Expo Go evidence, not a physical-phone, APK, or native development-build check. Font scaling was restored to 100%, TalkBack to off.

**Visual design handoff:** the later brand supplement applies shared colors and the G mark. The retained [Home capture](android-emulator-home-100.png) predates that change; the Home composition/banner artwork/bottom navigation remain old and need GM-09 implementation. Do not describe this PR as full Figma visual parity. See [FIGMA_PARITY](FIGMA_PARITY.md).

## Supplement 2026-10-26 — font foundation

The current PR adds local Inter 4.1 static weights 400/500/600/700 and an `AppFontProvider` that loads them through Expo Font while keeping system-font fallback available. The provider wraps the existing app providers without gating navigation/session startup. `/foundation` demonstrates the four weights and loading/fallback state; Figma node screenshots and asset/license hashes are linked in [FIGMA_PARITY](FIGMA_PARITY.md).

Expo dependencies were upgraded from SDK 57 to SDK 58 at the owner's request. Compatibility checks, Android rendering, navigation, font scaling and TalkBack checks have **not** been run on this revision; the older SDK 57 evidence below does not validate it. The owner requested deferring UI verification until the UI tasks are ready. Treat this as implementation handoff only, not GM-02 acceptance.

2026-10-10. Contract `food-v1/roadmap-v2/GM-02.1`. Owner Tuấn/reviewer ThanhTris; Codex hỗ trợ triển khai theo yêu cầu. Trạng thái: implementation local đang review, chưa Approved/Done; assignment đã accepted theo yêu cầu triển khai. Base `4f154af714411e81351e7761ceca281b1436fa68` + working tree, chưa commit/PR mới.

Input: GM-01 roadmap-v2/GM-01.1 và cấu trúc/stack/package được chủ dự án xác nhận, [review](../GM-01/REVIEW.md). Không nhập capability spike sandbox hoặc chờ data/API nghiệp vụ.

## Artifacts và sử dụng

- mobile/package.json/package-lock.json, app.config.ts/tsconfig.json/eslint.config.js/jest.config.cjs: tooling mobile tách BE; strict, Expo Go Android, minimal capabilities.
- src/app layout/index/foundation/not-found: route adapters mỏng; AppProviders safe-area; feature home screens là shell/navigation, chưa Home nghiệp vụ GM-09.
- shared/lib/useShellTheme: palette tối thiểu từ design system, không coi GM-05 đã hoàn thành token/component library.
- domain/decision/eligibility, data/api/auth/local và feature folders: markers quy hoạch, không implementation. Legacy identity/partners/results/data-supabase chỉ có marker đã chuyển tên, không xóa code người dùng.
- Component/router tests và architecture guard; [CHECKS](CHECKS.md) ghi actual output/Not run; [README](../../../../mobile/README.md) ghi npm ci/start/LAN/tunnel/smoke.

Task nhận GM-05 (component), GM-07 (contract/client) dùng cấu trúc này sau review GM-02 trên target; không tự dựng lại nền. GM-09..14 chỉ thêm route/feature thuộc mình khi đủ các nền khác. Không đưa business fixture/SDK vào route/domain.

## Lệnh và giới hạn

Root → cd mobile → npm ci → npm start. Check: npm run check, check:expo, bundle:android. Shell không yêu cầu env/auth/permission. Metro LAN lúc kiểm: exp://192.168.31.202:8081; URL tùy máy/mạng.

6 Jest tests, typecheck/lint/architecture/Expo compatibility/Android export/Metro manifest Pass. Điện thoại Expo Go chưa có kết quả/screenshot; clean clone độc lập chưa chạy. ThanhTris đối chiếu đúng revision, font200%/TalkBack/dark/navigation thật trước nghiệm thu. Không Approved task sau từ bundle hoặc evidence này. GitHub chưa sync, code chưa commit/push; merge gate GM-01 trên origin/main vẫn phải đối chiếu riêng.
# Merge disposition — 2026-10-27

Trí requested merging PR #137 and updating its primary GM-02/03 Project cards in the current owner conversation, accepting the reported CI limitation. The Inter/Expo/UI code keeps its existing test evidence; this merge instruction is not a new Android/device or visual-parity test result. Previously deferred UI verification remains deferred and must not be relabeled Pass. GM-05/09 receive partial changes from this PR and are not treated as fully completed by this disposition.
