# Phát hành catalogue hosted v1

[GM-51](../../tasks/backlog/GM-51.md) giữ một release bất biến theo ID và SHA trong
`dish_v3_private.catalogues`. Bản `1.5.0` dùng projection GM-18.2. Catalogue
GM-40/41/47 vẫn qua lệnh QA hiện có, với `test_only=true`. Hosted dùng bundle
`usageScope=production` và ghi `test_only=false`.

| Đích | Project ref | Nguồn ảnh |
| --- | --- | --- |
| Staging | `cijknqhnmzdsturkzyiz` | Bucket `dish-images` staging, 300 object đã đối chiếu SHA |
| Production | `ijkuoizconywuddokdhh` | Bucket `dish-images` production, cần receipt riêng sau khi upload |

## Dựng và kiểm release

Các lệnh dưới chạy từ thư mục repo. Dùng Python 3 và dependency trong
`scripts/ci-requirements.txt`. Trên staging, receipt được ghim từ
[GM-47 CI](https://github.com/ThanhTris/IE307/actions/runs/45837612273).
Trên production, người giữ bucket tải đúng gói GM-47 lên, sau đó chạy
`data-preparation/scripts/gm47_storage_receipt.py` theo workflow GM-47 với URL
bucket production, `--candidate-version 1.4.5`, danh sách các UUID đã duyệt và
`--with-illustrations`. Đổi biến `target`, `project` và `receipt` cho đúng
môi trường. Hai bundle cùng version nhưng có URL ảnh riêng và SHA khác nhau.

```sh
target=staging
project=cijknqhnmzdsturkzyiz
receipt=supabase/seed/catalogue/hosted-v1/staging-storage-receipt.json
out=".work/gm51-hosted-release/$target"

python3 supabase/seed/import_hosted_catalogue.py hosted-build --target "$target" \
  --storage-receipt "$receipt" --output "$out"
python3 scripts/release_catalogue_check.py --bundle "$out/dishes.json" \
  --json "$out/release-floor.json"
```

Đối chiếu `manifest.json`, `release-floor.json`, `description-rights.json` và
`linked-artwork.json` cho cùng bundle. Nguồn mô tả được giữ để tham khảo dữ kiện
theo hồ sơ Tâm đã duyệt. Mô tả là nội dung do nhóm viết. Giữ nguyên trạng thái
quyền của trang tham khảo và nguồn, license, ghi công từng ảnh.
[Hồ sơ GM-47](../evidence/roadmap-v2/GM-47/HANDOFF.md).

SHA staging đã kiểm là
`83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f`.
Người review ghi SHA production từ manifest riêng sau khi đối chiếu receipt,
report và đúng project. Ảnh phải truy cập công khai từ bucket của đúng đích.

## Trí chạy nạp hosted

1. Đối chiếu project ref, migration ledger, hàm chạy thật và worker GM-48 theo
   GM-52. Dùng đường triển khai schema của GM-52 để áp migration GM-51 đã review và
   xác nhận schema registry `0.31.10`.
   Importer chỉ ghi catalogue, không áp migration hoặc reset DB.
2. Lấy `GM51_SUPABASE_DB_URL` qua kênh bí mật của đội. Dùng libpq/psql 17+,
   kết nối trực tiếp hoặc Supabase session pooler cổng 5432. CLI bắt buộc
   `sslmode=verify-full` và kiểm project ref qua host trực tiếp hoặc username
   của pooler. Nếu cần CA riêng, đặt `GM51_SUPABASE_CA_FILE` đến PEM CA đã
   xác minh của project. Giữ DSN và JWT ngoài terminal output, Git và evidence.
3. Đọc bản active hiện tại rồi lưu ID và SHA để dùng cho kỳ vọng lúc ghi
   và rollback. Nếu `activeRelease` là `null`, dùng `--expect-active-id none`
   và bỏ `--expect-active-sha`.

```sh
python3 supabase/seed/import_hosted_catalogue.py hosted-readback --target "$target" \
  --confirm-project "$project"
```

Ví dụ nạp mới khi chưa có release active. Với release active có sẵn, thay
`none` bằng ID và thêm `--expect-active-sha` cùng SHA từ readback.

```sh
sha=83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f
python3 supabase/seed/import_hosted_catalogue.py hosted-import --target "$target" \
  --storage-receipt "$receipt" --input "$out/dishes.json" --manifest "$out/manifest.json" \
  --sha256 "$sha" --expect-active-id none
```

Dry-run không mở kết nối. Khi dry-run và dự định release đã được review, dùng
chính lệnh đó với `--apply --confirm-project "$project"`. Importer so lại SHA,
manifest và bundle từ nguồn đã duyệt, khóa giao dịch, kiểm bản active dự kiến,
nạp và kích hoạt nguyên tử. Lặp lại đúng release và nội dung là an toàn. Nếu
có lỗi, kết nối đứt hoặc mất ACK, dùng `hosted-readback` trước khi thử lại.

Sau khi nạp staging, readback phải trả `dish-catalogue-v1:1.5.0:gm18.2`,
đúng SHA, `testOnly=false`, `count=253` và coverage sáng/trưa/tối/ăn vặt
`68/100/72/114`. Chạy smoke bên dưới rồi ghi kết quả vào
[CHECKS GM-51](../evidence/roadmap-v2/GM-51/CHECKS.md) trước khi review production.

## Smoke phòng staging

Trên staging đã bật `allow_new_sessions` và worker GM-48 đang tick, dùng hai tài
khoản test. Đặt publishable key, JWT của chủ phòng và JWT của thành viên test
qua biến `GM51_STAGING_KEY`, `GM51_STAGING_HOST_JWT`, `GM51_STAGING_MEMBER_JWT`.
Lệnh Node 22+ tạo phòng staging, kiểm ACK/join, snapshot và hủy phòng thử. Chỉ
in bữa, số món và trạng thái. Chạy với các JWT có đủ thời gian sử dụng.

```sh
node --input-type=module <<'JS'
import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'

const contractVersion = 'dish-session-v4/roadmap-v2/GM-07.B'
const releaseId = 'dish-catalogue-v1:1.5.0:gm18.2'
const sha = '83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f'
const key = process.env.GM51_STAGING_KEY
const host = process.env.GM51_STAGING_HOST_JWT
const member = process.env.GM51_STAGING_MEMBER_JWT
assert(key && host && member && host !== member, 'Cần hai JWT staging khác nhau và publishable key')
const preferences = { cuisineIds: [], categoryIds: [], temperature: null,
  flavor: null, budget: null, avoidRecent: false }

async function call(command, payload, jwt = host) {
  const response = await fetch(
    'https://cijknqhnmzdsturkzyiz.supabase.co/rest/v1/rpc/dish_session',
    { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json' },
      body: JSON.stringify({ command, payload: { contractVersion, ...payload } }),
      signal: AbortSignal.timeout(15000) })
  const body = await response.json()
  assert(response.ok && body.ok, `${command} HTTP ${response.status} ${body.error?.messageKey ?? ''}`)
  return body.data
}
for (const mealSlot of ['breakfast', 'lunch', 'dinner', 'snack']) {
  for (const dishCount of [10, 20]) {
    const { roomId, code } = await call('create', { requestId: randomUUID(), displayName: 'GM51 QA',
      settings: { mealSlot, dishCount, desiredAt: null }, preferences })
    assert(roomId && code, 'ACK thiếu ID hoặc mã phòng')
    try {
      const joined = await call('join', { requestId: randomUUID(), code, displayName: 'GM51 member' }, member)
      assert.equal(joined.roomId, roomId)
      const snapshot = await call('snapshot', { roomId }, member)
      assert.equal(snapshot.catalogueVersion, releaseId)
      assert.equal(snapshot.catalogueSha, sha)
      assert.equal(snapshot.settings.mealSlot, mealSlot)
      assert.equal(snapshot.pool.length, dishCount)
      assert.equal(new Set(snapshot.pool.map(dish => dish.dishId)).size, dishCount)
      assert(snapshot.pool.every(dish => dish.mealSlots.includes(mealSlot)))
      console.log(`${mealSlot} ${dishCount} PASS`)
    } finally {
      const snapshot = await call('snapshot', { roomId })
      await call('cancel', { roomId, requestId: randomUUID(), expectedVersion: snapshot.version })
    }
  }
}
JS
```

## Rollback

Dùng ID và SHA từ readback trước release làm cặp `--release-id` và `--sha256`.
Dùng ID và SHA release hiện tại làm kỳ vọng để tránh đè người phát hành khác.
Dry-run mặc định. Ghi sau khi review bằng `--apply --confirm-project "$project"`.

```sh
python3 supabase/seed/import_hosted_catalogue.py hosted-rollback --target "$target" \
  --release-id "$previous_id" --sha256 "$previous_sha" \
  --expect-active-id dish-catalogue-v1:1.5.0:gm18.2 --expect-active-sha "$sha"
```

Nếu trước release chưa có bản active, dùng `--release-id none` và bỏ `--sha256`.
Production chỉ khôi phục release hosted đã có trong DB. Đọc lại active để xác
nhận kết quả. Những phòng đã tạo giữ release được ghim khi tạo, còn phòng mới
dùng release vừa khôi phục.
