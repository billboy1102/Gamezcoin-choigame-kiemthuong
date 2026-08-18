# Gamezcoin: Chơi Game & Kiếm Thưởng

Một codebase dùng chung cho Web + Android (APK/AAB), kết nối backend Supabase thật.

## Chức năng đã có

- Đăng ký/đăng nhập email + mật khẩu, lưu session đa thiết bị.
- Nút đăng nhập Google đã nối Supabase Auth (cần bật Google provider trong Supabase Dashboard để dùng).
- 3 mini game: Tap Rush, Target Hunt, Chuỗi Trí Nhớ.
- Coin được ghi phía server, không có giới hạn coin kiếm từ game theo ngày.
- Phiên game server-side với kiểm tra thời gian, ngưỡng điểm hợp lý, chống gửi lại cùng phiên.
- Ví coin + ledger bất biến theo giao dịch.
- Điểm danh hằng ngày.
- Mã giới thiệu; thưởng khi người được mời hoàn thành phiên game hợp lệ đầu tiên.
- Yêu cầu rút qua MoMo/ngân hàng; coin được giữ ngay khi gửi yêu cầu.
- Admin xem người dùng, số dư, yêu cầu rút, duyệt/từ chối, điều chỉnh coin, chỉnh mức thưởng.
- Từ chối rút sẽ hoàn coin tự động; duyệt rút đánh dấu `paid` sau khi admin thực hiện thanh toán ngoài hệ thống.
- RLS: client không có quyền tự INSERT/UPDATE bảng ví, ledger, phiên game, rút tiền.

## Backend

Project dùng chung Supabase hiện có nhưng toàn bộ dữ liệu Gamezcoin tách bằng prefix `gamezcoin_` để không đụng tới app khác.

Edge Functions:
- `gamezcoin-api`: chức năng user (bootstrap, phiên game, thưởng, điểm danh, rút tiền, hồ sơ).
- `gamezcoin-admin`: dashboard admin, duyệt rút, điều chỉnh coin, settings.

Khóa `service_role` không nằm trong source public; Edge Functions đọc khóa từ secret runtime của Supabase.
Frontend chỉ dùng publishable key, đây là key được thiết kế để nhúng vào client và được bảo vệ bằng RLS + server-side functions.

## Chạy local

```bash
npm install
npm run dev
```

## Build web

```bash
npm install
npm run build
```

Output: `dist/`.

## Build Android

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

GitHub Actions tự build Web, APK debug và AAB release unsigned sau mỗi push lên `main`.
AAB để tải lên Google Play phải được ký bằng upload key/keystore của chủ app; không commit keystore hoặc mật khẩu vào repo.

## Bảo mật coin

Không tin điểm gửi từ client. Mỗi lượt chơi phải xin `session_id` từ server trước. Khi kết thúc, RPC server khóa phiên, kiểm tra trạng thái, thời gian đã chơi và `max_score_per_second + burst_allowance`, sau đó mới cộng coin trong transaction. `idempotency_key` của ledger ngăn một phiên nhận thưởng hai lần.

Đây là lớp chống gian lận nền tảng. Với quy mô lớn nên bổ sung Play Integrity/App Attest, rate limiting theo thiết bị/IP, telemetry gameplay và hệ thống phát hiện bất thường.
