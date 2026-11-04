# Follow-up handoff

GM-20's canonical terminal writer commits `gm06_canonical.results`, the private
registry and `gm20_canonical_private.terminal_outbox` plus its frozen audience.
After migration 0038, the deferred GM-23 consumer materializes one canonical
`ROOM_RESULT_READY` event, private result-to-event mapping and one inbox row per
recipient in that same transaction. This consumer event does not replace or
dual-write the legacy result stores.

The integration checker now validates the producer/consumer boundary on the
full migration chain 0035–0038. It checks result/outbox/mapping/event IDs,
room/status/contract/version, exact locked audience, inbox projection, source
TTL, zero legacy result references and stable row identity across ACK replay,
reads, retries and worker races. A controlled database failure proves event,
mapping and inbox roll back with the terminal writer.

GM-20 remains the producer owner; GM-23 owns inbox and sender behavior. The
follow-up is test/evidence only. It introduces no endpoint or schema change.

## Reproduce

From the repository root with Node 24, the pinned Python dependencies, Docker
Desktop/Linux engine and Supabase CLI 2.120.0:

```powershell
$env:GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD='1'
python scripts/gm20_canonical_check.py
python scripts/gm23_canonical_check.py
python scripts/gm23_upgrade_check.py
Remove-Item Env:GM_V4_ALLOW_LOCAL_DOCKER_WILDCARD
```

The runners create separately owned disposable QA projects on loopback API
54361 / DB 54362 and clean them on exit. The wildcard opt-in is only for Docker
Desktop's local port binding; the runners still validate exact project,
container, workdir and owner marker. Do not reset or migrate the application
database. Reports and SQL TAP output in this folder contain synthetic fixtures
only; private runtime controls, guest tokens and Bruno environment files are
excluded.

See [CHECKS](CHECKS.md) for the exact test snapshot. CI for the pushed PR
revision and Trí's final review remain pending.
