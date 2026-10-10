# Kiểm GM-02

Từ mobile: `npm ci`, `npm run check`, `npm run check:expo`, `npm run bundle:android`.
Component tests: shell không cần backend env, navigation/back/recover not-found; safe-area mock chỉ phục vụ layout. Integration tests kiểm Expo Router bằng route modules thật. Unit/integration không thay smoke Android/Expo Go.
Static architecture guard không thay review bảo mật. Các task sau thêm tests theo feature, không chuyển screenshot HTML thành native evidence.
