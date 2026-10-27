# GM-02 — output checks

## Supplement 2026-10-27 — shared Figma Home composition

After the owner pointed out that the Expo shell still looked stale, the Home composition was updated against [GM-09 Figma frame 330:3067](../GM-09/figma/330-3067-home.png). It now composes the shared `AppHeader`, `AppButton`, `AvatarRow`, and new reusable `BrandBanner` / `AppBottomNavigation` from GM-05, with the approved G mark, dining illustration, action icons, bottom-nav icons, and approved light palette. Existing create/join/session/repository callbacks remain wired; no friend identities are fabricated when the repository is empty.

| Check | Expected | Actual | Result |
|---|---|---|---|
| Figma assets | Local assets for logo, banner and Home icons, with source/hash provenance | Expo export contains 40 assets including all 10 `mobile/assets/brand` images; source and SHA-256 are listed in `mobile/assets/brand/SOURCE.md` | Pass (bundle/source) |
| Shared components and Home routes | Reusable components render and Home navigation preserves existing actions | 3 targeted Jest suites, 46 tests passed; typecheck passed | Pass (automated) |
| Lint / architecture | No new lint errors or boundary violations | Lint exit 0 with four existing warnings in `contracts.ts`/`api/index.ts`; architecture guard passed | Pass with existing warnings |
| Android JS export | Expo Router can bundle the updated Home and Figma assets | Android export passed, 1,407 modules, 40 assets, Hermes bundle 3.4 MB | Pass (export only) |
| Updated Home visual on emulator | Updated Home visibly matches the approved Figma frame | AVD `Medium_Phone_API_37.0` booted and ADB reported `emulator-5554` online; Expo Go 58.0.5 is installed, but Android could not resolve its launcher/`exp://` activity (`No activities found` / `Activity class ... does not exist`). App did not render and no screenshot was obtained | Not run |

This supersedes the prior 2026-10-27 brand-only note below for Home layout status. It does not claim pixel-perfect parity, Android visual acceptance, or GM-02/05/09 completion. Older Home screenshots remain pre-patch evidence.

## Supplement 2026-10-27 — Figma brand tokens and logo

Following the review of the stale Home appearance, the current branch now applies the approved light palette to the shared theme tokens, uses the official G logo in `AppHeader`, and uses the Figma pressed-state colors for primary/secondary buttons. The logo export is from Figma node `22:394`; source and SHA-256 are recorded in `mobile/assets/brand/SOURCE.md`.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| Light brand tokens | Cream `#FFFCF3`, sage `#B9CB9B`, ink `#043B22`, leaf `#46C34F`, primary `#238633`, pressed `#1B6B29` | Shared light tokens match the inspected Figma palette; a component test asserts them | Pass (source + test) |
| Shared header logo | Use the exported G mark instead of the ramen emoji brand tile | `AppHeader` renders `gcd-logo-master.png`; no dependency added | Implemented |
| Component regression | Existing shared component behavior remains valid | Targeted `sharedComponents.test.tsx`: 9/9; typecheck Pass; lint exit 0 with four existing warnings | Pass |
| Android export after brand patch | Expo Router bundle includes the logo asset | Export passed on the updated clean SDK 58 copy: 1,398 modules; `gcd-logo-master.png` is included in the 31 exported assets; Android bundle 3.4 MB | Pass |
| Updated emulator rendering | Expo Go shows the new palette/logo on the updated bundle | Not captured for this patch; previous Home captures below are pre-patch evidence | Not run |
| Full Figma Home parity | Screen layout, banner artwork, actions, friend section, and bottom navigation match the approved Home frame | Only shared colors and the header brand mark were updated; old Home content/layout and ramen illustration remain | Not achieved; GM-09 screen work remains |

Do not use the earlier Android Home screenshots as evidence of this brand patch. They remain useful as the pre-patch baseline. This change does not complete GM-05 or GM-09 and does not claim full Figma parity.

## Supplement 2026-10-27 — SDK 58 and Android Studio emulator

This supplement records checks run for PR #137 after receiving `origin/main` at `7b1bab39bd4ddbea40a9f4033dfcea1da01d2df5`. The checked-out source revision was `b6efb50229feae7a54df8923796ff9af056872da` with local changes; the Android run used Expo Go on an emulator, not a native development build or physical phone.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| Clean SDK 58 install | `npm ci --no-audit --no-fund` succeeds from a source copy without `node_modules` | Install succeeded; Expo `~58.0.19`, Router `~58.0.26`, React `19.3.0`, RN `0.88.0`, Jest Expo `~58.0.12` | Pass |
| Mobile checks | Baseline, types, lint, Jest, architecture, Expo compatibility and Android JS export succeed | Baseline 5/5; typecheck; lint exit 0 with four warnings; Jest 27 suites / 708 tests; architecture; locked and online Expo compatibility; Android export 1,397 modules (~3.4 MB) | Pass |
| Inter load behavior | Content remains mounted during delayed/success/failure loads; four weights map correctly | Controlled-loader component tests cover loading, delay, failure, fallback, 400/500/600/700 and child stability | Pass (component tests) |
| Emulator navigation and font | `/foundation` renders; Back works; Inter and Vietnamese text remain usable at 100%/200% scaling | AVD `Medium_Phone_API_37.0`, Android 17, emulator `emulator-5554`, Expo Go 58.0.5; `/foundation` was checked at 100% and 200%; Back returned to the shell | Pass for observed cases |
| TalkBack | Screen controls expose labels/focus and remain actionable | TalkBack focus/labels were checked on Home and create-room; screenshots retained. Emulator font scale and TalkBack were restored to 100%/off afterward | Pass for observed cases |
| Unknown route recovery | Unknown route returns to the shell without breaking navigation | Not conclusively reproduced in this emulator pass | Not run |
| Figma product UI parity (before brand patch) | Current screens use the approved palette and G mark | The retained Home capture shows the pre-patch orange `#FF5A36` and ramen emoji. The source now has the shared palette/G header update; the Home layout/artwork remains different. See [parity evidence](FIGMA_PARITY.md) | Partial source update; full parity not achieved |

