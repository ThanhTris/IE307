# GM-08 — Hồ sơ quyền nguồn và freshness để review

Decision: Pending. Prepared-by: HoaiTam (AI hỗ trợ soạn). Independent reviewer:
chưa xác nhận. Không có consent/license mới, không Applied/Approved/Done.
User ngày 2026-10-11 xác nhận chưa có căn cứ quyền nguồn/policy và yêu cầu chuẩn bị
hồ sơ để nhóm review. Đề xuất này không đổi contract, không tự gán hạn cho record.

## Nguồn và bằng chứng quyền

27 locator/sourceRef thật trong [worksheet](survey-input-template.json) và
[capture manifest](capture-manifest.json). Mỗi nguồn cần evidence cho phần dữ liệu
được dùng: menu/giá, giờ bán, địa chỉ/tọa độ; fieldSources trỏ đúng sourceRef.
URL công khai, HTML lấy được hoặc quyền xem menu không tự chứng minh quyền tái dùng.
Không dùng image URL như permission; pilot không có artwork và không tải ảnh.

Một căn cứ có thể là chấp thuận của chủ nguồn cho đúng phạm vi, license hiện hành,
hoặc khảo sát trực tiếp có bằng chứng được phép sử dụng. Reviewer phải kiểm quyền
đối với nguồn nội dung thực tế; xác nhận của quán không tự thay quyền của nền tảng
đối với HTML/ảnh/tài liệu của nền tảng. Nếu nguồn không đủ căn cứ, giữ draft hoặc
thay bằng dữ liệu khảo sát trực tiếp có nguồn/evidence đúng, không tự ghi granted.

[Điều khoản Jollibee](https://jollibee.com.vn/chinh-sach-va-quy-dinh-chung)
(mục 5/10, kết quả tìm kiếm nguồn chính thức có crawl cache cũ) nêu hạn chế sao
chép/chia sẻ và yêu cầu đồng ý bằng văn bản đối với tái sản xuất nội dung. Cần kiểm
bản hiện hành và quyền cụ thể trước sử dụng; chưa có bằng chứng cấp quyền cho repo.
Chỉ lưu ghi chú ngắn, không sao chép toàn tài liệu hoặc tải artwork.

## Mẫu đề nghị xác nhận — bản nháp chưa gửi

> Nhóm sinh viên IE307 đang chuẩn bị pilot ứng dụng gợi ý món tại khu vực Thủ Đức
> cũ. Xin xác nhận nhóm có thể lưu, hiển thị và chia sẻ trong bản demo/hồ sơ môn học
> các dữ kiện thực tế của đúng chi nhánh: tên/địa chỉ/tọa độ, menu và giá theo đơn vị,
> hình thức phục vụ, giờ quán và giờ bán từng món. Không xin dùng ảnh hoặc nội dung
> quảng cáo. Nhóm đính kèm danh sách mục menu của chi nhánh để kiểm; xin ghi rõ phạm
> vi cho phép, yêu cầu ghi nguồn, ngày xác nhận, hạn hiệu lực và cách sửa/gỡ dữ liệu.
> Xin xác nhận lịch từng ngày trong tuần, ngoại lệ và món nào không bán suốt giờ quán.

Không gửi email/tin nhắn/liên hệ quán trong lượt này. Nhóm có thể dùng mẫu sau khi
chọn người phụ trách liên hệ. Khi nhận trả lời, lưu bằng chứng nội bộ được phép chia
sẻ, bỏ dữ liệu cá nhân không cần thiết; record sourceRef/locator, chủ thể cấp quyền,
permitted uses, attribution, validity, người nhập, người kiểm và hash file evidence.
Văn bản này không thay xác nhận thực tế của chủ nguồn.

## Policy freshness đề xuất (chờ owner/reviewer chốt)

Theo [FOOD_DATA_SPEC](../../../../docs/specs/FOOD_DATA_SPEC.md), ngưỡng 7/30 ngày là
đề xuất cần duyệt. Giữ toàn bộ validUntil null ở candidate hiện tại.

| Nhóm | Đề xuất hạn sau lần kiểm thực tế | Cách kiểm |
| --- | --- | --- |
| Menu/giá/variant/hình thức phục vụ/giờ quán/giờ món | 7 ngày | Đúng chi nhánh, đúng món, đầy đủ 7 ngày; xác nhận thay đổi/ngoại lệ |
| Địa chỉ/tọa độ/mã hành chính/anchor | 30 ngày | Nguồn được phép dùng; anchor công cộng, vị trí đúng và trong coverage |
| Coverage | Không quá hạn ngắn nhất của evidence khảo sát/boundary/anchor và các dữ kiện cần cho pilot | Reviewer chốt polygon/vùng khảo sát thực tế và nguồn |
| Taxonomy/classification biên tập | Review riêng theo version; chưa tự chốt TTL | Không kéo checkedAt từ lần cào menu sang field biên tập |
| Quyền nguồn | Theo căn cứ cấp quyền; nếu chưa biết hạn thì chưa publish | Recheck terms/license/consent; expiry không dài hơn permission thực tế |
| Dataset version | Không che field/row hết hạn | Hạn dataset không được biến một child stale thành fresh |

checkedAt là ngày kiểm đúng nhóm field; fetched_at chỉ chứng minh quan sát nguồn
và retained trong provenance. Không reset checkedAt/validUntil theo clock importer.
Nếu record dùng nhiều nhóm/nguồn, validUntil không vượt hạn sớm nhất của dữ kiện
cần để nó được dùng. Quyền có hạn ngắn hơn thì lấy hạn quyền; không gia hạn bằng
ngày cào. Sai/mâu thuẫn/missing thông tin giữ unknown/draft, khảo sát lại.

Trước buổi pilot kiểm lại menu/giá/hours của offering được dùng. Không suy còn món
từ menu; sold_out/available cần quan sát thật, expiresAt riêng. Chưa có override
thực tế nên arrays vẫn rỗng, không đề xuất TTL giả để tạo stock evidence.

Sau xác nhận policy: owner/reviewer ghi decision/ngày/evidence thật; người nhập
điền dữ kiện đã kiểm và hạn có căn cứ, validate/stage phiên bản mới. Reviewer độc
lập review cả nội dung/quyền/freshness/coverage theo staged hash mới trước publish.

## Kết luận hồ sơ hiện tại

Quyền nguồn: Pending. Freshness policy: Proposed/Pending. Field survey: Pending.
Review dataset: Pending. Publish/query verified: Not run. Không tự điền xác nhận
của người khác, không chuyển GM-08 Done khi AC này chưa đạt.
