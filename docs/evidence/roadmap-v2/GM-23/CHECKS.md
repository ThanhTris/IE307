# GM-23 — Checks

Checked on 2026-10-15, branch `codex/gm-23-notification-sender`, source base
`a7a97f3d6bf1d7003bab713c3875b7adc1ef8a25` (working tree includes the fixes under test).

| Area | Expected | Actual | Result |
|---|---|---|---|
| Fresh migration/ACL SQL | RPCs exist; client cannot read token/delivery lease; trusted sender only | `supabase/tests/notifications.sql`: 20 pgTAP assertions | Pass |
| HTTP disposable fixture | own inbox <=50, missing auth 401, exact ACK replay, denied token cleanup, unregister retry, token projection denied, sender SQL claim/complete/receipt path | `scripts/gm23_http_check.mjs`: 7 named cases, real GoTrue JWTs, owned DB | Pass |
| SQL mutation smoke | granted registration returns `ok:true,data:null`; token column is not client-readable | verified on fresh disposable DB | Pass |
| Bruno desktop | exact request/response assertions and Runner output | Fresh disposable fixture selected as `Local.runtime.private`; Runner 5/5 Pass: Inbox `200 []`, Register granted `200 {ok:true,data:null}`, Register denied `200 {ok:true,data:null}`, Unregister `200 {ok:true,data:null}`, Missing auth `401 AUTH_REQUIRED` | Pass |
| Expo transport fake | success ticket, `DeviceNotRegistered`, near-expiry lease, and `LEASE_LOST` completion | `node --experimental-strip-types scripts/gm23_sender_check.mjs`: 4/4 cases Pass with in-process provider/RPC shim | Pass |
| Remote Expo on Android | real token/permission/remote receipt | assigned to GM-29; no credential/native build here | Not run |
| Existing app DB | no reset or migration ledger mutation | no application DB reset; disposable DB cleaned | Pass |
| Root `backend:test` | regression on the deployed application DB | Not run to GM-23 scope: app ledger is still pre-GM-22 (`get_my_social_identity()` absent); resetting/upgrading it is outside this task | Not run |

The local application DB mismatch is recorded explicitly. It does not replace
the fresh all-migrations disposable SQL/HTTP evidence above.

The HTTP report is [http-results.json](http-results.json). It records
`remoteExpoDelivery: Not run`; fake transport is not reported as remote push.
