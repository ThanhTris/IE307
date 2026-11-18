# GM-38 · Đề xuất contract và kiểm thử

Ngày 18/11/2026. Owner Tâm (`HoaiTam`), reviewer Trí (`ThanhTris`). Các lựa chọn bên dưới là đề xuất để review theo [issue GM-38](https://github.com/ThanhTris/IE307/issues/99). Baseline kiểm tra là [main `0b34900`](https://github.com/ThanhTris/IE307/commit/0b349001291a0152eef71d01ddaae0c8d6b490c8).

## Kết quả kiểm đầu vào

| Task | Project | Đầu ra thấy trên `main` |
| --- | --- | --- |
| GM-04 | Done | Dictionary/validation, PR #62, `d9e83d9` |
| GM-07 | Done | Contract/client, PR #138, `40feb9b` |
| GM-18 | Done | Catalogue/preview dish-only, PR #139, `a6e89fc` |
| GM-21 | Done | History/consent, PR #146, `621accc` |
| GM-34 | Done | Thiếu `RELEASE.md`, `CHECKS.md`, `FIGMA_PARITY.md` và `HANDOFF.md` trong `docs/evidence/roadmap-v2/GM-34/` |

Lúc 09:36 ngày 18/11 (giờ Việt Nam), `python scripts/task_readiness.py --task GM-38 --base-ref origin/main` trả `BLOCKED_ARTIFACTS` cho GM-34. Cần nhận revision và hồ sơ release thực tế từ Trí. [Issue GM-34](https://github.com/ThanhTris/IE307/issues/95)

## Contract GM-38.1 để Trí review

1. **Khu vực và thời gian.** Weather mặc định tắt. Sau khi người dùng bật, họ có thể chọn khu vực công cộng từ danh sách đã duyệt. `weather-context` chỉ nhận `regionId` và `targetAt` có offset rõ ràng. Server đổi khu vực sang tọa độ công cộng từ cấu hình. Thiếu khu vực hoặc nguồn không khả dụng thì luồng chọn món tiếp tục theo thứ tự hiện có. `public anchorId`/`desiredAt` của legacy giữ nguyên nghĩa và được kiểm riêng nếu hỗ trợ adapter legacy.
2. **Provider thử nghiệm.** Đề xuất Open-Meteo Forecast API cho pilot phi thương mại, giới hạn tối đa một request upstream cho mỗi khóa khu vực và giờ đích trong một cửa sổ cache 15 phút, kèm hạn mức chung do server cấu hình. Timeout đề xuất 2 giây. Chỉ gửi tọa độ khu vực công cộng và tham số dự báo. Điều khoản miễn phí dùng cho mục đích phi thương mại, yêu cầu ghi công theo CC BY 4.0 và có giới hạn truy cập. Trí cần chốt điều khoản, quota và phạm vi trước khi dùng. [API](https://open-meteo.com/en/docs), [điều khoản](https://open-meteo.com/en/terms), [hạn mức](https://open-meteo.com/en/pricing)
3. **Dữ liệu trả về.** Đề xuất contract có `provider`, `source`, `regionId`, `timezone`, `kind`, `observedAt`, `forecastFor`, `fetchedAt`, `expiresAt` và trường thời tiết nullable theo đơn vị cố định. Open-Meteo Forecast API lấy dữ liệu mô hình, kể cả mục current conditions, nên dùng `kind: forecast`, `observedAt: null`; `forecastFor` là giờ hợp lệ từ provider khớp khoảng giờ được yêu cầu. `expiresAt` phản ánh TTL dữ liệu đã fetch. Chỉ nhận observation nếu nguồn có giờ đo. Hết TTL, sai khoảng giờ, timeout hoặc 429 thì trả trạng thái không khả dụng và bỏ tín hiệu xếp hạng. [Tài liệu Open-Meteo](https://open-meteo.com/en/docs)
4. **Mood riêng tư.** Đề xuất nhãn tự khai, bật riêng theo phiên. Lưu trong bộ nhớ client theo cặp tài khoản và room/draft, TTL đề xuất 60 phút hoặc đến lúc khóa/kết thúc phiên, tùy mốc đến trước. Xóa ngay khi opt-out, đổi tài khoản/phòng, đăng xuất hoặc clearCache. App kiểm TTL khi quay lại foreground. Mood và consent thuộc phiên hiện tại, ngoài payload phòng, lịch sử, logs và request provider. Review UI trên Context hiện tại, xác nhận mẫu/giao diện với Trí trước khi gắn vào màn.
5. **Xếp hạng.** Đề xuất `gm38-preview-v1` chỉ sắp thứ tự hiển thị gợi ý cá nhân trước khóa. Server vẫn sở hữu danh sách hợp lệ, phiên bản pool và quyết định cuối. Áp tối đa một bậc ưu tiên cho món khớp quy tắc nguồn/nhãn đã review, giữ thứ tự server khi bằng điểm. Món thiếu nhãn nhận ưu tiên trung tính. Kiểm tập ID, NO/REMOVE, phiên bản và trạng thái khóa trước dùng dữ liệu. Bỏ xếp hạng nếu dữ liệu stale, chưa có mapping đã review, pool đã khóa hoặc context đổi giữa hai request. Nếu nhóm cần xếp thứ tự chung theo mood, cần chốt riêng cơ chế tổng hợp và quyền riêng tư trước khi sửa contract phòng.

## Phạm vi patch và kiểm thử sau khi mở gate

- Backend `supabase/functions/weather-context/index.ts` và request suite `supabase/tests/http/GM-38.http`. Kiểm Auth thật, schema trước mapping, timezone/giờ dự báo, TTL đúng biên, dữ liệu sai định dạng, 429/timeout và đường đi optional. Ghi riêng kết quả Edge thật chạy với provider giả lập và lượt gọi provider thực tế.
- Mobile `mobile/src/features/context/services/mood.ts` và wiring ở Context. Kiểm opt-in/opt-out, đổi danh tính/phòng khi request còn chạy, background/resume, TTL và lỗi HTTP. Kiểm từ composition mặc định trên AVD qua transport thực tới Edge QA, kèm client thứ hai để đối chiếu `poolVersion` và thứ tự đã khóa.
- Rank fixture có bộ ID hợp lệ bất biến, NO/REMOVE vắng mặt, thứ tự hòa ổn định, tín hiệu stale/thiếu taxonomy trung tính, pool khóa giữ đúng thứ tự. Legacy chỉ kiểm trong adapter riêng khi có.
- Bàn giao `CHECKS.md`, `HANDOFF.md`, `FIGMA_PARITY.md` theo revision thật. Chạy validator repo, regression và `python scripts/task_readiness.py --task GM-38 --gate merge --base-ref origin/main --verify-outputs`. Hiện các ca runtime/AVD chưa chạy. Lượt kiểm này cũng chưa tìm thấy `adb`/`emulator` trên PATH hoặc SDK tại đường dẫn tiêu chuẩn của máy.
