# GM-47 · Bàn giao bổ sung biên tập

Task [GM-47](https://github.com/ThanhTris/IE307/issues/176), Tâm thực hiện, Trí review. Đầu vào GM-40 qua PR #144 và GM-41 qua PR #201. Dùng UUID GM-41 để ghép thành bản 1.2.1 `test_demo`. GM-51 nhận overlay, nguồn và báo cáo theo bữa để rà quyền và phát hành bản hosted.

1. Chạy `python data-preparation/scripts/gm47_catalogue.py`. Bundle và báo cáo sinh trong `.work/gm47-editorial/`. SHA dự kiến: `5d3781917df1d6d44f046e9b302006c6d9960c7021bc272f09c236c007154075`.
2. So 5 UUID cùng sourceRef và các quyết định ảnh trong [hồ sơ dữ liệu](../../../data/DISH_DESCRIPTIONS_ARTWORK.md). Kiểm SHA 1.1.0 và 1.2.0 trước khi phối hợp gộp bản kế tiếp với Vinh.
3. Dùng [QA GM-03](../GM-03/RUNBOOK_QA.md) và runner bên dưới. Runner nạp candidate dạng test-only, kiểm thẻ projection trên DB và giữ catalogue đang active của QA.

```sh
npm ci
python -m pip install -r scripts/ci-requirements.txt
npm run qa:start -- --run-id gm47-review --api-port 55471 --db-port 55472
python scripts/gm47_catalogue_check.py --qa-manifest .work/qa/gm47-review/manifest.json
npm run qa:stop -- --run-id gm47-review
```

Trong GitHub Actions, job GM-47 tải lên `gm47-editorial-evidence`. Xem [CHECKS](CHECKS.md) để đối chiếu kết quả theo revision.
