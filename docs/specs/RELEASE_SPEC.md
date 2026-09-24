# Đặc tả release

## Android

- Application ID ổn định, icon/splash, versionCode/versionName.
- Signed AAB tạo thành công bằng EAS hoặc native build được kiểm soát.
- Internal testing trên Google Play nếu có tài khoản.
- Data safety, privacy policy, screenshot và store listing hoàn chỉnh.

## iOS

- Bundle ID ổn định, icon/splash, version/build number.
- Archive không lỗi; TestFlight nếu có Apple Developer account.
- Privacy manifest/permission description đúng chức năng thực tế.
- App Store metadata và screenshot sẵn sàng.

## Release gate

- Migration test và backup restore đạt.
- Auth/RLS test đạt.
- E2E demo đạt trên build release, không chỉ development mode.
- Không còn blocker/critical; known issues được ghi rõ.
- Không chứa secret, tài liệu riêng hoặc debug endpoint.
