# Độ phủ dữ liệu cho bộ lọc khẩu vị

Sinh bởi `python scripts/dish_filter_coverage.py` từ `supabase/seed/catalogue/release-v1/dishes.json` (dataset 1.3.0, test_demo). Không sửa tay; chạy lại script sau khi dữ liệu đổi.

## Tổng quan

| Trường | Có dữ liệu | Bộ lọc dùng |
|---|---|---|
| Nhóm món (bữa chính) | 142/253 (56%) | Loại món |
| Nhóm món (Ăn vặt) | 111/253 (44%) | Loại món khi chọn Ăn vặt |
| Miền | 122/253 (48%) | Ẩm thực |
| `flavor` (ít nhất 1 vị đã biết) | 96/253 (38%) | Hương vị |
| Béo / Ngậy (`flavor.fatty`) | 20/253 (8%) | Hương vị |
| `mealSlots` | 253/253 (100%) | Chọn pool theo bữa |
| `temperature` | 36/253 (14%) | Thẻ món |
| Giá quan sát | 137/253 (54%) | Thẻ món |
| Ảnh có quyền dùng | 0/253 (0%) | Thẻ món |

Số món theo bữa: sáng 68, trưa 100, tối 72, ăn vặt 114. Ngưỡng bản lên store xem [đặc tả release v1](RELEASE_V1_CATALOGUE_SPEC.md).

## Món theo từng mục lọc

