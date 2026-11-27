# GM-51 · Kế hoạch catalogue hosted

[Issue GM-51](https://github.com/ThanhTris/IE307/issues/187), Tâm thực hiện, Trí review. Đầu vào: GM-08, GM-40, GM-41 và GM-47. Gate live 20/11/2026 trên `10651dd` trả `BLOCKED` vì GM-47 đang Todo. PR draft hiện ghi kế hoạch và điều kiện nghiệm thu. Ngày 27/11/2026, GM-47 đã bàn giao 1.4.5 trên main và start gate trả `READY_TO_CLAIM`. Xem [CHECKS](CHECKS.md) và [HANDOFF](HANDOFF.md) cho patch hiện tại.

1. Xác nhận SHA, version, UUID, nguồn và quyền sử dụng từ bundle GM-41 và overlay GM-47. Tạo bản phát hành riêng có manifest pin hash, kiểm nguồn và quyền từng món. Bản phát hành chỉ dùng ảnh có nguồn, licence và ghi công đầy đủ. Chốt basename/release ID để consumer không cần đoán.
2. Giữ đường test-demo hiện tại tách biệt. Chế độ hosted có danh sách staging/production được duyệt, dry-run mặc định, cờ ghi và xác nhận đúng project/ref. Chỉ đọc DSN từ kênh bí mật đã cấu hình. Kiểm TLS và định danh đích trước thao tác ghi. Lượt dựng bundle chạy offline.
3. Chuẩn bị snapshot release đang active, xác minh SHA và số món trong cùng giao dịch kích hoạt. Từ chối release ID trùng với nội dung khác. Lặp lại cùng input phải giữ nguyên. Rollback nguyên tử về release đã xác minh trước đó. Tách quá trình nạp dữ liệu khỏi migration/ledger.
4. Trên owned QA kiểm từ chối DB lạ, dry-run, hash lệch, kích hoạt, lỗi giữa giao dịch, lặp lại và rollback. Trên staging dùng hai người thử và tạo phòng 10 món cho sáng, trưa, tối và ăn vặt, không dùng `acceptShortage`. Kiểm ACK, tập ID, release/hash ghim trong snapshot và hash/count readback.
5. GM-52 sở hữu project hosted. Thống nhất với Trí cách cấp staging sớm cho smoke vì GM-52 khai báo chờ GM-51 Done, còn GM-51 cần staging để hoàn tất. Dùng project được nhóm xác nhận cho test; trước production vẫn cần review riêng.

Đầu ra gồm importer, hướng dẫn release, test và CHECKS/HANDOFF theo SHA staging. Trước khi xin review chạy `python scripts/task_readiness.py --task GM-51 --gate merge --base-ref origin/main --verify-outputs`. [Phạm vi release v1](../../../project/RELEASE_V1_SCOPE.md)
