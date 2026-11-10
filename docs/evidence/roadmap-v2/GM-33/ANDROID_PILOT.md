# GM-33 Android pilot

The planned run uses a native Android candidate from the reviewed integration
revision, a physical USB phone and a second independently authenticated client.
Client B can be a phone or AVD. Record which clients are real devices when
adding participants for the 4-, 8- and 20-member cases.

| Case | Producer → app action | Expected |
| --- | --- | --- |
| P01 | GM-16/17 → launch, sign in as guest, reopen, expire/revoke the session, logout | Restore the same guest only while valid; handle auth errors and clear identity-scoped private state |
| P02 | GM-18/19/40 → host creates lunch room for 10 and 20, then a shortage case | Exact distinct pool size or `INSUFFICIENT_DISHES` with available count; no mandatory location, ready state or replacements |
| P03 | GM-19/22 → A invites B, B previews then confirms; repeat via manual code and cold/warm deep link | Preview leaves member count unchanged; confirm joins once; expired, full and already started states are explicit |
| P04 | GM-19/22 → repeat lobby with 2/4/8 identities and boundary 20/21; edit time/count then race with start | Locked roster and pool follow the accepted server version; time-only edit preserves cards; 21st cannot join |
| P05 | GM-17/19 → host and member change their preferences and refetch both clients | Caller sees own values only, with preferences preserved across refetch; unsupported ranking does not prevent starting |
| P06 | GM-20/31 → submit R1, enter waiting, drop connection after ACK, reconnect | Clock starts at first valid waiting after ACK; deadline is 60 seconds; no new ballot, no reset, no exposure of peer choices |
| P07 | GM-20 → host tries exactly half and strict majority; repeat timeout with one valid ballot | Early end denied at half; majority or expiry follows server outcome; current round count only |
| P08 | GM-20 → no unanimous winner and survivor sets of zero, one and multiple; attempt cap + 1 | Zero ends in R1; one opens real R2; cap is `max(1, floor(0.30*N))`; remove-all yields no winner |
| P09 | GM-20/27 → reload winner, no-consensus and Top 3 with ties | Persisted result ID, dense ranks and at most three entries with winner; neither client recomputes winner/points |
| P10 | GM-21/28/31 → inspect personal/group history, delete/revoke, then force-stop and refetch | Consent scopes remain independent; expired/revoked/deleted data stays absent and cache cannot cross identity |
| P11 | GM-22/23/28 → exercise friend/room invitation and inbox with push denied | Inbox still receives authorized events; expiry/duplicates/forbidden references handled; no implicit admission |
| P12 | GM-23/29 → grant/deny native push, deliver via QA provider and tap cold/warm | Correct authorized refetch, deduplication and no result or permission granted by notification alone |
| P13 | GM-30 → scan a real QR, deny camera and switch to manual | Successful scan shows confirmation before join; denial preserves manual entry |
| P14 | GM-27/30/40 → enable real Places for winner, deny location, force provider failure, change result | Google attribution/map on success; winner and podium unchanged on failure; latest valid observed price only, null/tie hidden |
| P15 | GM-31 → force-stop with pending/unknown submit, relaunch offline then reconnect or change account | SecureStore/SQLite restore only for original identity; server reconciliation precedes replay and terminal result stays pinned |
| P16 | All pilot routes → compare at 412/360/320dp and font scale 2.0, TalkBack, reduced motion, keyboard/Back | Match Figma at equivalent state and 412dp; no clipped actions, actionable accessibility labels, touch targets ≥48dp and usable error/retry states |

For P06/P07, record the distinct timestamps for submit, waiting entry,
deadline and observed transition. Compare the two clients with the server
response and retained outcome. Use the GM-32 run for underlying boundary/race
diagnosis, and record the Android observations independently.

For each case record fixture and actor, action → request/status/error → visible
UI and server state, expected, actual, assertion and sanitized artifact.
Include app commit, APK/build hash, runtime and Android version, viewport,
font scale, contract, QA seal and migration/catalogue hashes. Record all
failed or unavailable cases with owner and reason. Use only test identities
and scrub session headers, invite codes, ballots, push tokens, location and PII.

See [setup and cleanup](HANDOFF.md), [checks](CHECKS.md) and
[visual matrix](FIGMA_PARITY.md).
