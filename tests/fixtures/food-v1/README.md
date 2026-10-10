# GM-04 contract cases — mô phỏng

`fixtureOnly=true`, UUID namespace `anyfood:gm04:fixture-v1:<entity>`, nguồn
example.invalid, artwork=null. Không dữ liệu quán/người thật hoặc token thật.
Simulated verified/reviewer/license chỉ kiểm contract, không là evidence review.

- [Food template](../../../supabase/seed/templates/food-v1.template.json): đủ 11
  entity, lịch quán/món riêng, qua đêm/lastOrder, ngoại lệ đóng ngày hôm sau và
  override sold_out; draft/unknown vẫn được biểu diễn.
- [Core template](../../../supabase/seed/templates/core-v1.template.json): đủ 18
  entity, hai thành viên mô phỏng, pool khóa một món, hai submission WANT đầy đủ,
  result đã lưu, history có consent, friend/invitation/inbox/event/device và ACK.
- [135 cases](contract-cases.json): mỗi input là template đầy đủ + edits có path
  theo key/index JSON. Expected viết độc lập; validator không sinh expected.
  Invalid cases yêu cầu error code/path tối thiểu, các lỗi kéo theo được ghi trong
  actual. Nhãn error là runner diagnostics, chưa là API enum GM-07.
- [Manifest](artifact-manifest.json) ghi checksum schema/template/dictionary và
  case file; `python3 scripts/build_field_contracts.py --check` đối chiếu byte.

```sh
python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 -m unittest discover -s tests -p 'test_field_contracts.py'
```

Clock cố định trong mỗi ca, không dùng ngày máy. Một ca có thể valid về cấu trúc
nhưng cần GM-18 xác nhận coverage/radius/lịch/freshness trước đưa vào pool; xem
consumerExpectation. Runner không tính eligibility, score hoặc chọn winner.
Các ca kiểm NO/result chỉ chặn record có veto rõ, không thay engine GM-15/20.

Fixtures [food-data-v1](../food-data-v1/README.md) và snapshot khảo sát legacy
giữ nguyên; không trộn vào seed verified. Dùng [dictionary](../../../docs/data/FOOD_DATA_DICTIONARY.md)
và [handoff](../../../docs/evidence/roadmap-v2/GM-04/HANDOFF.md) cho contract/version,
nullable, privacy và phần chờ review.
