# GM-48 · Bàn giao tick trên Supabase hosted

[Issue](https://github.com/ThanhTris/IE307/issues/184). Tâm thực hiện, Trí review.
Nhận GM-20 trên main và dùng lại v3/v4 tick đã khóa bằng reference epoch. Migration bản mới là `0065`, theo sau `0064` đã merge. API và contract B-supplement giữ nguyên.

## QA và xác nhận staging cùng GM-52

```sh
npm ci
python -m pip install -r scripts/ci-requirements.txt
npm run qa:start -- --run-id gm48-review --api-port 55481 --db-port 55482
python scripts/gm48_hosted_tick_check.py --qa-manifest .work/qa/gm48-review/manifest.json --cron
npm run qa:stop -- --run-id gm48-review
```

Chỉ trên project staging được nhóm xác nhận, người vận hành bật Supabase Cron trước khi chạy migration bằng ledger. Local không có extension sẽ bỏ qua lịch và dùng worker. Nếu staging đã ghi ledger lúc extension còn tắt, người vận hành bật Cron rồi chạy lại đúng SQL 0065 dưới quyền postgres. Không reset DB. Nếu phiên bản hosted từ chối lịch giây, giữ staging chưa đạt và chốt phương án với Trí. [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)

```sql
select extversion from pg_extension where extname = 'pg_cron';
select jobid, jobname, schedule, username, active
from cron.job where jobname in ('ie307-gm48-tick', 'ie307-gm48-prune');
select d.status, d.start_time, d.end_time
from cron.job_run_details d join cron.job j using (jobid)
where j.jobname = 'ie307-gm48-tick'
order by d.start_time desc limit 5;
```

Kỳ vọng 1 job 2 giây dưới quyền postgres, 1 job prune mỗi giờ, ít nhất 2 lần chạy thành công cách nhau dưới một phút. Cho khách tạo phòng hai người, có một người ACK và vào chờ, rồi kiểm trạng thái sau 60 giây qua [request suite](../../../../supabase/tests/http/GM-48.http). Kiểm roster vẫn có hai người, một phiếu thực tế và replay được ACK. CI QA dùng project disposable có xác minh ownership. [CHECKS](CHECKS.md)

Rollback bằng `supabase/rollback/0065_gm48_hosted_tick_schedule.down.sql` trên đúng project dưới quyền postgres. Rollback gỡ hai job GM-48. Lịch job khác và dữ liệu phòng vẫn giữ nguyên. Nếu dừng cron trên hosted, cần có phương án khôi phục tick trước khi nhận phòng mới.
