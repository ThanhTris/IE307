# GM-02 — output checks

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
