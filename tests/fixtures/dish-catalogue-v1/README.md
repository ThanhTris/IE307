# GM-40 — Fixtures profile catalogue

[minimal.json](minimal.json) là **mô phỏng**, fixtureOnly=true; mọi UUID trong fixture
thuộc tập mô phỏng, nguồn example.invalid, record draft/reviewer=null/artwork=null.
Không phải nguồn món thật, license thật, review hoặc dữ liệu seed.

Ca hợp lệ nhỏ nhất: một món, không taxonomy đã biết, không giá/ảnh/quán/offering/
lịch/coverage/anchor; có source và evidence tên mô phỏng. Template trống riêng tại
supabase/seed/templates; bundle thật draft 39 món riêng tại supabase/seed/catalogue.

Chạy `python3 -m unittest discover -s tests -p test_dish_catalogue.py -v` từ root.
Expected được viết bằng assertions độc lập: giữ ID, 39/18/219/216/2/1, từng giá trị
món/giá nguồn; chấp nhận null, từ chối missing required, duplicate, FK sai, thiếu
evidence, rights unknown, giá âm/NaN, thiếu đơn vị và entity quán ngoài profile.
Fixtures và assertions hiện chỉ kiểm contract/offline; SQL/API chờ ADR-018.

## Disposable v4 CI fixture

`qa-v4-synthetic.json` is a fixed 20-card, fixture-only catalogue used to exercise the GM-07.B pool-count and two-round API cases. Its IDs are deterministic; fields without evidence remain null/empty. It is not a real or verified dataset and must not be used as production seed. The v4 CI setup imports the committed GM-40 draft bundle separately to assert real availability and shortage responses.