| Mục | Số món | Món |
|---|---|---|
| Bữa chính · Cơm | 28 | Cơm cá chiên, Cơm trái dừa, Cơm thịt xào mắm ruốc, Cơm mực rim mắm, Cơm niêu, Cơm chay, Cơm lam gà nướng, Cơm sườn, Cơm gà kho sả ớt, Cơm canh chua cá, Cơm bò, Cơm đậu hủ sốt cà, Cơm cuộn Hàn Quốc, Cơm hến, Cơm thịt kho, Cơm gà, Cơm lươn xào sả ớt, Cơm mắm kho, Cơm trộn, Cơm chiên, Cơm canh gà lá giang, Cơm tôm rim, Cơm canh sườn hầm bí đỏ, Cơm cá kho, Cơm canh khổ qua, Cơm tấm, Cơm canh sườn hầm đu đủ, Cơm hạt sen |
| Bữa chính · Bún / Phở | 27 | Phở bò, Phở chay, Bún tôm Bình Định, Bún rạm, Phở gà, Bún mắm, Bún thịt nướng, Bún mọc, Bún chay, Bún chả cá, Bún bung, Bún riêu, Bún cá Châu Đốc, Bún gạo lứt, Bún chả, Bún nước lèo, Phở hải sản, Bún quậy, Bún thang, Bún đậu, Bún ốc, Bún riêu chay, Bún nem nướng, Bún kèn, Bún cá cay, Bún bò chay, Bún bò |
| Bữa chính · Mì / Miến / Hủ tiếu | 22 | Bánh đa cua, Bánh canh, Bánh tằm bì, Bánh đa cá, Bánh hỏi lòng heo, Mì trộn, Bún gạo xào, Mì Quảng, Hủ tiếu sa tế, Hủ tiếu mực, Mì, Mì vằn thắn, Mì udon xào, Mì vịt tiềm, Nui, Mì Ý, Mì sủi cảo, Miến, Hủ tiếu, Mì lá đút lò, Bánh canh ghẹ, Hủ tiếu bò kho |
| Bữa chính · Lẩu & Nướng | 35 | Lẩu cá linh điên điển, Lẩu bò sa tế, Gà nướng ống tre, Lẩu gà lá giang, Lẩu cua đồng, Cơm lam gà nướng, Ốc nướng tiêu, Nhum biển nướng, Bún thịt nướng, Lẩu gà ớt hiểm, Gà nướng lá chúc, Gà nướng lá chanh, Lẩu cá kèo, Lẩu cá điêu hồng, Sườn nướng BBQ, Cá sòng nướng, Lẩu dê, Bún chả, Sò dương nướng, Lẩu mắm, Lẩu bò Tứ Xuyên, Cá lóc nướng trui, Lẩu cá thác lác khổ qua, Lẩu vịt nấu chao, Ức gà nướng thảo mộc, Mực nướng muối ớt, Lẩu gà lá é, Thăn bò nướng, Tôm hùm nướng, Cá hồi nướng, Bún nem nướng, Lẩu ếch, Lẩu Thái, Lẩu nấm, Cá tầm nướng |
| Bữa chính · Bánh mì / Xôi | 13 | Bánh mì, Xôi, Bánh mì cà ri gà, Bánh mì xíu mại, Bò né, Bánh mì chảo, Burger, Bánh mì que, Bánh mì lagu, Bánh mì bò sốt vang, Xôi xéo, Bánh mì gối, Sandwich gà |
| Bữa chính · Cháo / Súp | 21 | Súp bí đỏ, Cháo bò Tri Tôn, Súp bồ câu tứ thần, Súp kem nấm, Súp khoai lang, Cháo lươn, Cháo gà, Cháo lòng, Cháo trai, Súp hoành thánh, Súp gà đậu ván ý dĩ, Súp gà bắp, Súp tôm, Cháo trắng, Cháo hải sản, Cháo thịt bò cải bó xôi, Cháo yến mạch, Cháo sườn, Súp cua, Cháo Tiều, Cháo cá |
| Ăn vặt · Đồ chiên & Xiên que | 19 | Bánh bẻng, Bánh cống, Cánh gà chiên nước mắm, Nem cua bể, Bánh cam, Bánh ram ít, Bánh bột củ cải chiên, Đậu hũ ky cuộn tôm, Bánh chuối chiên, Bột chiên, Bánh gối, Nem lụi, Bánh khoái, Nem chua rán, Bánh tôm, Chả giò, Hoành thánh chiên, Bánh hẹ chiên, Bánh áp chao |
| Ăn vặt · Các loại bánh mặn | 22 | Bánh cống, Bánh tráng nướng, Bánh ép, Bánh cuộn, Bánh bột lọc, Xíu mại hấp, Bánh ướt, Bánh xèo, Há cảo, Bánh bao, Bánh ram ít, Bánh cuốn, Bánh bèo, Bánh khọt, Bánh bột củ cải chiên, Bánh gối, Bánh khoái, Bánh đúc tàu, Bánh tôm, Bánh hẹ chiên, Bánh áp chao, Bánh nậm |
| Ăn vặt · Món trộn & Cuốn | 12 | Phở cuốn, Gỏi cuốn, Salad, Bò bía mặn, Nem cua bể, Bánh tráng trộn, Nộm bò khô, Đậu hũ ky cuộn tôm, Nem lụi, Bò bía ngọt, Gỏi xoài tôm khô, Chả giò |
| Ăn vặt · Ốc & Hải sản | 12 | Ốc móng tay xào bơ tỏi, Ốc hương hấp sả, Giá bể xào, Ốc tỏi nướng muối ớt, Bạch tuộc nướng, Sò lông nướng mỡ hành, Hàu nướng mỡ hành, Ốc giác cà ri, Ốc luộc, Ốc len xào dừa, Càng ghẹ rang me, Nghêu hấp Thái |
| Ăn vặt · Bánh ngọt | 17 | Sủi dìn, Bánh crepe ngọt, Bánh trôi tàu, Bánh sừng bò, Chuối nếp nướng, Bánh đa kê, Bánh cam, Bánh bò, Bánh pía, Caramen hoa quả, Bánh chuối chiên, Bánh đậu xanh, Bánh muffin, Bánh ít ngọt, Bánh bông lan, Bánh su kem, Bánh da lợn |
| Ăn vặt · Chè & Kem | 16 | Kem dừa, Chè bưởi, Chè khúc bạch, Chè bột lọc heo quay, Chè bắp, Chè đỗ đen, Chè sen long nhãn, Chè chuối, Kem bơ, Tàu hũ đá sầu riêng, Sữa chua nếp cẩm, Kem xôi, Dừa dầm, Chè sương sa hạt lựu, Chè ba màu, Chè trôi nước |
| Ăn vặt · Trái cây & Đồ chua | 11 | Mận Hà Nội chua ngọt, Trái cây trộn muối ớt, Mận lắc, Trái cây cắt sẵn thập cẩm, Cóc lắc, Thơm chấm muối tôm, Hoa quả dầm, Ổi lắc, Dưa lưới cắt sẵn, Bưởi chấm muối tôm, Xoài lắc |
| Ăn vặt · Đồ ăn vặt khô | 17 | Mè xửng, Dừa sấy, Khô cá chỉ vàng nướng, Mứt gừng, Bánh phồng tôm, Mè láo, Bánh phồng nổ, Ô mai, Kẹo lạc, Khô gà lá chanh, Khô mực nướng, Bánh đậu xanh, Bánh phồng xứ Lạng, Cơm cháy chà bông, Mực rim me, Kẹo dừa, Kẹo cu đơ |
| Ẩm thực · Miền Bắc | 29 | Bánh bẻng, Sủi dìn, Phở cuốn, Phở bò, Bánh đa cua, Bánh trôi tàu, Cơm niêu, Phở gà, Bánh đa kê, Giá bể xào, Nem cua bể, Chè đỗ đen, Ô mai, Cháo lòng, Mì vằn thắn, Bún chả, Dừa dầm, Bánh cuốn, Bánh mì que, Nộm bò khô, Ốc luộc, Bún thang, Bánh đúc tàu, Nem chua rán, Bánh phồng xứ Lạng, Lẩu ếch, Cháo sườn, Bún cá cay, Bánh áp chao |
| Ẩm thực · Miền Trung | 27 | Mè xửng, Bánh tráng nướng, Chè bột lọc heo quay, Bánh ép, Bún tôm Bình Định, Cơm lam gà nướng, Bún rạm, Bánh bột lọc, Bánh mì xíu mại, Bánh hỏi lòng heo, Cháo lươn, Mì Quảng, Bún chả cá, Bánh xèo, Kem bơ, Bánh mì chảo, Bánh ram ít, Cơm hến, Bánh bèo, Cơm gà, Bánh mì lagu, Lẩu gà lá é, Nem lụi, Bánh khoái, Kẹo cu đơ, Bánh nậm, Bún bò |
| Ẩm thực · Miền Nam | 36 | Bánh mì, Lẩu bò sa tế, Bánh tráng nướng, Mận lắc, Gỏi cuốn, Xôi, Bò bía mặn, Bánh mì xíu mại, Bún gạo xào, Lẩu cá kèo, Bánh ướt, Bánh xèo, Hủ tiếu sa tế, Bạch tuộc nướng, Bún riêu, Bánh mì chảo, Há cảo, Khô gà lá chanh, Bánh bò, Mì vịt tiềm, Bánh tráng trộn, Cơm thịt kho, Bánh cuốn, Bánh khọt, Lẩu cá thác lác khổ qua, Mì sủi cảo, Bột chiên, Hủ tiếu, Mực rim me, Chả giò, Xoài lắc, Súp cua, Cháo Tiều, Cơm canh khổ qua, Bánh da lợn, Cơm tấm |
| Ẩm thực · Miền Tây | 43 | Cơm trái dừa, Bánh cống, Lẩu cá linh điên điển, Lẩu gà lá giang, Lẩu cua đồng, Cháo bò Tri Tôn, Bánh phồng tôm, Bánh canh, Bánh tằm bì, Chuối nếp nướng, Ốc nướng tiêu, Bún mắm, Mè láo, Nhum biển nướng, Gà nướng lá chúc, Lẩu cá kèo, Bánh phồng nổ, Bánh xèo, Hủ tiếu mực, Bún riêu, Bún cá Châu Đốc, Cá sòng nướng, Bánh cam, Sò dương nướng, Bún nước lèo, Lẩu mắm, Tàu hũ đá sầu riêng, Cơm thịt kho, Bánh pía, Bánh khọt, Cá lóc nướng trui, Lẩu vịt nấu chao, Bún quậy, Hủ tiếu, Cơm mắm kho, Bánh canh ghẹ, Kẹo dừa, Bún kèn, Bánh ít ngọt, Hủ tiếu bò kho, Cơm canh khổ qua, Bánh da lợn, Cơm hạt sen |
| Hương vị · Cay | 21 | Lẩu bò sa tế, Trái cây trộn muối ớt, Mứt gừng, Cơm gà kho sả ớt, Nhum biển nướng, Bánh mì xíu mại, Lẩu gà ớt hiểm, Cháo lươn, Bạch tuộc nướng, Khô gà lá chanh, Cơm hến, Bánh mì que, Cơm lươn xào sả ớt, Lẩu gà lá é, Cơm mắm kho, Gỏi xoài tôm khô, Nghêu hấp Thái, Mực rim me, Lẩu Thái, Bún cá cay, Bún bò |
| Hương vị · Chua / Chua cay | 18 | Lẩu cá linh điên điển, Lẩu gà lá giang, Mận Hà Nội chua ngọt, Trái cây trộn muối ớt, Cơm canh chua cá, Bún mắm, Nhum biển nướng, Giá bể xào, Lẩu cá kèo, Bún riêu, Phở hải sản, Nộm bò khô, Gỏi xoài tôm khô, Mực rim me, Lẩu ếch, Xoài lắc, Lẩu Thái, Bún cá cay |
| Hương vị · Ngọt | 48 | Sủi dìn, Lẩu gà lá giang, Mận Hà Nội chua ngọt, Chè khúc bạch, Trái cây trộn muối ớt, Bánh đa cua, Mứt gừng, Phở chay, Súp bồ câu tứ thần, Bún tôm Bình Định, Súp khoai lang, Phở gà, Chuối nếp nướng, Bún mắm, Bánh đa kê, Giá bể xào, Gà nướng lá chúc, Lẩu cá kèo, Chè sen long nhãn, Mì vằn thắn, Bún riêu, Cá sòng nướng, Khô gà lá chanh, Bánh cam, Ốc giác cà ri, Bánh bò, Súp gà bắp, Lẩu mắm, Dừa dầm, Cơm thịt kho, Phở hải sản, Nộm bò khô, Lẩu cá thác lác khổ qua, Bánh mì lagu, Miến, Lẩu gà lá é, Bún thang, Bò bía ngọt, Bánh đậu xanh, Bánh canh ghẹ, Chè ba màu, Bánh phồng xứ Lạng, Kẹo dừa, Cháo yến mạch, Cháo sườn, Bánh ít ngọt, Kẹo cu đơ, Cơm canh sườn hầm bí đỏ |
| Hương vị · Béo / Ngậy | 20 | Bánh mì, Lẩu cá linh điên điển, Bánh đa cua, Chuối nếp nướng, Nhum biển nướng, Chè đỗ đen, Bánh xèo, Hủ tiếu sa tế, Bò né, Kem bơ, Ốc giác cà ri, Bánh bò, Dừa dầm, Bánh mì que, Lẩu vịt nấu chao, Bột chiên, Bánh khoái, Kẹo dừa, Cháo sườn, Cháo Tiều |
| Hương vị · Mặn / Đậm đà | 21 | Lẩu cá linh điên điển, Cơm mực rim mắm, Bún tôm Bình Định, Cánh gà chiên nước mắm, Cơm sườn, Cơm gà kho sả ớt, Cơm canh chua cá, Lẩu gà ớt hiểm, Lẩu cá điêu hồng, Bún riêu, Bún cá Châu Đốc, Lẩu mắm, Cơm lươn xào sả ớt, Cơm mắm kho, Cơm canh gà lá giang, Cơm tôm rim, Cơm cá kho, Cơm canh khổ qua, Cơm tấm, Cơm canh sườn hầm đu đủ, Bún bò |
| Hương vị · Thanh đạm | 15 | Phở chay, Súp bồ câu tứ thần, Súp khoai lang, Phở gà, Bánh mì chảo, Súp gà đậu ván ý dĩ, Súp gà bắp, Súp tôm, Phở hải sản, Cháo hải sản, Miến, Bún thang, Bánh canh ghẹ, Cháo thịt bò cải bó xôi, Cháo cá |

Món đa nhãn (≥ 2 giá trị): bữa 79/253, nhóm món 20/253, miền 12/253. Một món được thuộc nhiều bữa, nhiều nhóm, nhiều miền và nhiều vị; ghi đủ mọi giá trị có nguồn.

Món chưa thuộc nhóm hiển thị khớp bữa: không có.
