# QA Start Loopback Diagnostic — GM-54 (`0069`)

- **Command**: `npm run qa:start -- --run-id gm54qalog`
- **Date**: `2026-11-28T14:21:18+07:00`
- **Host / Docker**: Docker Desktop `28.5.1` (`OSType: linux`, Windows host)
- **Outcome**: Applied migrations cleanly through `0069_gm54_app_min_version.sql`, then stopped at `QA_HOST_BINDING_NOT_LOOPBACK` (`assertLoopbackPublishedPort` in `scripts/backend-qa.mjs`).

## 1. Verbatim `qa:start` Output

```text
$ npm run qa:start -- --run-id gm54qalog
Date: 2026-11-28T14:21:18.8663929+07:00
Docker: Docker Desktop | Server 28.5.1 | OSType linux

> gi-cung-duoc-backend-tooling@0.1.0 qa:start
> node scripts/backend-qa.mjs start --run-id gm54qalog

{"DB_URL":"postgresql://postgres:[REDACTED]@127.0.0.1:54362/postgres","API_URL":"http://127.0.0.1:54361","REST_URL":"http://127.0.0.1:54361/rest/v1","GRAPHQL_URL":"http://127.0.0.1:54361/graphql/v1","PUBLISHABLE_KEY":[REDACTED]
Starting database...
Initialising schema...
Seeding globals from roles.sql...
Applying migration 0001_core_schema.sql...
...
Applying migration 0064_gm49_delete_account.sql...
Applying migration 0065_gm48_hosted_tick_schedule.sql...
Applying migration 0066_gm35_profile_display_name.sql...
Applying migration 0069_gm54_app_min_version.sql...
{"project_id_filter":"gm03qa-gm54qalog","backup":false,"message":"Stopped supabase local development setup."}
QA_HOST_BINDING_NOT_LOOPBACK

ExitCode: 1
```

## 2. Docker `PortBindings` Root-Cause Check (Windows Docker Desktop `28.5.1`)

```text
$ npm run backend:start
$ docker inspect supabase_kong_gi-cung-duoc-local --format '{{json .NetworkSettings.Ports}}'
{"8000/tcp":[{"HostIp":"0.0.0.0","HostPort":"54321"},{"HostIp":"::","HostPort":"54321"}]}
$ docker inspect supabase_db_gi-cung-duoc-local --format '{{json .NetworkSettings.Ports}}'
{"5432/tcp":[{"HostIp":"0.0.0.0","HostPort":"54322"},{"HostIp":"::","HostPort":"54322"}]}

$ docker network create --ipv6=false -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 gm54-probe-net
$ docker run -d --rm --network gm54-probe-net -p 54399:80 public.ecr.aws/supabase/kong:2.8.1 sleep 10
$ docker inspect <cid> --format '{{json .NetworkSettings.Ports}}'
{"80/tcp":[{"HostIp":"0.0.0.0","HostPort":"54399"},{"HostIp":"::","HostPort":"54399"}]}
```

`scripts/backend-qa.mjs` (`assertLoopbackPublishedPort`, lines 266-275 & 312-327) rejects any published port whose Docker `NetworkSettings.Ports[].HostIp` is not `'127.0.0.1'` or `'::1'`. On Windows Docker Desktop `28.5.1` (WSL2 Linux backend), `HostIp` is reported as `'0.0.0.0'` and `'::'` even on a custom Docker bridge created with `-o com.docker.network.bridge.host_binding_ipv4=127.0.0.1`. All migrations through `0069_gm54_app_min_version.sql` applied cleanly before that guard halted `qa:start`.
