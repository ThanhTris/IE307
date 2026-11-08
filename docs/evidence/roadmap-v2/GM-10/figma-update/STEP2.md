# Bước2 — form dish-only

Đã thêm form và route `/room/setup` độc lập, mock có nhãn. Dùng Inter/token,
AppHeader/AppButton/DishCount và đúng glyph buổi/ngân sách GM-09. Draft
10–20, ngân sách nullable, avoidRecent và inviteeIDs không chứa anchor/GPS.
Real mode vào route mới chỉ báo thiếu adapter, không gọi writer legacy.
Entry Home chưa nối ở bước này; hẹn giờ/chọn bạn nhận callback bước sau.

Kiểm thực tế: npm ci theo lockfile Pass; locked/offline Expo58 Pass;
TypeScript, scoped ESLint, architecture Pass; component suite1/5 tests Pass
(16.372s), gồm stepper10/20, giữ buổi/ngân sách và chặn count sai.
Không đổi package/lockfile. Native/visual Not run, kiểm ở bước7.
