# GM-33 preparation checks

## USB phone and independent AVD rehearsal on 2026-11-10

**Partial UI–API run. Stage 3B is incomplete.** Source and main were
`79135856eb673bedc47ceae033c851d2791e36a5`. The live Project read at
15:37 ICT confirmed GM-32 and GM-40 were both Done. The start and
merge/output checkers returned `READY_TO_CLAIM` and
`READY_FOR_MERGE_REVIEW`. Those checks verify dependency and artifact
readiness. Physical acceptance still requires the case evidence below.

| Run input | Observed value |
| --- | --- |
| Client A | RMX3710 via USB, Android API 35, Expo Go 58.0.5, 1080 × 2400 at 408dpi, display width about 424dp, font scale 0.9 |
| Client B | Independent Pixel 7a AVD, Android API 37, Expo Go 58.0.5, 1080 × 2400 at 420dpi, display width about 411dp, font scale 1.0 |
| Build | Expo SDK 58.0.23 and Node 24 with Metro. The standalone app package was absent on the USB phone. No usable QA APK was found in GitHub Releases, the queried Actions artifacts or the searched local project folders |
| Backend | Owned GM-03 QA run `gm33-usb-1110`, 28 migrations matching the GM-32 receipt, contract `dish-session-v4/roadmap-v2/GM-07.B-supplement`, release `dish-catalogue-v1:1.1.0` with 39 dishes |
| Provenance | QA seal `ebcf8d551919fe742c4917ad93b68121c6b895381e326471d6ec4ace15a29134`, GM-32 receipt SHA-256 `0b695a9cfe78c72bf94fbc46d82e0f22fcedc417f646f6f466e92757b1d16d69` |

| Case | Input and expected | Actual assertion | Result |
| --- | --- | --- | --- |
| P01 | Two synthetic guests sign in independently. Valid identity restores after restart | Two distinct anonymous accounts. A returned to Home after force-stop without creating another account | Pass for sign-in and valid restore. Expiry, revoke and logout Not run |
| P02 | A requests 10 lunch dishes without location | Live room stored 10 requested and 10 distinct pool dishes from release 1.1.0. Setup and preferences still displayed sample labels | Pass for 10-dish create. Fail for live copy. Phone 20/shortage Not run |
| P03 | B enters a manual code. Preview preserves one active member and confirmation joins once | Active member count changed from one to two on confirm. Receipt showed “Đã vào phòng mẫu” for the real QA room. Expo Go also displayed “Liên kết bị chặn” on manual-entry navigation, with the manual path usable | Pass for join state. Fail for receipt copy. Native links and expiry/full cases Not run |
| P04 | Host starts. Both clients enter voting with two locked members and ten dishes | Backend entered `ROUND_1` with roster/pool 2/10 and A entered voting. B stayed in the lobby even after tapping reload. B opened the vote route explicitly for subsequent QA | Fail for member transition. Larger rosters and edit/start race Not run on device |
| P05 | Both clients edit and refetch their own preferences | Preference screen rendered. No controlled two-client write/refetch privacy assertion | Not run |
| P06/P07 | Both vote OK on all ten. Verify ACK/waiting ordering and early-end/deadline behavior | Initial state had zero ballots and no waiting clock. A's first ballot was stored while the clock was still unset. Both R1 ballots subsequently recorded waiting entry, then R2 opened. Full timer, early-end and loss-after-ACK assertions were untested | Pass for observed ACK/entry ordering and R2 transition. Remaining timer and recovery cases Not run |
| P08/P09 | A removes Phở bò in R2, B keeps all. Both submit and see the same persisted outcome | `DECIDED` in round 2 with two R2 ballots, one persisted result and one result-ready event. Winner had no REMOVE. Both clients saw the same winner. AVD rendered three entries sharing rank 1, each with 2 points | Pass for multiple-candidate R2, veto and tied Top 3. Singleton, cap and no-consensus cases Not run on device |
| P10 | No consent. Check persisted history and exercise consent/delete paths | Zero canonical history rows in this room. Consent, delete, revoke and offline/cache cases were not exercised | Pass for the server no-consent assertion. Remaining UI cases Not run |
| P11 | A loads the inbox after restart | Two inbox rows in QA for the result event. A opened the Inbox using a QA route and saw “Kết quả phòng đã sẵn sàng” | Pass for result inbox read. Invite, expiry, denied push and normal navigation cases Not run |
| P12–P14 | Native push delivery, real camera QR and live Places | No standalone QA build or provider evidence. Current camera config and adapter cannot scan | Not run |
| P15 | Force-stop and restore a valid identity and terminal result | A restored the same identity. The private server digest for the result and account count matched before and after. No pending submit, offline restore or outbox replay was injected | Pass for terminal persistence and valid-session restore. Remaining recovery cases Not run |
| P16 | Compare the same app state against Figma and check viewport/a11y | Captured Expo Go checkpoints on both clients. The required Figma frame could not be read. No standalone, TalkBack or full viewport/font coverage was assessed | Not run |

