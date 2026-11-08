# GM-07.B BE Core QA

This sequential Bruno collection exercises the v4 API using real local Supabase Auth + REST. It includes the regression where account history consent is enabled before room creation and verifies the saved podium through the history API.

## Run

1. From the repository root, run `node scripts/gm_v4_http_check.mjs` against the owned QA project. It verifies the QA project label, loopback API port, v4 worker, and schema `0.9.1`; it also activates only the synthetic QA catalogue.
2. Open this folder in Bruno. Copy `environments/Local QA.example.bru` to `environments/Local.private.bru`, set `publicKey` to the anon key from the owned QA project's local status output, and keep the private file local (it is gitignored).
3. Select `Local.private` and run all 26 requests in sequence. The requests create temporary anonymous users and a test room. Use only the dedicated QA project at `127.0.0.1:54361`.

The collection expects a 10–20 dish synthetic QA catalogue to be active. It does not publish or validate production data. Never point the environment at the application database.
