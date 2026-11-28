# GM-47 · Kiểm thử

[Lô 3 — 27 ảnh chủ dự án duyệt (tổng 38 bổ sung, 174/253 ảnh thật)](PHOTO_BATCH3_2026-11-28.md) ·
[Lô gộp 11 ảnh đã duyệt và kết quả rà 87 món](PHOTO_BATCH2_2026-11-28.md) ·
[Lô ba ảnh ban đầu](PHOTO_FOLLOWUP_2026-11-28.md).

## Minh họa theo nhóm ngày 26/11/2026

- Áp dụng quyết định của Trí cho bản nộp đầu. Giữ 136 ảnh thật đã duyệt. Gán 117 món đang thiếu vào 14 nhóm từ taxonomy GM-41 theo thứ tự nhóm hiện có, ưu tiên nhóm bữa chính nếu món thuộc cả hai loại. 117 link web tiếp tục dùng để nhận diện món khi tìm ảnh thật. [Quyết định của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7181026504) · [Danh sách món cần ảnh thật](PHOTO_ASSIGNMENTS.md)
- Bàn giao 14 cặp WebP (800×600 và 400×300, tổng 95.798 byte) dựng từ Material Design Icons trong gói `@expo/vector-icons@15.1.1` đã khóa ở app. Mỗi ảnh có chữ **MINH HỌA**. Manifest ghi nguồn icon, tác giả, Apache-2.0, ghi công và SHA. Kiểm toàn bộ 300 WebP trong ZIP và đối chiếu kích thước, byte, SHA cùng 253 UUID. [Giấy phép Material Design Icons](https://pictogrammers.com/docs/general/license/)
- Bundle QA offline `1.4.4` giữ cùng SHA và đạt 32/33. Kiểm với receipt fixture dựng từ byte thật trong ZIP cho kết quả 33/33 với 136 ảnh thật và 117 minh họa. Fixture kiểm ánh xạ và gate offline. Hai URL mẫu trên staging (một ảnh thật và một minh họa) trả HTTP 400. Trí còn phụ trách upload, sau đó cần chạy receipt và GM-03 QA trên staging thật.
- 13 test GM-47 đạt. Bộ Python chạy 741 test và bỏ qua 6. Validator repo, task indexes và kiểm diff đạt.
- Rà theo tên của 117 món trên các nguồn Trí đề xuất. Tìm được hai ứng viên chờ Tâm duyệt gồm Cơm bò (Commons, CC BY-SA 3.0) và Ốc len xào dừa (Flickr, CC BY 2.0). Bộ nhập cần hỗ trợ nguồn Flickr trước khi thêm ảnh Ốc len xào dừa. Còn 115 món chưa có ứng viên đạt trong lượt rà này. Openverse trả 403. [Kết quả theo từng món](PHOTO_SOURCE_AUDIT.md)

## Xử lý review bca5e95 ngày 25/11/2026

- Tâm xác nhận 12 ảnh Commons qua JSON xuất lúc 18:25 ICT. Đã so SHA bundle, đối chiếu 12 UUID và SHA của từng ảnh trên trang duyệt với byte WebP. Cả 12 có `aiCheck.checkedBy = "Tâm"` và `verdict = "real_photo"`. Gói tải có 136 cặp, gồm 272 WebP, tổng 16.914.034 byte ảnh. [Review của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7159904392)
- Đã lập danh sách 117 món cần ảnh có giấy phép mở hoặc ảnh nhóm tự chụp. Hồ sơ web dùng để nhận diện món khi tìm ảnh hoặc chụp. [Danh sách phân công](PHOTO_ASSIGNMENTS.md) · [Hồ sơ ảnh tham khảo](WEB_PHOTO_SELECTIONS.json)
- Kiểm GET ba UUID từ lô đầu 107 cặp, tại gốc bucket staging và thư mục `thumbnails/`. Cả sáu yêu cầu trả HTTP 400. Phản hồi kiểm chi tiết cho một ảnh chính ghi `NoSuchKey`. Chờ Trí xác nhận lô và object key đã upload trước khi tạo receipt. QA với URL Storage vẫn chờ. Checker catalogue offline đạt 32/33 vì mục ảnh có URL còn 0/253.
- Bundle QA `1.4.4` dựng lại đúng SHA `9f4f19823adb4dae22f442a00c47ba872e56b96068d79d7a5f0beb01f550cac0`. Có 253 mô tả đã xác nhận và 188 URL tham khảo dữ kiện.

## Tâm chọn ảnh tham khảo cho 117 món ngày 25/11/2026

- Đối chiếu 115 lựa chọn trong JSON Tâm gửi với UUID, tên món, URL ảnh và trang nguồn của trang duyệt. Theo xác nhận bổ sung của Tâm, ghi ảnh đầu tiên cho Lẩu cá linh điên điển và Trái cây trộn muối ớt. Cả 117 UUID khớp danh sách món chưa có cặp ảnh trong candidate `1.4.4`. [Danh sách lựa chọn](WEB_PHOTO_SELECTIONS.json)
- Mỗi mục có trạng thái `needs_verification` về quyền sử dụng. Mục Bò bía mặn ghi trang nguồn vì URL ảnh có chữ ký tạm. Ảnh tham khảo này chưa có trong ZIP tải lên hoặc bundle. Gói tải lên có 124 cặp đã xác nhận, 12 cặp Commons đang chờ Tâm duyệt.
- Kiểm tải đủ bốn ảnh của hai món trên Chrome. Kết quả xuất JSON của trang duyệt lại giữ nguyên 115 lựa chọn và thêm đúng hai UUID khi chọn ảnh. Ảnh đã chọn cho món trái cây có bản xem trước 640 × 427 px, cần xin bản gốc đủ kích thước nếu được quyền dùng.

## Tìm bổ sung ảnh ngày 25/11/2026

- Đối chiếu 36 tệp ứng viên theo tên món, cách gọi khác và trang nguồn. Bổ sung Bún riêu chay, Cháo lươn và Cơm niêu vào hàng chờ. Ảnh Cháo lươn giữ nguyên khung ảnh gốc 639 × 732 px trên nền 976 × 732 px, chỉ thêm viền trơn và nén. Trang duyệt có nguồn, phép dùng và ghi chú đối chiếu từng ảnh. [Bún riêu chay](https://commons.wikimedia.org/wiki/File:Vietnamese_vegetarian_crab_noodle_soup.jpg) · [Cháo lươn](https://commons.wikimedia.org/wiki/File:Batchaoluon.png) · [Cơm niêu](https://commons.wikimedia.org/wiki/File:C%C6%A1m_ni%C3%AAu_Kombo.jpg)
- Có 124 cặp đã xác nhận, 12 cặp chờ và 117 món cần ảnh. Gói duyệt có 272 WebP, tổng 16.914.034 byte ảnh. Trang duyệt liệt kê nguồn tham khảo để xử lý một số món thiếu ảnh, gồm ảnh Bún quậy chưa có xác nhận quyền và ảnh Nem chua rán có cạnh ngắn 392 px.
- So khớp SHA-256 và số byte của cả 272 WebP với metadata ZIP. Kiểm thử trên Chrome xác nhận trang hiện đúng 12 ảnh chờ, tìm được món theo tên và xuất đúng UUID cùng SHA-256 của các ảnh được chọn.
- Candidate offline `1.4.4` và 253 mô tả đã xác nhận giữ cùng SHA-256 `9f4f19823adb4dae22f442a00c47ba872e56b96068d79d7a5f0beb01f550cac0`. Còn chờ ảnh đủ 253 món và lượt kiểm Storage thật.

## Rà toàn bộ ảnh còn thiếu và ghi xác nhận mô tả ngày 25/11/2026

- Đã đối chiếu UUID và SHA của 122 mô tả trong JSON Tâm gửi từ trang duyệt toàn bộ. Tổng 253/253 mô tả có xác nhận. CSV ghi 188/188 URL `team_authored_fact_reference`. Với mục chưa có ghi chú đối chiếu trước đó, hồ sơ lưu nội dung chính xác mà Tâm đã xác nhận.
- Đã rà ảnh theo tên món, cách gọi khác và các danh mục ẩm thực trên Commons. Có 9 ứng viên đúng món, đủ kích thước và giấy phép, chờ Tâm xác nhận. Các ảnh mới có hồ sơ tác giả, trang nguồn, giấy phép, SHA và `aiCheck.assistance`. Không dùng ảnh chỉ thấy nguyên liệu, cửa quán, hoặc biến thể khác món.
- Danh mục có 124 cặp đã xác nhận, 9 cặp chờ và 120 món chưa có cặp ảnh. Gói duyệt có 266 WebP với tổng 16.460.334 byte ảnh. ZIP tải lên tiếp tục dùng 124 cặp đã xác nhận. CSV bàn giao chia 120 món chưa có ảnh theo các lô GM-41.
- Candidate offline `1.4.4` giữ SHA-256 `9f4f19823adb4dae22f442a00c47ba872e56b96068d79d7a5f0beb01f550cac0`. Checker đạt 32/33 vì chờ ảnh có URL Storage. Receipt và QA với Storage thật vẫn chờ lô upload.

## Xác nhận bổ sung cho bản 1.4.4 ngày 25/11/2026

Đã đối chiếu UUID và SHA từ JSON Tâm xuất lúc 16:06 ICT. Ghi nhận đủ 5 cặp ảnh và 30 mô tả đã chọn. Bundle vẫn có 253 món, version `1.4.4`, SHA-256 `9f4f19823adb4dae22f442a00c47ba872e56b96068d79d7a5f0beb01f550cac0`. [Review yêu cầu xác nhận](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7157464470)

| Kiểm | Kết quả |
| --- | --- |
| Ảnh | 124 cặp đã xác nhận, còn 129 món cần ảnh. ZIP hiện hành có 248 tệp WebP, tổng 15.273.974 byte ảnh. Lô đầu giữ 107 cặp để đối chiếu đúng lô Trí dự kiến tải. |
| Mô tả | 131/253 mục đã xác nhận. 73/188 URL đạt `team_authored_fact_reference`, 115 URL còn chờ. Đã đối chiếu thêm 10 mục từ bài của VnExpress, công thức Cookpad và menu beFood. Các mục này ghi `assistance` và chờ Tâm duyệt. |
| Kiểm ZIP và receipt | Đối chiếu toàn bộ 248 tệp theo UUID, kích thước và SHA-256. Chạy receipt với byte ảnh từ ZIP để kiểm lô fixture `1.4.5` gắn đủ 124 UUID đã duyệt. |
| Storage staging | Chờ Trí xác nhận URL công khai, thư mục ảnh chính, thư mục ảnh nhỏ và lô đã tải. Checker offline đạt 32/33, còn mục ảnh. Receipt và QA với ảnh từ Storage thật chưa chạy. |

## Xác nhận của Tâm và lô Storage ngày 25/11/2026

Nhận JSON Tâm xuất từ trang duyệt `1.4.3` lúc 16:02 ICT. Đã đối chiếu SHA của bản duyệt, UUID và SHA từng ảnh hoặc câu kèm URL trước khi ghi tên Tâm. Tâm chọn đủ 12 ảnh và 39 mô tả trong lượt này. [Review của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7157464470)

| Kiểm | Kết quả |
| --- | --- |
| Ảnh | 119 cặp có xác nhận. Có thêm 5 cặp chờ Tâm duyệt gồm Chè bưởi, Lẩu Thái, Ô mai, Sủi dìn và Miến. Còn 129 món chưa có cặp. 14 món ở bảng tự chụp bên dưới tiếp tục chờ Trí phân công. |
| Mô tả | 101/253 món có xác nhận. Đã đối chiếu thêm từng câu cho 30 món thuộc các nguồn VnExpress, Ngôi Sao, Vietnam Tourism, Go Vietnam và Cookpad. Dùng nguồn riêng cho Bánh cống, Cháo trai, Lẩu gà lá giang và Lẩu cá thác lác khổ qua. 30 mục mới có `assistance` và chờ ký. |
| Quyền nguồn | 46/188 URL đạt `team_authored_fact_reference`, còn 142 URL `needs_confirmation`. Checker xác nhận từng UUID trước khi cập nhật trạng thái chung của URL. |
| Gói ảnh tải lên | Gói lô 107 cặp có 214 WebP, tổng 13.074.184 byte. Gói hiện hành 119 cặp có 238 WebP, tổng 14.689.446 byte. Mỗi gói có danh sách UUID cố định để kiểm đúng lô Trí đã tải. |
| Candidate offline | `1.4.4`, SHA-256 `9f4f19823adb4dae22f442a00c47ba872e56b96068d79d7a5f0beb01f550cac0`. Checker đạt 32/33. Mục ảnh chờ URL Storage. |
| Kiểm lô qua fixture | Dùng byte từ từng ZIP để so SHA và chạy CLI nhận receipt bằng danh sách UUID. Hai lô gắn lần lượt 107 và 119 ảnh vào candidate fixture `1.4.5`. Test CLI xác nhận lô có ảnh chưa duyệt bị chặn trước HTTP. |
| Merge gate upstream | Sau fetch, target `origin/main` tại `6cd5e1a`. Checker `--gate merge --verify-outputs` trả `READY_FOR_MERGE_REVIEW` cho dependency và artifact lúc 15:58 ICT. |
| Storage staging và readback có ảnh | Chờ URL bucket, các thư mục object key và xác nhận lô đã upload từ Trí (GM-52). |

## Ưu tiên theo review #217 ngày 25/11/2026

Trí chốt giữ **253 món**, gồm Bánh crepe ngọt, Mứt gừng và Bánh phồng tôm. Hồ sơ ảnh hiện hành đã bỏ trạng thái đề xuất loại món. Khôi phục ảnh crepe của FlipTable với EXIF HTC và giữ trạng thái chờ Tâm duyệt lại vì lượt trước Tâm đề nghị đổi ảnh. Bổ sung ảnh Commons của Mứt gừng, Bánh phồng tôm và chín món khác, gồm một tô nui kiểu Hong Kong thấy rõ nui ống trong nước súp. Ảnh Nui đang chờ Tâm xác nhận phiên bản phù hợp. [Quyết định của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7154895031)

| Kiểm | Kết quả |
| --- | --- |
| Ảnh và nguồn gốc | Chuẩn bị 119 cặp, gồm 107 cặp Tâm đã xác nhận và 12 cặp chờ xác nhận. Còn 134 món chưa có cặp ảnh. Tổng 14.689.446 byte, gồm 12.446.204 byte ảnh chính và 2.243.242 byte ảnh nhỏ. Từng cặp có SHA, tác giả, giấy phép và ghi công. |
| Đối chiếu mô tả | Rà từng câu ở 39 món. Viết lại 30 mô tả, trong đó 4 món thay URL để có dữ kiện trực tiếp cho đúng món. Ví dụ nguồn riêng cho Bún rạm bổ sung cách lọc rạm nấu nước dùng. Menu cho Nui chỉ xác nhận tên và phần ăn kèm, nên rút chi tiết về cách nấu. Tất cả 39 mục mới ghi `assistance` và chờ Tâm ký. [Nguồn Bún rạm](https://vnexpress.net/bun-ram-nuc-tieng-o-binh-dinh-3246635.html) |
| Quyền nguồn | 62/253 mô tả đã có xác nhận của Tâm. 13/187 URL đạt `team_authored_fact_reference`; 174 URL đang `needs_confirmation`. Tách nguồn chung thành nguồn cụ thể làm tăng thêm ba URL trong hàng chờ. |
| Candidate offline | `1.4.3`, SHA-256 `b6e882fc460544897ee226f165f46b718d235dbe3089a8771d50362c62060e04`. Checker đạt 32/33. Mục ảnh còn thiếu URL từ Storage. |
| Merge gate upstream | Checker chạy với `--gate merge --base-ref origin/main --verify-outputs` lúc 14:50 ICT trên main `6cd5e1a`, trả `READY_FOR_MERGE_REVIEW` cho đầu vào. PR ở draft trong lúc chờ các AC ảnh, mô tả và gói release có ảnh. |
| ZIP và receipt | So byte và SHA-256 của cả 238 tệp WebP. Receipt fixture từ chối 12 cặp chờ duyệt. Thử subset 107 cặp đã xác nhận, gắn đúng 107 UUID trên candidate giả lập `1.4.4`. |
| GM-03 QA với bundle offline | Ubuntu CI đọc đúng 253 thẻ, khớp SHA bundle trên merge ref kiểm thử `a2fb20a` của `3a74c0d` với `main` `6cd5e1a`. Import test-only, release đang active được giữ. QA local macOS dừng ở `QA_HOST_BINDING_NOT_LOOPBACK` và runner đã dọn stack thử. [Run và báo cáo](https://github.com/ThanhTris/IE307/actions/runs/45572366908) |
| QA có Storage thật | Chờ duyệt ảnh, bucket staging và lượt upload của Trí. |

### Danh sách ưu tiên tự chụp để Trí phân công

Giữ file gốc có EXIF máy ảnh và link xác nhận cho phép dùng, ghi tên người chụp vào hồ sơ ảnh. Hai món Mứt gừng và Bánh phồng tôm đã có ảnh chờ duyệt. Nếu ảnh Commons không được duyệt, bổ sung hai món này vào lượt tự chụp.

| Lô GM-41 | Món | Lý do đề xuất tự chụp |
| --- | --- | --- |
| baseline-72 | Dừa sấy | Commons có ảnh bao bì. Chụp dừa sấy đã lấy khỏi túi. |
| baseline-72 | Cháo lươn | Ảnh món đúng chỉ còn cạnh ngắn 477 px sau khi cắt. Chụp bát thấy thịt lươn. |
| baseline-72 | Nem chua rán | Ảnh món đúng 500 × 392 px. Chụp nem đã rán, không dùng nem chưa chiên. |
| baseline-72 | Cơm tôm rim | Ảnh đã thử chỉ thấy tôm rim. Chụp phần cơm và tôm đã rim trong cùng khung. |
| batch-01 | Bún quậy | Ảnh đã thử chủ yếu thấy bún trắng, nước chấm hoặc menu. Chụp tô có bún, chả và nước dùng. |
| batch-01 | Bún cá cay | Nguồn mô tả kiểu Hải Phòng. Ảnh tìm được thuộc biến thể Đông Hà. Chụp tô Hải Phòng thấy cá và nước dùng. |
| batch-02 | Bò bía mặn | Ảnh popiah chưa xác nhận được nhân theo kiểu Việt. Chụp cuốn mặn có thể thấy nhân. |
| batch-03 | Cơm niêu | Ảnh đã thử thấy niêu đóng nắp. Chụp niêu mở, thấy phần cơm. |
| batch-03 | Cháo cá | Ảnh miền Trung là bánh canh. Ảnh cháo cá lóc chủ yếu thấy nồi và bàn. Chụp bát cháo gạo có phần cá. |
| batch-04 | Lẩu dê | Ảnh theo tên quán chỉ thấy đường. Chụp nồi lẩu với phần dê thấy rõ. |
| batch-04 | Mì vịt tiềm | Tệp ảnh tìm được ghi vịt quay. Chụp tô mì với vịt đã tiềm. |
| batch-04 | Mì sủi cảo | Các ảnh đã thử ghi hoành thánh. Chụp tô mì có sủi cảo. |
| batch-05 | Cơm canh chua cá | Ảnh đã thử chỉ có canh chua. Chụp cả cơm và canh cá trong cùng khung. |
| batch-06 | Súp khoai lang | Ảnh tìm được là khoai miếng trong nước trong. Chụp súp khoai lang dạng sánh theo mô tả. |

Các món còn lại tiếp tục tìm theo `artwork-assignments.csv`. CSV bàn giao có nhóm món gốc và sáu lô GM-41.

## Cập nhật lựa chọn ảnh ngày 25/11/2026

- Trong đợt rà 181 món, Tâm đề xuất bỏ **Mứt gừng** (`18403411-7967-54cd-bd56-e897223c22d5`) và **Bánh phồng tôm** (`25ed8950-757a-5851-a8ff-12ae17f8d64a`). Cả hai được đánh dấu `release_exclusion_requested`. Bánh crepe ngọt vẫn là đề xuất riêng của đợt trước. Candidate QA `1.4.2` giữ 253 UUID trong khi chờ Trí quyết định.
- Tâm xác nhận các ảnh còn lại trong lượt rà. Đã ghi nhận 36 lựa chọn tương ứng với ảnh đầu tiên đã chuẩn bị trong hồ sơ, có tệp gốc, đúng món và đạt kiểm tra kích thước, dung lượng. Phần đối chiếu nguồn và giấy phép bằng công cụ được ghi riêng trong `aiCheck.assistance`. Với tám ảnh public domain, đã kiểm SHA-1 và mẫu công bố của tác giả trên Commons. Nui vẫn chờ ảnh có nước phù hợp.
- ZIP bàn giao có 107 ảnh chính và 107 ảnh nhỏ, tổng 13.074.184 byte ảnh. CSV còn 143 món cần ảnh, gồm Nui, và ba dòng đề xuất bỏ. Candidate offline `1.4.2` giữ SHA-256 `7ca0d2ef9bba03c4bee025f597c2c7bc52de580471d97f9ddcb12463188942d7`.

| Kiểm thử | Kết quả |
| --- | --- |
| Ngưỡng nếu Trí duyệt bỏ món | Bản sao bỏ hai món đợt này còn 251 món. Bản sao áp dụng cả đề xuất Bánh crepe ngọt còn 250 món. Cả hai đạt 32/33 mục, còn mục ảnh có URL hợp lệ. |
| Gói ảnh và receipt | Đã so 214 tệp WebP với metadata và tái tạo receipt bằng dữ liệu ZIP. Bản thử `1.4.3` gắn đúng 107/253 ảnh qua fixture, thiếu 146 món nếu giữ cả ba đề xuất trong danh mục. Supabase Storage thật chưa kiểm. |
| Kiểm thử và validator | 11 test GM-47 đạt. `validate_repository.py` và `task_readiness.py --check-docs` đạt. |

## Đối chiếu ảnh cho các món còn thiếu ngày 25/11/2026

- Tìm được 78 ảnh ứng viên cho 51/181 món. Đã tải và đối chiếu tệp gốc để tạo 49 ảnh chính thử. Có 38 ảnh cho thấy rõ món sau khi cắt. Các link tương ứng được ghi ở trạng thái `prepared_awaiting_selection` trong hồ sơ ảnh. Gói bàn giao vẫn có 71 cặp đã xác nhận. Cần đối chiếu bản xuất lựa chọn của Tâm để biết chính xác ảnh được chọn và món đề xuất bỏ.
- Tâm yêu cầu dùng ảnh nui có nước. Đã rút ảnh nui khô khỏi trang duyệt. Ảnh súp nui gà Việt Nam của HungryHuy là CC BY 2.0 nhưng tệp gốc 600 × 900 px chỉ cho ảnh cắt 4:3 tối đa 600 × 450 px. Ảnh nui nước kiểu Hong Kong của hamron là CC BY-SA 2.0, tệp gốc 1280 × 1280 px. Mục Nui giữ chờ Tâm xác nhận ảnh, chưa gắn URL vào bundle. [Ảnh nui gà Việt Nam](https://commons.wikimedia.org/wiki/File:Vietnamese_chicken_soup,_nui_ga.jpg) · [Ảnh nui nước kiểu Hong Kong](https://commons.wikimedia.org/wiki/File:Soup_Macaroni_in_Hong_Kong.jpg)

## Tâm xác nhận đợt rà ngày 25/11/2026

- Tâm xác nhận **71 cặp ảnh** còn lại và **62 mô tả** trong hồ sơ đã gửi. Thời điểm ghi nhận `2026-11-25T02:10:28Z`. Có 13/184 URL đủ xác nhận cho toàn bộ mô tả dùng URL đó. 171 URL còn chờ.
- Tâm yêu cầu bỏ hoặc thay **Bánh crepe ngọt** (`07f051a6-2a48-5b63-ac86-e56ddd4fb6c4`). Đã rút cả hai tệp ảnh của món khỏi ZIP. CSV của candidate đánh dấu riêng `release_exclusion_requested`. Có 181 món khác chưa có cặp ảnh hợp lệ.
- Chạy checker với bản sao QA loại riêng UUID crepe khỏi danh sách món. Còn 252 món (ngưỡng 250), đạt 32/33 mục. Mục ảnh vẫn thiếu URL Storage. Đây là phép kiểm ngưỡng cho đề xuất bỏ món. Trí chốt quyết định phát hành theo mục 5 của spec. Candidate 1.4.2 hiện vẫn có 253 món và cùng SHA-256.

## Sửa hồ sơ người kiểm và EXIF ngày 25/11/2026

Theo [review của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7140079834), 72 hồ sơ ảnh và 62 hồ sơ mô tả lưu phần kiểm bằng công cụ trong `assistance`. Các trường `checkedBy` và `checkedAt` chờ Tâm xem ảnh, trang nguồn hoặc từng câu mô tả rồi xác nhận. CSV hiện có 184 URL `needs_confirmation`, gồm 13 URL đã được công cụ đối chiếu toàn bộ. Máy không cấp trạng thái duyệt cho các URL này.

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Bánh crepe ngọt | Commons API và EXIF của JPEG gốc cùng trả `Make=HTC`. Trường `Model` trống. Đặt `cameraExif=true` và ghi căn cứ trong `provenance`. Kiểm lại 9 ảnh còn lại trước đó thiếu EXIF, không có Make hoặc Model. Tổng 63/72 ảnh có Make hoặc Model. [Trang nguồn](https://commons.wikimedia.org/wiki/File:Cr%C3%AApe_with_Strawberry_Ice_Cream.JPG) |
| Xác nhận ảnh | 72 cặp đã chuẩn bị, 0 cặp có xác nhận của người kiểm và 181 món chưa có ảnh. Đã kiểm bằng fixture rằng receipt có SHA đúng vẫn bị từ chối khi ảnh chưa có xác nhận. |
| Trạng thái nguồn dùng chung | Test một URL có nhiều món giữ `needs_confirmation` khi còn một món chưa được người kiểm xác nhận. Khi mọi món đã có tên người kiểm và thời điểm, URL mới chuyển sang `team_authored_fact_reference`. |
| Candidate QA | Bundle offline vẫn là `1.4.2` với SHA-256 `7ca0d2ef9bba03c4bee025f597c2c7bc52de580471d97f9ddcb12463188942d7`. Checker 32/33, còn mục ảnh. Merge gate phụ thuộc và artifact đạt lúc 08:46 ICT trên `origin/main` `6cd5e1a`. |

Mục bên dưới lưu kết quả của revision trước review. Các trạng thái nguồn và người kiểm của revision hiện tại nằm ở mục này.

## Rà nguồn và xác minh ảnh theo quyết định 25/11/2026

Candidate `1.4.2` có 253 mô tả, dùng SHA-256 `7ca0d2ef9bba03c4bee025f597c2c7bc52de580471d97f9ddcb12463188942d7`. Start gate đạt. Merge gate đối chiếu dependency và artifact trên `origin/main` `6cd5e1a` lúc 00:21 ICT. [Quyết định của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7138729659) · [Spec ảnh #218](https://github.com/ThanhTris/IE307/pull/218)

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Lời mô tả và quyền nguồn | Đối chiếu 62/253 mô tả theo URL và lưu dữ kiện, người kiểm, thời điểm cùng SHA của URL và câu đã rà. 13/184 URL đạt `team_authored_fact_reference`. 171 URL vẫn `needs_confirmation`, gồm 6 URL đã đối chiếu một phần. Bảng từng tên miền ở dưới ghi tình trạng v1.4.1 trước khi rà. |
| Quy tắc dùng làm tham chiếu | Trí chọn lời nhóm tự viết, dùng URL để đối chiếu dữ kiện. Với thương hiệu và video, chỉ giữ tên món và dữ kiện cơ bản. Nếu nguồn thiếu dữ kiện về cách nấu hoặc phục vụ, tìm nguồn thay hoặc để trạng thái chờ. `usageRights` của văn bản tại nguồn vẫn `unknown`. |
| Nguồn ảnh gốc | Đã xem 72 ảnh đã chuẩn bị và đối chiếu metadata tệp gốc trên Commons. 62 có EXIF máy ảnh, 10 có ghi chú xác minh bổ sung về tác giả và nguồn. Không phát hiện nhãn AI-generated trong danh mục hoặc template Commons của ảnh đã chọn. Công cụ từ chối bản ghi thiếu `aiCheck`, có nhãn AI hoặc ảnh nhóm tự chụp thiếu EXIF. |
| Chuối nếp nướng | Đã thay ảnh của Hồ Đức Hải do chưa xác minh được nguồn gốc. Dùng ảnh của Tri Nguyen chụp bằng Nikon D700 năm 2012, bản Commons được đối chiếu quyền từ Flickr. Bản cắt giữ dòng ghi công trong ảnh. [Ảnh và giấy phép CC BY 2.0](https://commons.wikimedia.org/wiki/File:A_chu%E1%BB%91i_n%C6%B0%E1%BB%9Bng_b%E1%BB%8Dc_n%E1%BA%BFp_(grilled_banana_wrapped_in_sticky_rice)_food_stand.jpg) |
| Gói ảnh bàn giao | Thêm Cơm chiên và Burger. Có 72 cặp, 144 tệp, 6.915.318 byte ảnh chính và 1.272.362 byte ảnh nhỏ. Còn 181 UUID trong `artwork-assignments.csv`. |
| Kiểm catalogue và QA | Checker đạt 32/33 mục ở candidate chưa gắn ảnh. Mục ảnh trong bundle 0/253. Readback ở revision mới lưu trong CI của PR #217. Readback sau khi gắn ảnh chờ upload và receipt Storage thật. |

## Rà theo review PR #217 ngày 24/11/2026

Candidate `1.4.1` có 253 mô tả dài 101–145 ký tự. Đã viết lại Gà nướng ống tre, Cơm trái dừa, Bánh bẻng, Phở cuốn và Kem dừa. Với Gà nướng ống tre, nguồn thay từ menu Hyatt sang bài ghi nhận cách ướp và nướng thực tế. SHA-256 của bundle `test_demo` là `c8a8f72e6c3a8edd1a113629c4544125f6eb78c6e45a27e27a13d5c43423e3a6`.

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Ảnh chính và ảnh danh sách | 70 cặp đã xem ảnh và kiểm license, tăng 7. ZIP có 140 tệp WebP gồm 6.811.824 byte ảnh chính và 1.252.426 byte ảnh nhỏ. Còn 183 UUID trong `artwork-assignments.csv`. |
| Ảnh cần nhóm tìm hoặc chụp | Bánh tráng nướng có ứng viên chỉ thấy quầy và nguyên liệu. Bánh phồng tôm có ứng viên chưa chiên. Hai món được ghi riêng trong danh sách với lý do và URL. Gà nướng ống tre và Bánh bẻng cũng chưa có ảnh đã chọn. Không dùng ảnh món tương tự. |
| Kiểm catalogue | 32/33 mục đạt trên 1.4.1. Mô tả 253/253 và ảnh đã gắn URL 0/253. 7 ca GM-47, validator, task indexes và diff đều đạt. |
| GM-03 QA | QA macOS dừng ở `QA_HOST_BINDING_NOT_LOOPBACK` và đã dọn dự án thử. Readback 1.4.1 cần lượt CI trên Linux. Readback bản đã gắn Storage chờ Trí xác nhận upload. |
| Gate phụ thuộc và artifact | `READY_FOR_MERGE_REVIEW` lúc 23:55 ICT trên `origin/main` `d9332f7`. GM-47 In Progress trên Project. [Review revision trước](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7138221361) |

### Đề xuất cho Trí về quyền dùng nguồn mô tả

`description-rights-review.csv` liệt kê 184 URL thuộc 61 tên miền cho 253 UUID. Tất cả vẫn `needs_confirmation`. Bảng ghi kết quả đối chiếu những mẫu đã mở và đề xuất xử lý các nguồn còn lại. Với các dòng chưa đối chiếu, mới có bản tóm tắt từ repo. Chưa xác định được độ sát nguyên văn hay quyền tái sử dụng ở từng URL.

| Tên miền | Mô tả / URL | Cách viết và mức đối chiếu | Rủi ro | Đề xuất |
| --- | ---: | --- | --- | --- |
| `vnexpress.net` | 82 / 67 | Mẫu Cơm trái dừa đã viết lại từ dữ kiện về cách hấp và món dọn kèm. Các URL khác chưa đối chiếu từng câu. | Cao. Báo yêu cầu chấp thuận bằng văn bản khi tái sử dụng nội dung vì mục đích thương mại. Bài mẫu còn dẫn nguồn khác. [Điều khoản](https://vnexpress.net/dieu-khoan-su-dung) | Giữ câu tự viết có dữ kiện đối chiếu được sau khi Trí duyệt. Thay nguồn khi nội dung sát câu báo hoặc nguồn chỉ dẫn lại. |
| `vietnam.travel` | 26 / 6 | Mẫu Kem dừa đã viết lại, giữ cách dọn và đồ ăn kèm đã đối chiếu. Chưa đối chiếu từng câu của các món còn lại. | Cao. Điều khoản giới hạn việc dùng nội dung của cổng và đối tác. [Điều khoản](https://vietnam.travel/term-conditions/) | Ưu tiên nguồn có giấy phép hoặc ghi nhận của nhóm. Giữ câu tự viết khi Trí chốt căn cứ. |
| `food.be.com.vn` | 23 / 13 | Mẫu Mận Hà Nội chua ngọt dùng diễn đạt riêng. Menu có tên món và muối chấm. Trang Cơm cá chiên chưa mở được trong lượt rà. | Cao. Điều khoản BeFood phân biệt tư liệu Be và tư liệu thương nhân. Chưa có chấp thuận của bên sở hữu cho app. [Điều khoản](https://be.com.vn/uncategorized/cac-dieu-khoan-va-dieu-kien-chung-ve-dich-vu-tmdt-tren-san-giao-dich-tmdt-be-ap-dung-doi-voi-thuong-nhan-befood/) | Giữ dữ kiện tên món khi có xác nhận. Thay nguồn hoặc khảo sát trực tiếp cho mô tả về chế biến và phục vụ. |
| `ngoisao.vnexpress.net` | 16 / 10 | Mẫu Bánh bẻng đã viết lại theo cách ăn. Các URL khác chưa đối chiếu từng câu. | Cao. Bài mẫu là bài biên tập có tác giả và ảnh ghi công. Chưa có xác nhận áp dụng điều khoản cho tên miền con. [Bài đối chiếu](https://ngoisao.vnexpress.net/me-cung-am-thuc-o-hai-phong-4722239.html) | Giữ dữ kiện về món nếu Trí duyệt. Viết lại nếu bám phép so sánh hoặc cách diễn đạt của tác giả. |
| `govietnam.travel` | 8 / 7 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `www.vietnam.travel` | 8 / 3 | Mẫu Phở cuốn đã viết lại theo thành phần của một phiên bản được mô tả. URL mẫu chuyển đến vietnam.travel. | Cao. Điều khoản của cổng cũng nêu tên miền con. [Bài đối chiếu](https://vietnam.travel/vi/things-to-do/10-delicious-vietnamese-rolls/) | Ưu tiên nguồn có giấy phép hoặc ghi nhận của nhóm. Giữ câu tự viết khi Trí chốt căn cứ. |
| `www.hyatt.com` | 7 / 2 | Các mô tả dạng tóm tắt theo tên món. Một PDF mẫu mở được nhưng lớp text chỉ hiện tiêu đề nhiều mục. Chưa đối chiếu từng món trong PDF. | Cao. Menu khách sạn là tư liệu thương hiệu. Nội dung còn tùy khách sạn và thực đơn. [Điều khoản Hyatt](https://portal.wifi.hyatt.com/11811b27-d9b8-4def-8220-4a076c1b5863/terms.html) | Kiểm tên và thành phần trực tiếp trên menu. Thay nguồn cho nhận định ngoài menu, như đã làm với Gà nướng ống tre. |
| `cookpad.com` | 6 / 6 | Mô tả dạng tự viết. Hai URL mẫu Cơm mực rim mắm và Salad chưa đọc được để kiểm độ sát. | Cao. Điều khoản phân biệt công thức của người đăng với tư liệu nền tảng. Chưa có xác nhận từ người đăng. [Điều khoản](https://cookpad.com/vn/dieu-khoan) | Thay bằng nguồn công thức có quyền phù hợp hoặc ghi nhận do nhóm thực hiện. Tránh dùng bước nấu và lời giới thiệu của tác giả. |
| `www.hisaigonairport.com` | 4 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `haisanpho.com.vn` | 3 / 3 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `monngonmoingay.com` | 3 / 3 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `vietnamesecookbook.com` | 3 / 3 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `vinhyencitycentre.crowneplaza.com` | 3 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `www.vietnamtourism.com` | 3 / 3 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `antoanthucpham.hanoi.gov.vn` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `baoangiang.com.vn` | 2 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `dinhduong2598.food` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `helenrecipes.com` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `thanhnien.vn` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `trangiafoods.vn` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `vtcnews.vn` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `www.aciar.gov.au` | 2 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `www.dienmayxanh.com` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.kingarthurbaking.com` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.youtube.com` | 2 / 2 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Video có người đăng và quyền riêng đối với lời thoại, phụ đề và hình. | Thay bằng nguồn tài liệu kiểm được hoặc ghi nhận của nhóm. Tránh dùng lời thoại và ảnh cắt từ video. |
| `amthucdinhduong.com.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `baosoctrang.org.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `bepkom9.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `bundaumamtomtienhai.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `cookbeo.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `cooponline.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `dalat.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `file.hstatic.net` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `haiphong.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `hcdc.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `huetourism.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `huongdantapluyen.tdtt.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `kobelab.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `medialib.qlgd.edu.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `mnhoamoclan.hanoi.edu.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Tài liệu công khai có thể có tác giả hoặc ấn bản riêng. Chưa xác nhận quyền ở từng URL. | Kiểm phần ghi quyền của chính tài liệu trước khi giữ. Chỉ lấy dữ kiện có dẫn chứng, viết lại cách diễn đạt. |
| `naungon.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `nhahangcomviet.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `nhahanghonghanh.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `nonglamfood.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `nongthon.vietnamtourism.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `pburgerhoian.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Menu hoặc trang của nhà hàng. Cách phục vụ có thể chỉ đúng cho nhà hàng. | Giữ tên món đã đối chiếu. Tìm nguồn khác hoặc xác nhận trực tiếp cho phần mô tả ngoài menu. |
| `saiko.com.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `scov.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `suckhoedoisong.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `tteokbokki.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `vietnamnet.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `vietnamtourism.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `visitnghean.gov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |
| `vntravel.org.vn` | 1 / 1 | Đã đối chiếu Gà nướng ống tre với bài phỏng vấn người bán. Mô tả mới viết lại chi tiết ướp và cách xoay ống khi nướng. | Chờ xác nhận. Ghi nhận từ cách làm tại một quầy. Chưa có căn cứ tái sử dụng văn bản bài báo. [Bài đối chiếu](https://vntravel.org.vn/doc-dao-mon-ga-nuong-trong-ong-tre-khungtai-tphcm-a2701.html) | Giữ bản tự viết khi Trí chấp nhận phạm vi dữ kiện. Dùng ghi nhận của nhóm nếu cần thay nguồn. |
| `vov.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài biên tập. Câu chữ và ảnh có thể thuộc báo, tác giả hoặc bên được dẫn lại. | Đối chiếu từng câu. Chỉ đề xuất giữ đoạn tự viết từ dữ kiện và tìm nguồn thay cho đoạn sát bài. |
| `vove.com.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.angingon.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.barilla.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.lifood.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.unileverfoodsolutions.com.vn` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Công thức, bài giới thiệu hoặc nội dung sản phẩm có tác giả. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện với công thức. Giữ câu tự viết nếu có căn cứ phù hợp, thay nguồn hoặc viết lại khi sát lời nguồn. |
| `www.vietnamairlines.com` | 1 / 1 | Tóm tắt biên tập. Chưa đối chiếu từng câu. | Bài giới thiệu du lịch có thể tổng hợp tư liệu của bên khác. Chưa xác nhận quyền ở từng URL. | Đối chiếu dữ kiện theo vùng. Giữ đề xuất tự viết sau duyệt hoặc đổi sang nguồn mở. |

## Lô release v1 ngày 24/11/2026

Nhánh `codex/gm-47-release-editorial` đã cập nhật theo `origin/main` tại `d9332f7` và giữ [GM-41 #210](https://github.com/ThanhTris/IE307/pull/210) làm đầu vào dữ liệu. Checker merge trả `READY_FOR_MERGE_REVIEW` lúc 23:28 ICT cho dependency và artifact. Các AC còn thiếu được ghi theo [review của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7133694276).

| Kiểm thử | Kết quả và bằng chứng |
| --- | --- |
| Baseline 1.3.0 và biên tập mô tả | Pass. Dựng lại GM-41 khớp artifact đã merge. 253/253 mô tả dài 101–145 ký tự, khớp UUID và có URL/evidence. Gộp 72 UUID đã soạn và 181 UUID mới. |
| Projection offline | Pass. Cùng 253 ID, chỉ trường mô tả trên card thay đổi, projection thử qua schema poolDish B-supplement đạt. Chưa chạy room/API. |
| Ảnh chính và ảnh danh sách | 63 cặp WebP, tăng 11 món. 126 tệp đối chiếu định dạng, kích thước và SHA. Ảnh chính 6.127.352 byte, ảnh nhỏ 400×300 px 1.137.086 byte. [Hồ sơ ảnh](../../../../data-preparation/editorial/gm47-release/artwork-candidates.json). |
| Danh sách chia lô | 190 UUID chưa có ảnh, tách nhóm baseline và sáu lô GM-41. ZIP chứa `artwork-assignments.csv`. |
| Release catalogue checker | 32/33 mục Pass, gồm mô tả 253/253. Mục ảnh Fail 0/253 trong bundle vì ảnh chưa được tải lên bucket và gắn URL. |
| PostgreSQL import/readback | Pass trên PostgreSQL 17.11 cô lập, không mở mạng/cổng. Dùng DDL catalogue từ migration 0026 và helper UUID từ 0019. Cùng SQL importer đọc lại đúng 253 thẻ và hash, chạy lại không tạo bản trùng, giữ nguyên bản active. [Kết quả SQL](qa-sql-readback-1.4.0.json). |
| Supabase GM-03 QA | Pass với candidate 1.4.0 chưa gắn ảnh, đúng 253 thẻ và hash, giữ nguyên bản active. [Evidence JSON](qa-supabase-readback-1.4.0.json) và [lượt CI đầu của PR #217](https://github.com/ThanhTris/IE307/actions/runs/45330545230). Còn lượt kiểm trên bản đã gắn ảnh. |
| Kiểm receipt và gắn URL | Unit với bucket giả lập pass. Gắn đúng một cặp đã khớp hash, lưu URL nhỏ riêng, từ chối SHA sai. Phép kiểm công khai trên bucket thật chờ Trí cung cấp URL và xác nhận upload. |
| Quyền dùng nguồn và ghi công | Báo cáo `description-rights-review.csv` gom 183 URL và 253 UUID để xác nhận quyền dùng. Hiện 183 nguồn cần xác nhận, chưa có nguồn được đánh dấu duyệt production. Ưu tiên rà 98 mô tả có nguồn VnExpress/Ngôi Sao, 34 mô tả Vietnam Tourism và 23 mô tả từ beFood. Nếu không có căn cứ dùng, thay nguồn và viết lại các UUID liên quan. [Điều khoản VnExpress](https://vnexpress.net/dieu-khoan-su-dung) · [Điều khoản Vietnam Tourism](https://vietnam.travel/term-conditions/) |

Candidate `1.4.0`, `test_demo`, SHA-256 `b92534ad67f996e7d2d40424eac33ea7850ab8ed8f5ab844441466a48f23c95d`. 7 ca riêng GM-47 pass. Validator repo, task indexes và diff đạt.

## Lô ngày 20/11/2026

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `origin/main` tại `10651dd`; GM-40 đã Done và đầu ra đã có.

| Ca | Kỳ vọng và bằng chứng | Kết quả |
| --- | --- | --- |
| Mô tả theo UUID | 5 mô tả có nguồn riêng, các UUID, taxonomy, ảnh null và giá giữ đúng GM-41 | Pass. Test overlay, schema và kiểm baseline hash. |
| Quyền ảnh | Ảnh chỉ có khi có bằng chứng đúng món, tác giả, license và ghi công | 0 ảnh chọn. 7 món còn ứng viên cần dò ảnh gốc, 29 lỗi nguồn, 36 thiếu ứng viên. |
| Độ phủ theo bữa | Báo cáo bundle 1.2.1 có 72 món và số ảnh từng bữa | Pass offline, xem hồ sơ Data. |
| Readback QA | 72 cards, chỉ 5 mô tả khác, hash khớp, trạng thái test-only và bản active giữ nguyên | Pass trên Supabase QA cô lập (Ubuntu). [JSON readback](qa-readback.json), [Actions](https://github.com/ThanhTris/IE307/actions/runs/44774484392). |

Actions chạy trên merge ref `1a4df7f` của base `10651dd` và head `af685b6`. Bản cập nhật hồ sơ sau đó chỉ thay evidence và không đổi code hoặc input đã kiểm. Lần chạy macOS dừng ở bước xác minh cổng loopback và đã cleanup.

`python -m unittest discover -s tests -p 'test_gm47_catalogue.py'` chạy 2 ca đạt. Regression cục bộ chạy 722 ca, gồm 6 ca skip theo môi trường. [CI toàn repo](https://github.com/ThanhTris/IE307/actions/runs/44774485063) và [Handoff](HANDOFF.md).
