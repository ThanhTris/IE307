# Mobile — Expo / React Native

Đây là skeleton thư mục, chưa khởi tạo app/package. GM-01 sẽ bootstrap sau GM-00 được review; không có build Android đã chạy.

[Cấu trúc](../docs/project/REPOSITORY_STRUCTURE.md), [kiến trúc](../docs/architecture/SYSTEM_ARCHITECTURE.md), [UI](../docs/specs/UI_SPEC.md).

GM-01 tạo Expo Router src/app, khóa phiên bản và lockfile, TypeScript strict, lint/test scripts. Route adapters mỏng; feature screens/hooks; domain không SDK; data adapters không JSX. Khi tạo package phải bổ sung đúng lệnh install/start/android/typecheck/test đã kiểm thực tế vào README này.

EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY là config public; không được dùng service_role. Session cần secure storage adapter và auth tests. Quyền dữ liệu dựa trên RLS/RPC, không dựa vào giấu public key.
