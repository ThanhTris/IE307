# GM-47 · Kết quả rà 93 món ưu tiên ngày 28/11/2026

Đối chiếu cả 93 UUID P1 còn lại sau lô ba ảnh đã được Tâm duyệt. Tìm được
**6 ứng viên P1** và **2 ứng viên P2** có thể bù vào cùng nhóm. 87 mục P1
chưa có ảnh đủ bằng chứng trong lượt này. [Danh sách rà và mô tả để chụp](photo-p1-audit-2026-11-28.csv)
· [Số liệu theo nhóm](photo-p1-summary-2026-11-28.json).

| Món đang chờ Tâm duyệt | Nguồn và căn cứ |
| --- | --- |
| Bún quậy | [Commons, Phương Huy, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:B%C3%BAn_qu%E1%BA%ADy_%E1%BB%9F_qu%C3%A1n_Qu%C3%AA_T%C3%B4i_ng%C3%A0y_15_th%C3%A1ng_10_n%C4%83m_2018_(1).jpg) |
| Bún cá cay | [Commons, Phương Huy, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Nh%C3%A0_m%C3%ACnh_d%E1%BB%8Bp_L%E1%BB%85_2th9n2023_(b%C3%BAn_c%C3%A1_cay_%C4%90%C3%B4ng_H%C3%A0)_(2).jpg). Cần đối chiếu biến thể Đông Hà với mô tả kiểu Hải Phòng. |
| Gà nướng lá chanh | [Commons, Phương Huy, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:V%C3%B9ng_C%C3%B9a_%E1%BB%9F_Cam_L%E1%BB%99_th5n2023-Ph%C6%B0%C6%A1ng_Gia_Trang_(x%C3%B4i_hoa_c%C3%BAc_v%E1%BB%9Bi_g%C3%A0_C%C3%B9a_n%C6%B0%E1%BB%9Bng_l%C3%A1_chanh)_(4).jpg) |
| Bánh ít ngọt | [Commons, Badagnani, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Banhit.jpg). Bánh còn gói lá, đối chiếu phần nhân qua mô tả của tác giả. |
| Lẩu bò Tứ Xuyên | [Commons, Jason M. C., Han, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Special_foods_%26_cuisines_in_Chongqing_-_Family_Dinner_2nd.jpg). Tác giả ghi lẩu Trùng Khánh và phần bò ăn kèm. |
| Cơm canh khổ qua | [Flickr USDA, ảnh Food and Nutrition Service, Public Domain Work](https://www.flickr.com/photos/usdagov/54093424635/). Có canh và cơm trong cùng khung. |
| Mì sủi cảo (P2) | [Commons, NeoBatfreak, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Spring_soup_dumpling_noodles_(%E9%99%BD%E6%98%A5%E6%B9%AF%E9%A4%83%E9%BA%B5).jpg). Có thể bù nhóm Mì / Miến / Hủ tiếu. |
| Ức gà nướng thảo mộc (P2) | [Pexels, Loren Castillo](https://www.pexels.com/photo/cooking-chicken-with-herbs-9219082/) · [Pexels License](https://www.pexels.com/license/). Có thể bù nhóm Lẩu & Nướng. |

## Độ phủ theo nhóm

Bảng lấy 139 ảnh chụp trên bản QA `1.4.6` làm mốc. Cột dự kiến chỉ tính
khi Tâm duyệt từng ảnh và ảnh lên Storage. Nếu duyệt đủ thì cả bộ có
147 ảnh chụp, 106 minh họa, vẫn vượt giới hạn 25 minh họa.

| Nhóm | Thiếu ảnh chụp trên QA hiện tại | Thiếu nếu duyệt cả 8 ảnh | Giới hạn thiếu | Cần thêm nếu duyệt cả 8 ảnh |
| --- | ---: | ---: | ---: | ---: |
| Lẩu & Nướng | 22 | 19 | 3 | 16 |
| Cơm | 18 | 17 | 2 | 15 |
| Ốc & Hải sản | 9 | 9 | 1 | 8 |
| Bún / Phở | 11 | 9 | 2 | 7 |
| Đồ ăn vặt khô | 8 | 8 | 1 | 7 |
| Mì / Miến / Hủ tiếu | 9 | 8 | 2 | 6 |
| Chè & Kem | 7 | 7 | 1 | 6 |
| Trái cây & Đồ chua | 7 | 7 | 1 | 6 |
| Cháo / Súp | 7 | 7 | 2 | 5 |
| Món trộn & Cuốn | 6 | 6 | 1 | 5 |
| Đồ chiên & Xiên que | 4 | 4 | 1 | 3 |
| Bánh mì / Xôi | 3 | 3 | 1 | 2 |
| Các loại bánh mặn | 3 | 3 | 2 | 1 |
| Bánh ngọt | 3 | 2 | 1 | 1 |

Một món có thể xuất hiện ở nhiều nhóm. Dùng UUID để tính số ảnh cần chụp và
đối chiếu lại bằng `--require-photo-ratio` trên bundle có receipt thật sau upload.

## Rà nguồn và bàn giao

- Rà tên tiếng Việt và biến thể tên tiếng Anh trên Openverse với bộ lọc
  cho phép dùng thương mại, chỉnh sửa. Đối chiếu thêm Commons theo danh mục,
  trang ảnh gốc Flickr, tìm kiếm web và Pexels. Commons giới hạn HTTP 429
  ở nhiều truy vấn theo tên. CSV ghi mã phản hồi để phân biệt truy vấn bị
  giới hạn với trang đã mở. Mở được 86 trang tham khảo. Các trang tham khảo
  cần bằng chứng quyền cho đúng tệp ảnh trước khi dùng.
- Cơm cháy chà bông có kết quả Openverse trỏ tới trang đã trả 404.
  Bún bò chay bị loại do watermark khác tác giả và ảnh nhỏ.
  Bánh mì cà ri gà và đậu hũ ky cuộn tôm có ảnh đúng món nhưng chưa tìm được
  bản cùng ảnh có cạnh ngắn từ 600 px từ tác giả.
- Gói cục bộ `.work/gm47-release-editorial/photo-p1-20261128/GM-47-P1-ho-so-anh.zip`
  chứa ảnh WebP 4:3, cạnh ngắn từ 600 px, bản nhỏ 400 × 300, SHA từng tệp,
  hồ sơ nguồn/giấy phép và trang duyệt. Đã mở trang duyệt cục bộ và kiểm đủ
  tám ảnh hiển thị, mọi lựa chọn ban đầu để trống. Bảy ứng viên có ảnh chụp
  phần giấy phép. Ứng viên Pexels lưu trang ảnh, trang license và metadata
  nguồn trong hồ sơ vì Chrome headless chưa chụp được phần giấy phép.
  Ảnh ở trạng thái chờ duyệt. Bản kiểm
  Flickr hiện mới nhận CC BY/CC BY-SA. USDA Public Domain Work và Pexels cần
  bổ sung kiểm hợp lệ trong importer nếu Tâm chọn hai ảnh đó.
- Dùng CSV để chia 87 mục P1 đang thiếu đầu mối ảnh hợp lệ. Các dòng có mô tả
  món và trang tham khảo để chụp hoặc xin xác nhận bằng văn bản từ chủ ảnh.
  Món cơm cần có cơm và món ăn kèm cùng khung. Khi tự chụp, nộp bản gốc có
  EXIF, UUID, tác giả và xác nhận cho phép dùng, cắt và nén trong ứng dụng.
