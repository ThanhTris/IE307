# GM-10.2 — kế hoạch cập nhật UI theo từng commit

Ngày lập: 2026-11-02. Owner Tuấn; reviewer Trí (`ThanhTris`).
Revision yêu cầu: `ui-figma-final/2026-10-25/GM-10.2`.
Đây là kế hoạch, chưa phải kết quả thực thi hoặc nghiệm thu.

**Tiến độ thực thi:** bước1–6 đã triển khai và kiểm source/UI mock theo
[handoff](HANDOFF.md), [checks](CHECKS.md) và STEP1–STEP6. Bước7 (Expo Go,
visual/thiết bị và reviewer acceptance) chưa thực hiện. Giữ các yêu cầu
và giới hạn trong kế hoạch dưới đây; không suy task đã Done.

**Cập nhật sau khi nhận bộ ảnh GM-10 ngày 2026-11-02:** đã phóng to và đọc
đủ P01–P11/R01–R15, min10/max20 và cả hai shortage trong bộ PNG kết hợp
GM-09/GM-10. Xem [báo cáo độ phủ ảnh](FIGMA_REFERENCE_AUDIT.md).
Danh sách đề nghị export bên dưới giữ lịch sử lần rà sơ bộ; không còn
là danh sách bắt buộc bổ sung. Có thể triển khai dựa trên bộ ảnh hiện tại
theo chỉ dẫn người dùng, ghi rõ giới hạn MCP và các state bổ sung theo mẫu.

## Baseline và nguồn yêu cầu

- Nhánh hiện tại: `codex/gm-10-figma-update`; HEAD khi lập kế hoạch là
  `1939d35`, merge PR #147 của GM-09, trùng ref `origin/main` tại lần đọc này.
- Người dùng đã chạy start gate lúc `2026-11-02T09:38:39Z`, kết quả
  `READY_TO_CLAIM`. Chạy lại khi bắt đầu code nếu đầu vào/nhánh đã thay đổi.
- [Task hiện hành](../../../../../tasks/backlog/GM-10.md),
  [UI spec](../../../../specs/UI_SPEC.md) và
  [task map Figma](../../../../design/UI_FIGMA_TASK_MAP.json) là nguồn scope.
- [HANDOFF baseline](../HANDOFF.md) và [PLAN baseline](../PLAN.md) mô tả
  GM-10.1 trước supplement. Không dùng SDK57, route theo mã task, yêu cầu
  anchor/radius/coverage/ready trong tài liệu cũ làm yêu cầu cho màn mới.
- Nhận component/token GM-05 và contract GM-07 theo artifact/version/HANDOFF
  thật. Không thêm dependency ngược hoặc suy API mới đã sẵn sàng từ schema DB.

## Phạm vi và ranh giới

Thiết lập buổi ăn, ăn ngay/hẹn giờ, số món nguyên 10–20, ngân sách tùy chọn,
ưu tiên khác ba bữa gần; màn khẩu vị Anything/một/nhiều lựa chọn, bỏ qua,
giữ nháp và sửa từ phòng chờ. Pool độc lập GPS, quán, giờ bán và coverage.
Khẩu vị tài khoản là mặc định, có bản chụp riêng cho phòng; chỉ người đó xem
lựa chọn thô. Không biến ưu tiên mềm thành phiếu WANT/OK/NO.

GM-10 cung cấp màn, tương tác, fixture và interface cho GM-24/25.
GM-11 sở hữu phòng chờ; GM-22/30 và consumer tương ứng xử lý lời mời thật.
Phần chọn bạn chỉ là UI chọn người nhận/callback, không gửi lời mời trước
khi tạo phòng thành công hoặc tự làm backend/social.

Không đổi package/lockfile/native module, API/migration/engine để làm UI.
Không chuyển payload legacy sang dish-only bằng cách bịa anchor, taxonomy,
giá hoặc coi thiếu dữ liệu là 0. Khi thiếu adapter upstream, giữ UI mock có
nhãn và ghi rõ phần chờ; real mode không fallback sang mock khi lỗi.