The emulator evidence is in this folder: [foundation 100%](android-emulator-foundation-100.png), [foundation 200%](android-emulator-foundation-200.png), [Home 100%](android-emulator-home-100.png), [Home 200%](android-emulator-home-200.png), [TalkBack Home](android-emulator-talkback-home.png), [TalkBack create-room](android-emulator-create-room-200-talkback.png), and [splash after restore](android-emulator-splash-after-restore.png). The splash screenshot is explicitly not evidence of a rendered Home screen.

The new Figma Home/entry screen layout is not implemented in this PR. A later supplement records the shared palette and G logo source patch; the old Home capture above predates that patch. This evidence does not claim full UI parity or GM-05/GM-09 completion.

## Supplement 2026-10-26 — Inter foundation implementation

This supplement records the new implementation on top of the current `main` baseline; it does not replace the historical SDK 57 checks below. GM-02 adds bundled Inter 4.1 weights 400/500/600/700, an Expo Font provider with system-font fallback, `/foundation` samples, and Figma node evidence. The project dependencies were also upgraded to Expo SDK 58 at the owner's request.

| Case | Expected | Actual | Result |
| --- | --- | --- | --- |
| Font asset/source and mapping | Licensed local assets for all four weights and a stable public mapping | Inter assets, license, hashes, and provider mapping added | Implemented; not runtime-verified |
| SDK 58 dependency compatibility | Expo SDK 58 compatible dependency tree and clean project checks | Package manifest/lockfile updated; compatibility/typecheck/lint/Jest/bundle were not run after the upgrade | Not run |
| Android UI parity | `/foundation` and shell render Inter correctly on Android, including navigation/accessibility checks | No Android UI run or screenshot for this revision | Not run |

Do not treat the historical SDK 57 results below as validation of the SDK 58 revision. Follow-up UI-task verification is intentionally deferred; no GM-02 runtime/device acceptance is claimed here.

2026-10-10. Owner Tuấn/reviewer ThanhTris; Codex hỗ trợ theo yêu cầu chủ dự án. Contract `food-v1/roadmap-v2/GM-02.1`; input GM-01 đã duyệt theo hội thoại. Tested revision: working tree trên `4f154af714411e81351e7761ceca281b1436fa68`, chưa commit mới. Windows, Node24.15.0/npm11.12.1; Expo57.0.27, React19.2.3/RN0.86.3; package versions tại [dependencies](DEPENDENCIES.md). Không auth/API/dataset thật.

| Case | Command/route/input | Expected | Actual | Kết quả |
| --- | --- | --- | --- | --- |
| Types | mobile: npm run typecheck | strict compiler exit0 | exit0, gồm route/component tests | Pass |
| Lint | mobile: npm run lint | exit0 | exit0 | Pass |
| Shell/component | npm test | không backend env, visible labels/action/back/recovery | 4 component tests Pass | Pass |
| Router modules | npm test | `/` → `/foundation` → back; unknown → not-found → `/` | 2 route integration tests Pass, tổng6 tests/2 suites | Pass |
| Import boundary | npm run check:architecture | domain thuần/shared/routes/SDK guard | Architecture boundaries OK | Pass |
| Dependency | npm run check:expo; npm ls --all --json | SDK-compatible, không invalid peer | Expo “Dependencies are up to date”; không problems | Pass |
| Android bundle | npm run bundle:android | Hermes bundle/asset export | 1245 modules, Android hbc2.7MB, metadata+27assets, exit0 | Pass |
| Metro/manifest | npm start; GET localhost8081/status và manifest expo-platform=android | Metro ready, HTTP200/SKD57/router src/app | HTTP200; name Gì Cũng Được; sdkVersion57.0.0; launchAsset Android entry.bundle | Pass |
| Android Expo Go visual/actions | `/` → structure → back/not-found, dark/TalkBack/font200% | đúng màn/action, không permission/startup crash | Chưa có device screenshot/result. Chủ dự án trả lời sẽ mở Expo Go và gửi kết quả | Not run |
| Clean clone/npm ci thật | README install sequence | clone sạch có thể mở cùng shell | Install/lockfile đã tạo và kiểm; chưa chạy clone sạch độc lập | Not run |
| Native camera/push/SQLite/API | Ngoài scope shell | không import/request capability | Không thêm các module này | N/A |

Metro LAN đang phục vụ `exp://192.168.31.202:8081` lúc bàn giao; cùng Wi-Fi. Đây không là evidence app đã mở trên điện thoại. LAN/tunnel hướng dẫn tại [mobile README](../../../../mobile/README.md); tunnel cần dependency riêng được duyệt nếu CLI yêu cầu.

Jest lần đầu bị sandbox chặn realpath thư mục TEMP, đã chạy lại với quyền phù hợp và Pass. Install từng gặp peer tự chọn version mới, đã khóa theo peer range/SDK và kiểm lại, không force/legacy-peer-deps. Bundle không thay native smoke. Chưa review độc lập/Done, chưa commit/push; ThanhTris review sau khi nhận branch.
