# GM-47 · Kiểm thử

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