Figma là tham khảo cách trình bày theo chỉ dẫn người dùng: yêu cầu task vẫn
phải đủ. Thiếu control/state thì ghi gap; bổ sung theo pattern có sẵn nếu
không làm thay đổi lớn bố cục. Thay đổi lớn hoặc mâu thuẫn yêu cầu cần báo
owner/reviewer. Không tự ghi acceptance hoặc sửa file Figma trong bước lập kế hoạch.

## Bảy bước thực hiện

### 1. Chốt thiết kế, state và đầu vào

- Đọc node/frame con, component, token và asset; kiểm phiên bản file Copy
  của người dùng so với file gốc trong task. Ghi nguồn/revision/thời điểm.
- Lập bảng frame → state → route → fixture → expected → ảnh đối chiếu.
  Đối chiếu đủ P01–P11/R01–R15 theo nguồn, không tự coi TC/KV trong ảnh tổng
  là cùng mã nếu chưa kiểm. Có danh mục ảnh/asset còn thiếu và gap log.
- Kiểm routes `/room/create-entry`, `/room/create`, `/room/context`,
  `/room/preferences` và các caller thật/mock; xác định nơi thay form,
  interface draft và callback, không tạo thêm luồng sản phẩm trùng chức năng.
- Kiểm contract cho dishCount, thời gian, ngân sách, taxonomy, consent và
  save/retry. Xác minh nhãn/đơn vị ngân sách: ảnh có nhãn mỗi người không
  cho phép đổi đơn vị giá quan sát món thành giá/người.
- Chụp baseline app nếu có môi trường; thiếu thiết bị ghi Not run.
- Đạt khi có bảng nguồn/state và danh sách phần độc lập, phần chờ upstream.
  Chưa đủ ảnh/asset/context để dựng chính xác thì chặn phần phụ thuộc.
- Commit gợi ý: `docs(gm10): define UI implementation and state coverage`.

### 2. Dựng form tạo phòng dish-only

- Layout xanh/kem, header, các nhóm buổi ăn, thời gian, ngân sách,
  avoidRecent, chọn bạn và CTA theo component/token đã nhận.
- Stepper chỉ nhận số nguyên 10–20; disabled ở biên, không tự giảm hoặc
  nhập 9/21. Giá/ngân sách chưa biết giữ nullable, không fake dữ liệu.
- Tách component/hook hợp lý. Mock mở được qua luồng app và có nhãn.
  Tránh thay đổi hành vi real mode trước khi có adapter đúng version.
- Kiểm tương tác chọn giá trị, biên số món, layout/scroll, draft giữ khi
  chuyển phần; TypeScript, lint phạm vi, kiểm kiến trúc và tests liên quan.
- Commit gợi ý: `feat(gm10): build dish-only room setup form`.

### 3. Hoàn thiện hẹn giờ và nháp thiết lập

- Picker ngày/giờ, xác nhận/hủy/Back; giữ buổi đã chọn và nháp khi mở/đóng.
  Validate giờ đã qua theo clock được cung cấp; không dùng ngày minh họa
  trong PNG làm ngày mặc định hoặc âm thầm sửa giờ người dùng.
- Ăn ngay/hẹn giờ có giá trị intent ổn định; rời khi có sửa chưa lưu phải
  xác nhận bỏ thay đổi. Chọn bạn không làm mất thiết lập.
- Kiểm giờ sai/quá hạn, chuyển ngày, hủy picker, đóng/mở, giữ nháp và
  keyboard/hardware Back; không xin GPS để xác nhận form.
- Commit gợi ý: `feat(gm10): add scheduling and setup draft handling`.

### 4. Cập nhật màn khẩu vị

