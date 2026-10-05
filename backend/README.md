# Backend Manabi

Nơi đặt API chạy trên máy khi phát triển và triển khai lên server khi cần. Hiện chưa có server, framework hoặc lệnh chạy; task backend phải xác định chúng trước khi triển khai. Giai đoạn đầu app học offline bằng SQLite và backup JSON, không phụ thuộc backend.

API/provider proxy cho pilot và cloud sync chỉ triển khai sau cổng review tương ứng. `supabase/` giữ hướng dẫn cho phương án cloud tùy chọn, không phải dependency bắt buộc. Xem [kiến trúc](../docs/architecture/SYSTEM_ARCHITECTURE.md) và [API contract](../docs/architecture/API_CONTRACT.md).

Mọi endpoint phải có contract, auth rule, validation, error model và test tương ứng.
