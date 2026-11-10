# GM-40 — QA manifest supplement, 2026-11-05

Owner Vinh; reviewer Trí. Branch `codex/gm-40-qa-manifest` starts at main
`bc5a0629c0d1050ef3256ec9fa73bd669019fb84`. Live start gate: READY_TO_START.
Requirement: issue125 comment6647238694. Contract received unchanged:
`gm03-qa-manifest-v1`, GM18.2, source dataset1.1.0 / 39 test-demo dishes.

1. Require an explicit sealed GM03 manifest in the current checkout. Reuse the
   producer verifier and DB adapter; check local ownership, source/migrations,
   definitions/ACL, catalogue hashes, actual Auth/REST endpoints and worker.
2. Use real GoTrue guest identities and the supplied API origin. Run the real
   baseline/rich importers on that owned QA DB, without creating an app-derived
   shadow stack, signing fabricated JWTs or falling back to personal containers.
3. Reuse rich import/readback/no-op/conflict/fault/activation/restore/shortage and
   pinned-R2 assertions. Restore the original release inventory after success;
   on failure retain evidence and require owned qa:stop, without resealing drift.
4. Add rejection tests for missing/foreign/tampered manifests, app endpoint,
   ownership/runtime/worker drift and report overwrite. Test same data from a
   newly provisioned manifest and verify again after the suite. CI uses the same
   manifest consumer. Provision/stop remains owned by GM03 tooling.
5. Run Python regression, backend tooling tests, repository/index/diff checks;
   record actual source hashes, manifest seal, expected/actual and limitations.

No migrations, RPC/DTO, decision policy, source bundle or production publish
change. The importer admission extension accepts only the concrete verified
GM03 adapter with its existing private owner marker; arbitrary postgres objects
remain rejected. The supplement goes to a dedicated PR against main.

The 2026-11-07 main update adds the output gate, a live GM-40.http run and
proof of a persisted old result across catalogue changes. The runner executes
the three declared HTTP cases through GoTrue and PostgREST, with the received
GM-18.2 wire key `INSUFFICIENT_DISHES`. It creates a terminal v3 room and a v4
room with two locked R2 survivors before import. The SQL test checks the exact
GM03 run ID and owner UUID from the manifest in its transaction.