- Anything và nhóm loại món/ẩm thực/hương vị theo taxonomy upstream.
  Anything xóa ưu tiên cụ thể; chọn cụ thể bỏ Anything, hỗ trợ nhiều chọn.
  Không bịa ID cho nhãn minh họa trong thiết kế; unknown có trạng thái rõ.
- Bỏ qua, Back, giữ nháp, bỏ thay đổi và sửa từ lobby; nhận giá trị đã có,
  giữ riêng consent và không đọc/hiển thị khẩu vị thô của người khác.
- Thiết kế footer/CTA hoạt động với nội dung dài, chữ lớn và màn nhỏ.
- Kiểm chọn/bỏ chọn, Anything, skip, draft, edit và riêng tư bằng fixture.
- Commit gợi ý: `feat(gm10): refresh preference selection and editing`.

### 5. Hoàn thiện loading, lỗi và shortage

- Tải/lưu/pending, lỗi tải/lưu, retry, offline chưa đồng bộ, phòng đóng,
  disabled, unknown và bỏ thay đổi cho cả hai màn; giữ draft khi lỗi.
- Shortage hiện available/requested, chỉ giảm sau host xác nhận và vẫn
  >=10; available <10 chặn tiếp tục, cho sửa thiết lập/quay lại.
- Không đổi request intent khi retry; chỉ chuyển bước sau ACK/snapshot
  hợp lệ theo interface đã bàn giao. Thiếu producer thì mô phỏng có nhãn,
  không tuyên bố transaction/reconnect thật đã đạt.
- Kiểm chống double submit, timeout/ACK unknown, retry, stale/room closed,
  shortage >=10 và <10; fixture cố định cho toàn bộ ma trận state.
- Commit gợi ý: `feat(gm10): cover setup and preference failure states`.

### 6. Nối route và bàn giao interface

- Nối entry GM-09 → thiết lập → khẩu vị → callback phòng chờ. Trạng thái
  room/version/draft trong cùng flow phải nhất quán; Back không tạo phòng
  mới ngoài ý muốn. Không tự dựng lại màn GM-11 khi chưa nhận callback.
- Chuyển route/import/test/fixture sang màn mới; chỉ xóa UI cũ sau khi không
  còn consumer. Giữ API/engine phiên cũ và regression; kiểm caller GM-24/25
  trước khi bỏ component cũ mà chúng còn dùng.
- Giữ auth guard và ranh giới real/mock. Tích hợp real chỉ với artifact
  đúng version; phần còn thiếu ghi interface/blocker trong handoff.
- Kiểm routing toàn luồng từ Home và direct link, Back, host/member,
  không lọt QA controls vào real mode; chạy mobile regression liên quan.
- Commit gợi ý: `refactor(gm10): connect setup flow and retire replaced UI`.

### 7. Kiểm Expo, đối chiếu và bàn giao

- Mở từ Home trên Expo Go tương thích baseline hiện hành. So thiết kế/app
  tại 412dp; kiểm thêm 320/360dp, font200%, TalkBack, touch48dp, safe area,
  keyboard và Back. Giữ Dark capability hiện có, không mở Dark redesign.
- Kiểm asset đúng slot/kích thước/alpha; không dùng screenshot cả màn làm
  implementation, không giữ URL asset Figma tạm trong app.
- Chạy checks theo baseline/lockfile, TypeScript/lint/architecture, mobile
  regression, repository validator, Python regression, task docs và diff.
  Test/export Pass không thay kết quả thiết bị; ghi Not run/Fail đúng thực tế.
- Cập nhật CHECKS, HANDOFF và FIGMA_PARITY với commit/build/device,
  frame/state/expected/actual/ảnh, file thay/xóa, route và consumer interface.
  Không ghi Done/Approved thay Trí.
- Fetch ref đích và chạy merge gate trước đề nghị merge. Dependency Done,
  artifact drift và các AC chưa chạy phải được giải quyết theo workflow.
