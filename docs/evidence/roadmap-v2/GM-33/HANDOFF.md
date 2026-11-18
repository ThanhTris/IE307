# GM-33 — Bàn giao pilot

Nhận runtime và dữ liệu từ [GM-32](../GM-32/HANDOFF.md), [GM-40](../GM-40/HANDOFF.md) và QA [GM-03](../GM-03/RUNBOOK_QA.md). Giữ nguồn và giới hạn của lượt USB cũ trong [ANDROID_PILOT](ANDROID_PILOT.md).

Từ checkout sạch của revision cần kiểm, cài lockfile root và mobile rồi chạy `npm run qa:start -- --run-id <run-id> --api-port 54371 --db-port 54372` và `npm run qa:verify -- --run-id <run-id>`. Nếu cổng bận dùng 54375/54376. Dùng URL loopback và publishable key của QA đó cho app. Đặt ADB reverse chỉ trên thiết bị QA. Dùng hai guest độc lập, đối chiếu phiên và Top 3 với server. Tách dữ liệu draft/test_demo và fixture tổng hợp trong report.

Chạy các suite đổi catalogue active theo lượt. Lấy inventory ban đầu bằng `qa:verify` trước khi chạy canonical. Nếu cần so lại môi trường sạch sau các suite có fixture thay đổi registry, tạo QA mới với run ID khác.

Thực hiện lại theo [pilot](ANDROID_PILOT.md) và [ma trận Android–API](../../../testing/MOBILE_API_TEST_MATRIX.md). Ghi kết quả và giới hạn theo đúng SHA, thiết bị, kiểu build và API thực sự sử dụng. Gỡ forward đã thêm, chạy `npm run qa:stop -- --run-id <run-id>`. Chuyển build cùng provenance và các mục còn thiếu sang [GM-34](../GM-34/HANDOFF.md).
