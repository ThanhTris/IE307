# GM-47 · Tám ảnh xác nhận qua chat và lượt tìm tiếp 87 món

Tâm xác nhận cả tám ảnh trong trang duyệt trước. [Biên nhận xác nhận qua chat](photo-p1-chat-approval-2026-11-28.json)
lưu nguyên lời xác nhận và SHA của từng ảnh trong trang đã xem. Thuộc sáu món
P1 và hai món P2 được chọn trong nhóm đang thiếu. ZIP gộp cả ba ảnh đợt trước
và tám ảnh đợt này, có 11 ảnh chính, 11 thumbnail, hồ sơ nguồn và ghi công.

## QA và bàn giao

- Bản `1.4.7` dựng bằng receipt fixture trên nhánh `codex/gm-47-photo-coverage`,
  base `365f965`. SHA QA
  `68a6108f4322c904851f2eb3375dd641f11c6e627b355d0a89e2fc05774b4a99`.
  Overlay gộp 11 ảnh, giữ bản dữ liệu gốc đã merge.
- 253 món có 147 ảnh chụp và 106 minh họa. Checker cơ bản đạt 33/33.
  Checker `--require-photo-ratio` còn 15 kiểm chưa đạt. 16 test GM-47 đạt,
  gồm ca trang ảnh Pexels và Flickr USDA phải khớp đúng tệp.
- Trí cần tải 11 ảnh chính vào gốc bucket và 11 thumbnail vào `thumbnails/`
  từ gói cục bộ `.work/gm47-release-editorial/photo-remaining-20261128/GM-47-anh-da-duyet-11-mon.zip`.
  SHA-256 của ZIP là `7c074eec6db7bf5b85a5182a3662755a6c0ae6e3b822e29355ef72c2b4d61425`.
  Dùng lệnh tại [hướng dẫn lô trước](PHOTO_FOLLOWUP_2026-11-28.md), thay
  `--candidate-version 1.4.7` và
  `--photo-additions data-preparation/editorial/gm47-release/photo-additions-batch2-2026-11-28.json`.
  Receipt công khai và readback DB của lô này còn chờ.

## Lượt tìm tiếp

Đã tra thêm cả 87 tên món theo từng lô trên trang tìm kiếm công khai, tìm
biến thể tên địa phương và đối chiếu một số bộ dữ liệu nghiên cứu. Lưu truy
vấn và URL trả về tại `.work/gm47-release-editorial/photo-remaining-20261128/web-search-batches.json`.


| Món hoặc nhóm | Đầu mối đã kiểm |
| --- | --- |
| Cơm cháy chà bông | Ảnh đúng món của Tùng Mai Minh trên Flickr giữ toàn bộ bản quyền. [Trang ảnh](https://www.flickr.com/photos/21122673%40N08/21282329928/) |
| Ốc luộc | Ảnh ốc luộc sả đúng kiểu chuẩn bị, Flickr ghi giữ toàn bộ bản quyền. [Trang ảnh](https://www.flickr.com/photos/wanderingchopsticks/4410528500/) |
| Ốc hương hấp sả | Ảnh Commons CC BY-SA 4.0 ghi ốc hương, cần bằng chứng món được hấp sả. [Trang ảnh](https://commons.wikimedia.org/wiki/File:PQ_2022,_Khu_ND_Vin-P%C6%A1n_(%C4%91%E1%BB%93_%C4%83n,_d%C4%A9a_%E1%BB%91c_h%C6%B0%C6%A1ng,_b%E1%BB%AFa_%C4%83n_t%E1%BB%91i)_(1).jpg) |
| Bánh ram ít | Ảnh đúng món ở Huế; chủ ảnh giữ toàn bộ quyền. [Trang ảnh](https://www.flickr.com/photos/180degreeswest/8581057681/) |
| Bún gạo xào | Ảnh CC BY 2.0 chụp bún gạo xào kiểu Nhật. Cần ảnh khớp với mục món Việt. [Trang ảnh](https://commons.wikimedia.org/wiki/File:Stir_fried_rice_vermicelli,_chicken_breast,_and_vegetables_%E9%B6%8F%E8%83%B8%E8%82%89%E3%81%A8%E9%87%8E%E8%8F%9C%E3%81%9F%E3%81%A3%E3%81%B7%E3%82%8A%E7%84%BC%E3%81%8D%E3%83%93%E3%83%BC%E3%83%95%E3%83%B3.jpg) |
| Bò bía mặn | Ảnh CC BY-SA 4.0 chụp popiah Malaysia. Chưa xác nhận biến thể nhân của catalogue. [Trang ảnh](https://commons.wikimedia.org/wiki/File:FRESH_SPRING_ROLLS_(POPIAH).jpg) |
| Lẩu mắm, lẩu vịt nấu chao, bánh tằm bì, bún kèn | SWVie-Food có các lớp liên quan, ảnh thu nhỏ về 416 × 416 và chưa có hồ sơ quyền cho từng ảnh gốc. [Bài báo SWVie-Food](https://sj.ctu.edu.vn/ql/docgia/tacgia-41453/baibao-82857.html) |

Chưa có thêm ảnh web đủ điều kiện sau lượt tìm này. [Danh sách 87 món còn lại](photo-p1-remaining-2026-11-28.csv)
giữ UUID, nhóm, mô tả để chụp, đường dẫn nhận diện và ghi chú quyền. Dùng danh
sách để chia việc tự chụp hoặc xin quyền trực tiếp từ người sở hữu ảnh. GM-47
vẫn cần đạt giới hạn tối đa 10% minh họa toàn bộ và theo từng nhóm.