- Commit gợi ý: `docs(gm10): prepare UI verification and consumer handoff`.

Mỗi bước dừng ở trạng thái có thể mở/kiểm độc lập, kiểm diff và commit theo
yêu cầu của người dùng. Các message trên chỉ là gợi ý; kế hoạch này không
tự tạo commit/push hoặc thay trạng thái task.

## Tài liệu Figma đã có và phần cần bổ sung

Đã xem các PNG local trong thư mục `.work/figma-reference/gm-09`:

- `04 - tạo phòng tình huống.png`: 4504x9400, thấy TC00–TC14.
- `05 - khẩu vị tình huống.png`: 3616x7138, thấy KV01–KV11.
- `03 - Màn hình/03 · Tạo phòng/Hẹn giờ/Tình huống.png`: 24608x2278,
  nhiều frame tạo phòng trong một ảnh dài.
- Đã có bảng màu và các bảng component Form/Khẩu vị/Số món, Anything,
  button, icon, dialog, trạng thái danh sách/lưu/offline trong cùng bộ export.
  Kiểm asset thực tế ở bước 1; việc có bảng component chưa chứng minh có
  đủ từng asset hoặc đúng revision.

Figma MCP `create_session` với file gốc `3Ysh0mOAEkAgA5DgZPSC1j` bị từ chối
ngày 2026-11-02 với thông báo `don't have edit access to this file`.
Chưa đọc được context/screenshot live trong lượt này; không coi bộ PNG cũ
là bản thiết kế mới nhất đã được xác minh. Đây là lỗi truy cập của tool,
không kết luận người dùng không được export bằng quyền View.

Ưu tiên bổ sung vào `.work/figma-reference/gm-10`:

1. Nhóm **04 · Khẩu vị / Lưu nháp / Lỗi** (`388:7816`) ở page Màn hình:
   các frame chính và state con, chưa có ảnh nhóm này trong bộ local.
2. Frame **dưới 10 món** (`1015:9957`) và các state shortage
   available/requested/host xác nhận nếu đã có, giữ nguyên tên/nhãn.
3. **GCD / Dish Count** (`321:1236`), gồm default/min10/max20/disabled;
   đối chiếu với bảng component Form hiện có trước khi export trùng.
4. Các frame tạo phòng/khẩu vị chưa rõ chữ hoặc đã đổi sau bộ export cũ:
   export riêng frame thay vì cả canvas. Bộ TC/KV tổng hiện tại có thể tái dùng
   nếu người dùng xác nhận vẫn là thiết kế team đang dùng.
5. Icon/illustration riêng chưa có file trong app: export asset gốc SVG hoặc
   PNG có alpha, tách khỏi nền; không chụp hoặc cắt screenshot thay icon.

PNG frame 2x, không cắt header/footer/modal/error, giữ tên frame; kèm link
node nếu có. Một ảnh tổng cho group không chia layer vẫn dùng để đọc tổng
thể; bổ sung ảnh zoom rõ từng state khi không đọc được chi tiết. Không cần
export lại các page login/vote/result/friends không thuộc phạm vi GM-10.
Nguồn Copy cần được xác nhận còn khớp revision team trước khi triển khai.

## Kiểm tra khi lập kế hoạch

- Repository validator, task indexes và kiểm whitespace tài liệu: Pass.
- Full Python regression: Fail, 613 tests/70.137s, 167 failures/36 errors/
  6 skipped. Interpreter hiện tại là Python3.15; log có thiếu `jsonschema`,
  `tzdata`, lỗi TIME và HTTP429. Chưa quy mọi failure về một nguyên nhân,
  chưa sửa môi trường hoặc ghi toàn bộ regression Pass.
- Log local đã ignore: `.work/gm10-plan-python.log`. Chỉ thêm tài liệu kế
  hoạch; chưa sửa source/tests, commit/push hoặc thay Project status.
