# Kế hoạch UI — food-v1

2026-10-07. Review mới GM-28; prototype mô phỏng không là native evidence. [UI spec](../specs/UI_SPEC.md), [food spec](../specs/FOOD_DATA_SPEC.md), [dependency map](TASK_DEPENDENCIES.md).

| Chặng | Tasks | Màn/đầu ra và gate |
| --- | --- | --- |
| Nền | GM-01/02 | Build/runner, tokens/primitives, a11y/error states |
| Context sớm | GM-29 sau GM-01/02/05/06/27 | UI-15 capability: foreground/manual/public anchor/radius/giờ ăn; harness không chờ result |
| Room | GM-07 sau GM-08/29, rồi GM-09/10 | UI-01..05: create/join/lobby/preferences thật, cùng context/pool, empty/unknown/coverage/reset ready |
| Vote/result | GM-12/13/14/15; friends GM-17 riêng | UI-06..09/11: double-tap/ba nút, hai vòng, tier, offering đã kiểm đúng context và refetch |
| Network/push | GM-16/25 | UI-10/12 pending khác ACK, restart/reconnect, permission và cold/warm |
| History/integration | GM-18/20 | UI-13 history; QR/link/Maps/review tái dùng context GM-29; không GPS mới tự đổi room |
| QA/release | GM-19/21/22 | Native/evidence 2/4/8 máy, FOOD core, gesture/a11y/privacy |
| Mở rộng | GM-26/31 | UI-14 account P1, UI-16 weather/mood P2 |

Mọi màn có loading/empty/error/retry, fetchedAt/nguồn/ngày kiểm, font200/dark/reduced motion/TalkBack, safe area/touch48. Card không ghép đặc tính từ nhiều quán; lịch dự kiến bán khác stock live; đường chim bay từ anchor khác GPS/route. Dữ liệu ngoài coverage/unknown không lấy món xa lấp pool.

Double-tap đặt WANT, không toggle/submit; scroll/vertical không vote, detail nút riêng, ba nút luôn có. Result ổn định nếu offering đổi; cảnh báo và refetch đúng món, không reroll. P2 weather/mood không chặn P0. Native build/evidence theo DoD; thứ tự task lấy từ dependency map, không từ tuần cứng.
