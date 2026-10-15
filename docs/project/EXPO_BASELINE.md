# Bộ Expo hiện hành và phạm vi task

Chủ dự án yêu cầu ngày 2026-10-15 đồng bộ bộ Expo và các task liên quan. Bảo trì này thuộc GM-02; không đổi assignee/deadline/dependency/approval hoặc mở lại task đã Done. [Plan ban đầu](FOUNDATION_IMPLEMENTATION_PLAN.md) và evidence trước đây giữ nguyên như lịch sử của revision đã kiểm.

Kết quả/lệnh thực tế và giới hạn của lượt bảo trì: [CHECKS bổ sung ngày 2026-10-15](../evidence/roadmap-v2/GM-02/EXPO_BASELINE_2026-10-15.md).

## Nguồn phiên bản

`mobile/package.json` quy định SDK/ranges; **`mobile/package-lock.json` là phiên bản cài tái lập cho nhánh hiện hành**. Không lấy patch từ log CHECKS/PR cũ để cài lại. CI dùng Node24, engines tối thiểu22.13; không cần CLI Expo global.

| Thành phần nền | Phiên bản của lượt cập nhật này |
| --- | --- |
| Expo SDK / Router | SDK57: Expo57.0.30 / Router57.0.28 |
| React / React Native | 19.2.3 / 0.86.3 |
| constants / linking | 57.0.22 / 57.0.13 |
| SecureStore / status-bar / system-ui | 57.0.4 / 57.0.1 / 57.0.4 |
| safe-area / screens | 5.7.0 / 4.26.2 |

Nâng patch trong SDK57; không tự nâng SDK lớn, React hoặc thêm native capability. Giữ [override peer nền GM-02](../evidence/roadmap-v2/GM-02/DEPENDENCIES.md). Lockfile/revision/CHECKS là nguồn cho từng lượt bảo trì sau.

## Kiểm tái lập và kiểm cập nhật mới

Từ checkout đã nhận main:

```powershell
cd mobile
npm ci --no-audit --no-fund
npm run test:expo-baseline
npm run check:expo
npm run check
npm run bundle:android
npm start -- --clear
```

- `check:expo`: fail nếu manifest/lockfile lệch nhau hoặc package cài không đúng lockfile, rồi chạy **expo install --check với map expo/bundledNativeModules.json của SDK đã cài**. `EXPO_OFFLINE=1` giữ expected version của CI ổn định trước patch upstream mới; vẫn kiểm native dependency compatibility. Không tắt validation, exclude package hoặc nuốt exit code để vượt lỗi.
- `check:expo:latest`: **online**, kiểm khuyến nghị hiện tại của Expo, bao gồm emergency fixes/patch sau baseline. Chạy đầu/cuối lượt bảo trì GM-02. Kết quả online có thể đổi dù Git SHA không đổi; locked Pass không có nghĩa đã kiểm mọi bản vá mới/security advisory.
- CI UI and BE foundations dùng npm ci, regression baseline, full mobile check, locked compatibility và Android bundle. Không tự sửa package trong CI. BE runner dùng mobile client cũng nhận đúng lockfile bằng npm ci.

Bảo trì GM-02: kiểm online → cập nhật package và sinh lockfile bằng npm → kiểm locked + online + full mobile + bundle → ghi CHECKS và bàn giao. Có thể dùng npx expo install --fix trong checkout riêng đã được giao nâng dependency; review diff, không force/legacy-peer-deps. [Hướng dẫn nâng Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [Expo CLI](https://docs.expo.dev/more/expo-cli/).

## Task nào nhận bộ này

| Task | Đầu ra/runtime giữ đúng scope |
| --- | --- |
| GM-02 | Sở hữu package/config/lockfile/runner; nghiệm thu cấu trúc/tooling, không tự đòi thiết bị để mở lại task nền |
| GM-05, GM-09..14 | Components/màn mock trên Expo Go hỗ trợ SDK57; giữ state/interaction và nhãn mock; chưa cần API task sau |
| GM-16 | Auth/session/SecureStore harness theo runtime task; HTTP máy tính không thay device |
| GM-24..28 | Location/room/vote/result/social nối API thật trên Android; location native dùng provider/build phù hợp |
| GM-29..31 | Push, QR/links, SQLite/outbox: shell Expo Go có capability guard; native kiểm development/native build hỗ trợ |
| GM-33, GM-34 | QA Android và APK/release trên đúng SDK/build/API revision; đổi native package phải rebuild trước kiểm |
| GM-35, GM-38 | P1/P2 có UI/API Android theo scope, nhận cùng baseline khi triển khai |
| GM-07, GM-15..23, GM-32 khi runner dùng mobile client/domain | Cài mobile dependencies theo lockfile nếu runner cần; không biến output API/domain thành yêu cầu mở Expo Go |
| GM-00/01/03/04/06/08/36/37/39 | Không thêm nghiệm thu Expo: baseline/BE/Data/API draft/HTML theo AC hiện hành. GM-39 vẫn chỉ sửa prototype HTML |

21 task đã có link về bộ này trong Test plan: GM-02/05/09/10/11/12/13/14/16/24/25/26/27/28/29/30/31/33/34/35/38. [Checklist output](TASK_OUTPUT_CHECKLIST.md) và [ma trận Android–API](../testing/MOBILE_API_TEST_MATRIX.md) giữ đúng loại kiểm, không tự miễn Not run thiết bị.

## Expo Go và nhánh đang mở

Expo Go trên điện thoại và dependency repo là hai thứ riêng. Dùng Expo Go hỗ trợ SDK57; cập nhật Expo Go không tự sửa package-lock dự án. Sau đổi dependency, chạy npm ci và Metro --clear. Nếu native dependency/config đổi, rebuild development client/APK thay vì chỉ reload Metro. [Tương thích Expo Go](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).

Nhánh PR cũ phải nhận package/lockfile/runner mới từ nhánh đích sau khi phần bảo trì được đưa lên GitHub, giữ thay đổi tính năng rồi chạy npm ci/checks lại. Sửa local chưa thay CI remote. Không sửa evidence cũ thành Pass cho bộ mới; ghi evidence mới theo revision.
