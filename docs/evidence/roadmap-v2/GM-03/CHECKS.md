# GM-03 — output checks

2026-10-10. Owner Trí; reviewer `ThanhTris` (review sau khi push). Contract `food-v1/roadmap-v2/GM-03.1`. Tested working tree trên `4f154af714411e81351e7761ceca281b1436fa68`; chưa có commit mới tại thời điểm ghi evidence. Đây là kiểm cấu trúc/runner nền, chưa nghiệm thu API nghiệp vụ, schema, RLS/RPC hoặc dataset.

| Case | Input/lệnh | Expected | Actual | Kết quả |
| --- | --- | --- | --- | --- |
| Config/runner guard | `npm test` tại root | project/port/loopback/reset/secret guard đúng | 8 tests Pass | Pass |
| Start/status | `npm run backend:start`, `npm run backend:status` | local project đúng, output không secret | local Supabase start được; status chỉ in `gi-cung-duoc-local` và loopback URL | Pass |
| Platform health smoke | `npm run backend:smoke` | endpoint nền trả HTTP 200 và body hợp lệ | GoTrue health 200, version/description nonempty | Pass |
| Database smoke | `npm run backend:test` | pgTAP có 3 assertions thật | `Files=1, Tests=3, All tests successful` | Pass |
| Stop guard | `npm run backend:stop`, gọi lại health | chỉ local project dừng, không stop remote | local service dừng; gọi lại không kết nối được | Pass |
| Business API/schema/data | Ngoài scope GM-03 | không tự nhận đã có | Chưa triển khai; task sau phụ trách | N/A |

Supabase CLI `2.120.0`, Docker local, PostgreSQL `17.11`. Reviewer `ThanhTris` cần đối chiếu lại revision, output và phạm vi trước khi đánh dấu Done.