Issue routing follows the [handoff](HANDOFF.md#received-capabilities).
Private screenshots remain in the ignored `.work/gm33/` directory. The
member lobby after reload, both terminal screens and the phone Inbox are
recorded as `usb-B-lobby-after-start-reload.png`, `usb-A-result.png`,
`usb-B-result.png` and `usb-A-inbox-after-restart.png`. The device rehearsal
does not establish normal end-to-end navigation because B needed the
explicit QA route after host start.

The QA runner confirmed removal of its worker, Supabase stack and
network. The temporary ADB forwards, Metro process and owned AVD were
closed. The USB phone remained authorized.

The full Python suite ran 688 tests with six skipped and no failures.
The nine GM-33 tool tests, repository validator, task-index check and
whitespace checks passed. A final fetch found no commits between HEAD
and `origin/main`. The review PR remains pending the mandatory cases.

## Earlier pre-pilot gate verification on 2026-11-10

GM-33 fast-forwarded to current main `79135856eb673bedc47ceae033c851d2791e36a5`
with [GM-32 #163](https://github.com/ThanhTris/IE307/pull/163) and
[GM-40 #164](https://github.com/ThanhTris/IE307/pull/164) both present.
The 15:25 ICT Project read confirmed that GM-32 and the other declared
GM-33 start dependencies were Done. GM-40 remained Needs Update.

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| Target revision | GM-32 integrated on latest main | Main and GM-33 HEAD both `7913585` | Pass |
| Start gate | Current GM-33 dependency and target artifacts are present | `READY_TO_CLAIM` | Pass |
| Merge/output gate | GM-40 catalogue accepted on Project and task outputs verified | `BLOCKED_TASK_OUTPUTS` with `Stage 3B USB test/release requires GM-40 (Dish Catalogue projection) Done before merge` | Blocked |
| GM-03 QA provenance | Match accepted GM-32 receipt on current main | Run `gm33-main-1110`, 28 migrations, function inventory/schema and test catalogue matched, `runtimeMatch=true` | Pass |
| GM-40 catalogue | Import/readback 39 dishes and enforce exact eligible count | 100 assertions passed. Lunch returned 20 distinct dishes out of 23. Dinner request for 20 reported 7 available | Pass (backend QA) |
| Regression | GM-33 capture and preflight, Python suite, repository/task indexes | 9 GM-33 tests passed. Python collected 688 with 6 skipped and no failures. Repository and task-index checks passed | Pass |
| USB inventory | Authorized physical Android and an independent second client for pilot | No USB phone enumerated | Not run |
| Physical QR capability | Native camera capture and permission flow in the pilot build | Expo blocks Android CAMERA, and the current native adapter returns denied | Gap, GM-30 follow-up |

The QA seal is `d009fec1cd9a1b483c3c6751dd5c23396a3f67328245e88870e5b1c0fe656d2b`.
The regression receipt SHA-256 is `0b695a9cfe78c72bf94fbc46d82e0f22fcedc417f646f6f466e92757b1d16d69`.
The owned QA worker, stack and network were stopped. The catalogue results
are server-side evidence. No Stage 3B evidence or reviewer acceptance was recorded. The physical
pilot and review PR are pending. See [GM-33 requirements](../../../../tasks/backlog/GM-33.md).

## Earlier GM-32 handoff verification on 2026-11-10

| Check | Input / expected | Observed | Result |
| --- | --- | --- | --- |
| Stacked revision | GM-33 receives the current GM-32 PR without mixing new task changes | `991fd8d` from PR #163, includes main `30aa524` | Pass |
| Regression receipt | Seven passing groups from the tracked GM-32 report | Received report SHA-256 `0b695a9cfe78c72bf94fbc46d82e0f22fcedc417f646f6f466e92757b1d16d69` | Pass |
| Live QA provenance | Migration hashes, schema, functions and catalogue equal the GM-32 receipt | GM-03 run `gm33-handoff-1110`, 28 migrations and real test catalogue of 39 dishes, `runtimeMatch=true` | Pass |
| Capture safety | Separate case/client checkpoints; wrong APK, non-USB and background screens rejected | Four capture unit tests passed. Live blocked invocation wrote no checkpoint | Pass (tool checks) |
| Repository regression | Python suite, Node runner tests, repository and task indexes | 687 Python tests collected, 6 skipped and no failures. All 19 Node tests and static checks passed | Pass |
| Formal pilot | GM-32 and GM-40 Done on Project, current artifacts and physical USB | GM-32 In Progress, GM-40 Needs Update and zero USB phones in ADB | Blocked, Not run |

QA seal SHA-256 `391e50d4fa1a76354ceb85809c2c453d362c2945a2f96e153a1d21e184181a34`.
The owned QA worker, stack and network were stopped after verification.
This run verified the environment and regression inputs. Physical-device
capture, two-client app execution and Figma comparisons await the pilot.
See the [handoff](HANDOFF.md) and [case matrix](ANDROID_PILOT.md).

## Earlier AVD preparation on 2026-11-09

GM-40 candidate `8d91f2c` over main `bc5a062`. This
branch contains the pilot checklist and read-only preflight, separate from
GM-32. The Stage 3B physical-device run is **Not run**.

| Check | Input / expected | Observed | Result |
| --- | --- | --- | --- |
| Target revision | Compare checked-out baseline with live origin main | Origin main `bc5a062` is included in GM-40 candidate `8d91f2c` | Pass |
| Project start and catalogue | GM-32 Done and delivered, GM-40 Done and delivered on main | GM-32 In Progress, GM-40 PR #164 open; preflight reports blocked | Blocked |
| ADB inventory | Authorized USB device is needed; AVD is a separate transport | Zero USB devices; owned Pixel 7a AVD used separately | Blocked for USB |
| Read-only preflight | Unit cases distinguish transports, stale target and wrong runtime revision; no serials in report | Three tests passed; live gate and ADB check produced a blocked report | Pass |
| Expo and mobile | Pinned SDK and dependencies, typecheck/lint/Jest/architecture | Expo 58.0.23 lockfile compatibility passed; 80 suites, 1,510 tests passed and static checks passed | Pass |
| JS Android export | Export Android bundle with existing dependencies | Expo export succeeded; offline manifest-asset resolution emitted a warning | Pass (bundle only) |
| AVD mock smoke | Open Welcome, reach guest action at 320dp/font 200%, tap to open guest form | Expo Go 58.0.5, API 37; Welcome opened, app displayed its sample-data label and guest form rendered after tap | Pass (UI-MOCK only) |
| AVD live guest | Tap guest, enter synthetic display name and continue | GoTrue `POST /signup` returned 200; one anonymous identity was persisted; Home rendered | Pass (Android–API smoke) |
| AVD live create | Select lunch and 10 dishes, then continue | With canonical creation enabled on owned QA, one GM-07.B-supplement room was persisted with 10 locked dishes from release 1.1.0; preference screen rendered | Pass (Android–API smoke, create only) |
| Live setup copy | Live route should describe live data | Setup and preference screens displayed the mock/sample label despite a persisted real QA room; `DishSetupFrame` defaults `isMock` to true | Fail (copy; GM-10/25 setup owner) |
| Figma frame evidence | Resolve current design context and capture frame/app pair | Repository node map received. Direct frame URL could not be retrieved in this session | Not run |
| Camera source audit | Physical QR requires native capture and usable permission | Native adapter returns denied unconditionally; config blocks Android CAMERA. GM-30 follow-up required before P13 | Gap |
| Stage 3B cases P01–P16 | Native app on physical USB with independently authenticated second client and approved runtime | No physical run, native delivery or Places provider verification | Not run |

The mock screenshots are local at `.work/gm33/avd-smoke.png` (1080 ×
2400 at 420dpi, approximately 412dp), `avd-welcome-360-font200.png`,
`avd-welcome-320-font200.png` and `avd-guest-320-font200.png` under the
same directory. At 320dp the guest action was reachable after scrolling.
This covers the Welcome/guest transition; it does not grade all layouts,
TalkBack or Figma parity.

The live AVD used the separate GM-03 run `gm33-avd-1109`, loopback API
port 54441 via ADB reverse, schema ledger of 28 migrations through 0041,
and contract `dish-session-v4/roadmap-v2/GM-07.B-supplement`. Manifest seal
`8b4905db966146f3b364ab6fc5477ffe145032c046e19f7d48fa8d4086af8768`.
The real 39-dish test release `dish-catalogue-v1:1.1.0` had source SHA-256
`776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`.
Before enabling canonical creation, REST returned HTTP 400 and the UI
kept the draft with a retry message. After opting in on the verified
disposable stack, the server stored requested/pool counts 10/10 and one
canonical room. The successful setup tap used a taller AVD viewport at
the same ~412dp width. This run stopped before a verified lobby transition.
Two-client voting, native capability and phone acceptance remain untested.
Stopped the owned QA worker, stack and network, removed the three temporary
ADB forwards and closed the owned read-only AVD.

Python regression collected 681 tests with 6 skipped and passed.
For pilot setup and capabilities see [handoff](HANDOFF.md).
