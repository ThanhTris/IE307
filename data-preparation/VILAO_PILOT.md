# Thử nghiệm phân loại món qua Vilao

Thử nghiệm ngày 2026-10-10, được chủ dự án yêu cầu, trên 10 món menu công khai từ bộ khảo sát Thủ Đức cũ. Đây là nghiên cứu draft độc lập; GM-03 vẫn chờ GM-28, chưa publish seed hoặc chốt taxonomy. CSV nguồn 219 món được giữ nguyên.

## Kết quả thực tế

Đã gửi **2 request** đến `https://api.vilao.ai/v1/chat/completions`, với model yêu cầu chính xác `vgpt/gpt-5.6-luna`. Cả hai HTTP 200; trường model trong response là `gpt-5.6-luna`. Smoke trả đúng `OK`, sau đó mới gửi một batch 10 món. Không gọi lại hoặc dùng model khác để sửa kết quả.

Endpoint, Bearer authentication và tham số `max_tokens` đối chiếu với [API reference của Vilao](https://vilao.ai/docs/api-reference). Không cần OpenAI SDK cho request tương thích này; transport dùng urllib có sẵn.

| Request | max_tokens gửi | Prompt tokens | Completion tokens | Tổng tokens | Thời gian |
|---|---:|---:|---:|---:|---:|
| Smoke | 32 | 1.814 | 5 | 1.819 | 2,365 giây |
| Batch 10 món | 1.400 | 3.369 | 1.873 | 5.242 | 14,578 giây |
| Tổng | — | 5.183 | 1.878 | **7.061** | — |

Usage do Vilao trả về; chưa đối chiếu tiền trên dashboard. Batch có `reasoning_tokens=1482`, nên phần completion ngoài reasoning theo số liệu provider là 391 tokens. `max_tokens=1400` **không chứng minh được trần tổng completion tính phí**: số provider báo là 1.873. Smoke rất ngắn nhưng báo 1.814 prompt tokens; chưa rõ cách provider tính phần ngoài nội dung gửi. Không dùng bảng giá OpenAI để suy chi phí Vilao. Cần kiểm hợp đồng token/pricing của provider trước chạy toàn bộ danh mục.

Phản hồi đúng array 10 dòng, theo đúng thứ tự; không giải thích dài. **9/10 dòng đạt toàn bộ contract**. Dòng Burger bóng đêm giữ mọi mức vị là unknown nhưng evidence của flavor là 1, trái quy ước “toàn bộ unknown → evidence 0”. Dòng này được giữ nguyên và ghi `rejected_contract_needs_review`, chưa tự sửa. Schema pass không phải tỷ lệ phân loại đúng: chưa có bộ nhãn chuẩn được reviewer độc lập chốt.

## 10 món và điều cần kiểm

| Món | Đề xuất chính | Điều cần kiểm |
|---|---|---|
| Cơm tấm sườn bì | Việt; cơm; nướng | Cuisine/cách nướng là suy luận; sáng/trưa/tối từ nhóm nguồn “bán từ 5h30 -19h”, chưa là lịch hiện tại đã xác minh |
| Cơm ba rọi chay | Việt; cơm | Giữ chữ chay, không gộp ba rọi thịt; method/temp/vị/buổi unknown |
| Bún thịt nướng | Việt; bún; nướng | Không bị nhóm nguồn “Bánh cuốn” làm đổi thành bánh cuốn |
| Phở gà | Việt; phở; hầm | Hầm là suy luận cách nấu; nhiệt độ/buổi/vị vẫn unknown |
| Bánh mì thập cẩm | Việt; bánh mì; nóng | “Nóng giòn” nằm trong mô tả menu; không suy mức cay từ “ớt sate” |
| Mì spaghetti | Ý; mì; origin not_applicable | Cuisine Ý là đề xuất; not_applicable chỉ áp dụng trường vùng xuất xứ Việt, không khẳng định nơi phát minh món |
| Salad ức gà sous vide | Cuisine unknown; salad; sous vide | Không mặc định salad lạnh hoặc ép thành cuisine Mỹ/Âu |
| Burger bóng đêm | Mỹ; burger; flavor unknown | Mỹ là suy luận; “cay/không cay” là lựa chọn, không chốt cay. Evidence flavor sai contract, cần rà |
| Xôi thập cẩm | Việt; xôi; hấp | Hấp là suy luận; giữ topping trong tên/alias nguồn |
| Bánh cuốn trứng | Việt; bánh cuốn; hấp | Hấp là suy luận; không gộp bỏ trứng |

Không có vị toàn món được nêu đủ rõ trong mẫu nên cả 10 dòng giữ flavor unknown. Không món nào được đoán xuất xứ Bắc/Trung/Nam chỉ từ kiến thức model; chỉ các đề xuất ngoài Việt có not_applicable. Địa chỉ quán, tọa độ, ảnh, giá và dữ liệu người dùng không nằm trong request.

## Code và đầu ra

- [Notebook nguồn](notebooks/try_vilao_taxonomy.ipynb): 8 code cell, từ chọn mẫu → codebook → prompt → smoke → batch → validator → giải mã → báo cáo.
- [Codebook draft](config/taxonomy_pilot_v1.json): thứ tự array, mã nhãn, giới hạn số nhãn, mức vị, khung giờ và danh sách 10 tên mẫu.
- [Transport/validator](scripts/vilao_pilot.py): chỉ Python standard library, parser `.env`, host/model cố định, không redirect/retry, che secret và đọc cache theo hash request.
- [Cấu hình mẫu](config/vilao.env.example): không chứa key thật. Root `.env` hiện tại dùng `apiKey: "..."`, `baseURL: "..."`, `model: "..."`; parser nhận dạng này và dạng `VILAO_*=...`, không execute/sourcing file.

Notebook tự tạo `data-preparation/datasets/thu-duc-taxonomy-pilot/`, Git bỏ qua:

```text
raw/
  sample_inputs.json              # 10 offering cùng nguồn, alias/URL giữ cục bộ
  classification_request.json    # prompt/context công khai; không có header/key
  smoke.json                     # response, usage, thời gian, hash request
  classification.json            # response array nguyên trạng và usage
processed/
  taxonomy_positional.json        # đúng array model trả, không sửa
  taxonomy_decoded.json           # 10 đề xuất giải mã + evidence/status/alias nguồn
  validation_results.json         # contract pass/fail từng dòng
reports/
  PILOT_REPORT.md                 # bảng đọc nhanh và usage thực tế
  run_report.json                 # số dòng, usage, hash nguồn/config/đầu ra
  reproducibility_report.json     # đối chiếu hai lượt chạy cache, không gọi API
  try_vilao_taxonomy.executed.ipynb
```

Alias và biến thể đã có trong dữ liệu nguồn được giữ; model không phát sinh alias mới hay gộp món. Mã nhãn là danh sách đóng nhưng taxonomy vẫn draft, chưa đủ để khẳng định bao phủ mọi món. `other` và `unknown` khác nhau; thiếu thông tin không đổi thành mức vị 0 hoặc nhiệt độ thường. “Chay” chưa là chứng nhận thành phần/dị ứng. Cuisine/category/method suy luận phải được người kiểm trước dùng trong app.

## Chạy lại

Mở notebook, chọn Python kernel có pandas; chạy Run All. Mặc định `ALLOW_API_CALLS=False`, `REFRESH_API=False`: chỉ đọc cache, không cần key khi chạy offline. Thư mục và đường dẫn được suy từ project; kernel ở ngoài project thì đặt `DATA_PREPARATION_DIR` ở cell đầu.

Nếu cache chưa có, đặt `ALLOW_API_CALLS=True` để đọc key từ `.env` và gọi đúng hai request giới hạn; cache đã có thì chỉ gọi phần còn thiếu. Muốn gọi lại cả thử nghiệm đặt thêm `REFRESH_API=True`. Thay prompt sẽ làm hash cache không khớp và dừng, không âm thầm dùng nhãn cũ.

Không có Jupyter kernel vẫn chạy bằng Python có pandas:

```bash
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/try_vilao_taxonomy.ipynb --offline
# Chỉ dùng khi chủ động muốn gửi request còn thiếu:
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/try_vilao_taxonomy.ipynb --allow-api
# Chủ động gọi lại cả smoke và batch; phát sinh thêm usage:
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/try_vilao_taxonomy.ipynb --allow-api --refresh
```

Giới hạn transport: tối đa hai HTTP attempt/instance, 16.000 UTF-8 byte request, timeout 45 giây, tối đa 2 MB response, max_tokens gửi không quá 1.400. Không tự retry, không dùng web/tools. Giới hạn byte/request không kiểm soát overhead hoặc tiền provider tính. Cần kiểm khả năng provider hỗ trợ giới hạn tổng completion/reasoning trước mở rộng.

Đã chạy code từng cell bằng Python 3.12.14/pandas 2.2.3; chưa chạy trực tiếp qua Jupyter kernel. Hai lượt replay cache giữ nguyên JSON đầu ra và CSV nguồn; test transport/secret/contract dùng fixture và mock, không gửi request thật. Tổng 72 regression test đạt, repository validator và task indexes đạt; quét file thử nghiệm/báo cáo không thấy key thật. Không cài package hoặc thay dependency app.
