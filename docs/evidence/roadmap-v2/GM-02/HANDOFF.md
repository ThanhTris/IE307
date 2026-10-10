# GM-02 — UI foundation handoff

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
