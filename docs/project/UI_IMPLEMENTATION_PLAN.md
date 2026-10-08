# Kế hoạch UI — food-v1

2026-10-07. Review mới GM-01; prototype mô phỏng không là native evidence. [UI spec](../specs/UI_SPEC.md), [food spec](../specs/FOOD_DATA_SPEC.md), [dependency map](TASK_DEPENDENCIES.md).

Các chặng dưới là **tích hợp/merge**, không chặn viết màn hình độc lập. Sau start gate GM-01, UI/view model/states dùng fake adapter đúng API/UI contract có thể làm song song backend. Ví dụ GM-13 với GM-12, GM-20 với GM-14, GM-21 với GM-20; cập nhật runner GM-02/primitives GM-04 trước kiểm native thật. Không tự thêm package/lockfile hoặc copy shared types; draft PR ghi contract commit, file ownership và phần mock. Xem [workflow](TEAM_WORKFLOW.md).

| Chặng | Tasks | Màn/đầu ra và gate tích hợp |
| --- | --- | --- |
| Nền | GM-02, GM-04 | Build/runner, tokens/primitives, a11y/error states |
| Context sớm | GM-10 sau GM-02, GM-04, GM-07, GM-09, GM-08 | UI-15 capability: foreground/manual/public anchor/radius/giờ ăn; harness không chờ result |
| Room | GM-13 sau GM-12, GM-10, rồi GM-16, GM-19 | UI-01..05: create/join/lobby/preferences thật, cùng context/pool, empty/unknown/coverage/reset ready |
| Vote/result | GM-14, GM-20, GM-21, GM-22; friends GM-15 riêng | UI-06..09/11: double-tap/ba nút, hai vòng, tier, offering đã kiểm đúng context và refetch |
| Network/push | GM-24, GM-18 | UI-10/12 pending khác ACK, restart/reconnect, permission và cold/warm |
| History/integration | GM-17, GM-23 | UI-13 history; QR/link/Maps/review tái dùng context GM-10; không GPS mới tự đổi room |
| QA/release | GM-25, GM-26, GM-27 | Native/evidence 2/4/8 máy, FOOD core, gesture/a11y/privacy |
| Mở rộng | GM-28, GM-31 | UI-14 account P1, UI-16 weather/mood P2 |

Mọi màn có loading/empty/error/retry, fetchedAt/nguồn/ngày kiểm, font200/dark/reduced motion/TalkBack, safe area/touch48. Card không ghép đặc tính từ nhiều quán; lịch dự kiến bán khác stock live; đường chim bay từ anchor khác GPS/route. Dữ liệu ngoài coverage/unknown không lấy món xa lấp pool.

Double-tap đặt WANT, không toggle/submit; scroll/vertical không vote, detail nút riêng, ba nút luôn có. Result ổn định nếu offering đổi; cảnh báo và refetch đúng món, không reroll. P2 weather/mood không chặn P0. Native build/evidence theo DoD; thứ tự task lấy từ dependency map, không từ tuần cứng.
