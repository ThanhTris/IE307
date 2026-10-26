# CI workflow cho BE/Data v4

## Cách chạy

`.github/workflows/ci.yml` là workflow điều phối duy nhất. Nó chạy trên mọi pull request, mỗi lần push vào `main`, và khi được chạy thủ công. Các workflow suite bên dưới chỉ được gọi bằng `workflow_call`, tránh chạy trùng cùng commit. Pull request cũ bị hủy khi có commit mới; push vào `main` không bị hủy. `CI / required` chỉ thành công khi mọi suite bắt buộc đều thành công. Branch protection chưa được thay đổi.

Mỗi job cấp `contents: read`. Artifact CI được giữ 14 ngày. Không workflow nào dùng secret production. Báo cáo từng job ghi SHA, nền tảng, phiên bản công cụ, hash schema/migration và trạng thái; suite API v4 bổ sung contract/schema/dataset hash và kết quả từng ca. Jest tải lên JSON để xem test nào thành công hoặc thất bại. Với ca negative cố ý gửi request sai hình dạng (ví dụ `dishCount=21`), runner đánh dấu `requestValid=false`: validator vẫn kiểm response lỗi theo JSON Schema, nhưng không gọi request hợp lệ là Pass.

## Ma trận workflow

| Nhóm trong `CI / required` | Workflow được gọi | Phạm vi |
|---|---|---|
| Repository validation | `documents.yml` | Repository validator, toàn bộ Python tests, task metadata/readiness và whitespace. |
| Mobile baseline | `foundations.yml` | Expo guard, TypeScript, lint, Jest/component, architecture, Expo lockfile compatibility và Android JS export. Mỗi gate chạy riêng để lỗi một bước không che kết quả bước sau. |
| Decision domain | `decision.yml` | Domain decision và deterministic fixtures. |
| Legacy dish policy | `dish-policy.yml` | Policy/runtime v3 legacy; không dùng làm bằng chứng policy v4. |
| GM-06 schema | `gm06-schema.yml` | SQL checks và pgTAP. Stdout/stderr TAP đã che credential được giữ riêng để chẩn đoán. |
| GM-08 import | `gm08-import.yml` | Encoding regression và importer trên PostgreSQL dùng một lần. |
| GM-18 eligibility | `gm18-eligibility.yml` | Legacy eligibility domain, SQL parity và authenticated HTTP. |
| CLI portability | `gm20-cli.yml` | CLI entrypoint trên Ubuntu, Windows và macOS; không khẳng định API/DB hoặc Android đã chạy. |
| GM-21 history | `gm21-history.yml` | History, consent, ACL và retention. Assertion `search_path=pg_catalog` được giữ nguyên. |
| Dish v4 BE/Data | `dish-v4.yml` | QA riêng có Auth+REST, migrations hiện hành, worker, API v4, JSON Schema, và importer GM-40 trên DB disposable tách biệt. |

## Chạy local

Ở thư mục gốc repository, có thể chạy các gate không cần backend:

```powershell
python -m pip install --requirement scripts/ci-requirements.txt
python scripts/validate_repository.py
python -B -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

Trong `mobile/`, dùng lockfile và chạy cùng các gate của CI:

```powershell
npm ci
npm run test:expo-baseline
npm run typecheck
npm run lint
npm test
npm run check:architecture
npm run check:expo
npm run bundle:android
```

Để chạy toàn bộ QA v4 local:

```powershell
python scripts/dish_v4_ci.py run
```

Runner dùng project ID và workdir riêng theo run, kiểm ownership/port trước khi tạo database, rồi chỉ dọn đúng tài nguyên của lượt đó. Nếu các cổng `54360–54362` đang được dùng, runner dừng và không chiếm dịch vụ khác. Không dừng project QA đang chạy để mở cổng. Supabase CLI mặc định có thể publish Docker port trên wildcard interface: CI chỉ chấp nhận binding đó trên runner GitHub-hosted tạm thời, không có secret production và cleanup theo ownership; chạy local mặc định chỉ chấp nhận loopback. Docker Desktop local có thể chạy kiểm thử với `GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD=1`; đây là opt-in rõ ràng và report ghi binding policy tương ứng, không phải tunnel/public backend. GM-40 importer có suite disposable riêng; fixture tổng hợp của API v4 không được tính là kiểm importer.

## Giới hạn bằng chứng

Expo Android export chỉ chứng minh JavaScript bundle tạo được. Nó không chứng minh APK/native build, Expo Go trên điện thoại, GPS thật, TalkBack hay kiểm UI trên Android. Những mục đó vẫn cần bằng chứng riêng của task.

Test/unit/API chạy trên CI không tự đổi trạng thái GitHub Project. CI cũng không thay review/approval của Trí. Nếu một assertion nghiệp vụ hoặc bảo mật thất bại, giữ job đỏ và chuyển lỗi về task producer phù hợp; không nới assertion để đạt xanh.
