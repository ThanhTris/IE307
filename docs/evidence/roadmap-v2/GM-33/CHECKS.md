# GM-33 preparation checks

## Main refresh and physical USB rerun — 2026-11-12

GM-25 #168 and GM-26 #169 are merged on main `c7bb6aa`. GM-33 was
rebased onto that main before this run. The APK/app source is
`7a13ba38b446c01a373c0dffa74f8b11823eb6e7`; its mobile tree matches main
and producer-tested revision `91ba58a`. No separate application patch,
dependency update or production deployment was included.

| Provenance | Actual |
| --- | --- |
| APK SHA-256 | `6e389d7c136561bfbced1f29e7dea9617bf8e651c3a3624c445961d02bcbf18c` |
| Embedded JS SHA-256 | `4cd8b88c246d19085e7ef0732f8fadc0c249d312058d58a97d19068e457eaf28` |
| Owned QA | `gm33-usbmain-1112`, loopback API/DB 54641/54642, Auth + REST + policy worker, 28 migrations, catalogue 1.1.0 |
| Manifest SHA-256 | `ac3abbc29094d5e90293e57e15c54256f9003ae959d6bfa717b5c57732f95e02` |
| Runtime seal | `471afc134d3ed7c6f6dfc801a2988a5f770e94b9a8d7bde6a6afcf8190792ebb` |
| Preflight | Ready for manual setup; GM-32 received runtime inventory matched, source/main verified, authorized USB found |
| Clients | Physical RMX3710 API 35 and independent API 37 AVD; two distinct guests on the real QA API |
| Phone viewport | 1080×2400, 408 dpi, 423.53dp display width, original font scale 0.9; not a 412dp Figma comparison |
| Build mode | Expo 58.0.23, arm64 release variant, embedded JS, debug signing, minification disabled, loopback-only cleartext exception in the disposable native build |

### Observed scenarios

| Case/input | Actual and assertion | Scope |
| --- | --- | --- |
| P01 guest and P15 valid restart | Both clients authenticated as distinct guests. After phone force-stop/reopen, account count stayed two and the complete persisted-result digest was unchanged | Pass for valid-session restore; not TTL/revocation or pending-submit recovery |
| P02 phone requests 20 dinner dishes | UI reported seven available and a minimum of ten; no additional room was created | Pass for this shortage input; preliminary frame remains private/Unreviewed |
| P02 phone requests 20 lunch dishes | DB stored requested count 20, pool 20. Subsequent host cancellation through the normal lobby UI reached `CANCELLED` | Pass for this setup/cancel input |
| P02/P04 AVD host requests 10 lunch dishes | Primary room retained ten dishes and two members; phone joined and displayed the same pool | Pass for the stated two-client case; larger rosters and settings/start race Not run |
| P03 cold native invitation | Phone preview showed 1/20; confirmation joined once, then opened own preferences via `/room/setup`. Server membership became two | Pass for cold-confirm join; manual/warm/expired/full variants Not run |
| P05 separate preferences | Host chose Cơm, phone chose Lẩu, saved/refetched. Two independent category values remained. Real RPC responses had caller-owned preferences only; member keys were exactly ID/name/role/submission status | Pass for this two-client category case; see redacted expected/actual JSON |
| P04 natural start | Both clients opened Round 1 after host Start. No QA vote route or member reload was used | Pass for P04's two-member transition |
| P06/P07/P08 first timeout | Only host submitted ten OK choices and entered waiting. Phone sent no ballot and automatically opened Round 2 after server timeout | Pass for this timeout path; after-ACK network loss, majority and replay boundaries Not run |
| P08/P09 second timeout | Only host confirmed KEEP for all ten candidates. Both clients automatically opened Miến / 1 point. SQL confirmed one canonical result, two host ballots and zero member ballots; result had three ranked dishes | Pass for normal R2/persisted delivery; singleton, cap+1 and no-consensus Not run |
| P09/P11 after restart | Phone opened the authorized result Inbox item and fetched the same Miến result | Pass for this Inbox/refetch case; remote push, friend/invite variants Not run |
| P12 native settings entry | The phone opened `/push-settings`, showing denied permission and missing EAS Project ID | Pass for entry/config-missing state only; real FCM blocked |
| P01 explicit guest logout | Phone confirmed logout in product settings and returned to Welcome | Pass for this QA guest logout; expiry/revocation variants remain Not run |

R1 submit was accepted at `2026-11-12T06:44:11.123735Z`, waiting began at
`06:44:11.159337Z`, expected deadline `06:45:11.159337Z`. R2 submit was
accepted at `06:47:03.379927Z`, waiting began at `06:47:03.414096Z`, deadline
`06:48:03.414096Z`. The result finalized 61.019 seconds after R2 waiting
entry. No host early-finalize request was sent. These are QA UTC timestamps,
not device-clock calculations. The before/after result-row continuity digest
was `88159380b6f5c02496f741846d737c8d`.

[Preference privacy expected/actual](PREFERENCE_PRIVACY_2026-11-12.json)
contains only redacted audit metadata. Two loopback, forwarding-only audit
proxies inspected snapshot field names/digests, without storing headers,
tokens or raw payloads. Successful responses came from the real QA RPC.
Private raw frames and logs remain under `.work/gm33/`. Selected checkpoint
hashes and limitations are recorded in the [current run summary](CURRENT_RUN_2026-11-12.json). Captures
remain Unreviewed until Trí assesses them; a screenshot alone does not prove
an entire case or Figma parity.

### Capture/build corrections

An initial incremental APK retained the prior QA URL even though the build
environment changed. It was rejected before any Pass was attributed to it.
The final build explicitly reran `createBundleReleaseJsAndAssets` before
assembly. Capture now checks the installed APK checksum and presence of the
verified QA origin in its embedded JS, and records the bundle/tool hashes.
Hermes can concatenate another numeric literal immediately after the origin;
the guard handles that format. Literal presence is a stale-build check,
not proof of effective networking: successful Auth/RPC and DB assertions
above provide the runtime check.

Capture also checks the focused window before and after the image, in
addition to the resumed activity. A foreign focused overlay or missing
focus evidence blocks capture. Vendor focus fields in the activity dump
are supported. The final capture utility fingerprint is recorded per
checkpoint; the later tooling/documentation commit does not alter mobile
source or the tested APK.

### Checks and remaining gates

Host checks used Node 24.15.0 and Python 3.12.14 on macOS; the native build
used Zulu JDK 17. Use the pinned repository lockfiles, not historical SDK
versions in the earlier receipts.

- Thirteen GM-33 tool tests pass. Full Python: 693 tests run, six skipped,
  no failures. Mobile source is unchanged by GM-33: typecheck, lint,
  architecture and full Jest passed (1,366 tests, one skipped).
- Repository validator, task indexes and whitespace checks pass. The live
  Project dependency/output gate against fetched main returns
  `READY_FOR_MERGE_REVIEW`; this is not acceptance of Stage 3B execution.
- P12 still needs real FCM configuration/delivery. The existing
  `/push-settings` route opens on the phone and reports denied permission
  and missing EAS Project ID; no real push was sent or claimed.
- P13 is blocked by the denied-only native scanner and blocked CAMERA
  permission on main; native scanner delivery belongs to GM-30.
- P14 has no configured restricted Places QA key in the checked inputs;
  real Places/Map success has not been exercised.
- P16 matching Figma, 412/320/360dp, font 200%, TalkBack and the complete
  keyboard/Back matrix remain Not run. Current captures retain the original
  phone settings and are not visual parity evidence.
- Larger rosters/races, majority finish, singleton/cap/no-consensus,
  consent/history deletion/revocation, session expiry and pending/outbox
  recovery remain required. GM-33 is not Done or merge-ready; no Project
  state or reviewer approval was changed.

After the run, the QA guest was logged out, original phone power settings
were restored, only the owned reverse ports/AVD were stopped, and the
producer stop command removed this run's worker/stack/network. No containers
remain for `gm33-usbmain-1112`. Audit proxies and temporary room references
were cleared. The application database was not reset or migrated.

The earlier sections below are historical evidence on their own revisions;
they are not relabelled as execution on this main refresh.

## Authorized USB phone retry on 2026-11-11

The RMX3710 was authorized over USB. A local debug-signed APK with embedded
JavaScript ran on the physical Android API 35 phone and an independent
API 37 AVD. Main was `7913585`; the application includes the separate
local GM-25 and GM-26 correction candidates described below.

| Run input | Recorded value |
| --- | --- |
| Backend | Owned `gm33-usb-1111b`, API/DB 54581/54582, 28 migrations, verified runtime inventory and real test catalogue 1.1.0 |
| Manifest seal | `7056a29e3e02dd31f71b0183ea27132b965ab8690fafce77b44158fde753a2a4` |
| Installed APK SHA-256 | `a6046dfbf6b14f57736519f7ef66af6f7e8aea30de9284bf25d0b8db9b5c609c` |
| App source patch SHA-256 | `aac12d35698d6ad131bffaeb72b52372c24fde1f0691e6affb8b30b118ee21b3`, applied to main `7913585` |
| Phone viewport | 1080 × 2400, 408dpi, display width 423.53dp, original font scale 0.9 |
| Capture provenance | `gm33_capture.py` verified installed APK and QA manifest for P04, P08 and P09. Private checkpoints and `build-provenance.json` are under `.work/gm33/captures/gm33-usb-1111b/` with assessment Unreviewed |

| Case and input | Actual assertion | Result and limit |
| --- | --- | --- |
| P01 two clients | Distinct guest sessions on phone and AVD authenticated to owned QA | Pass for guest sign-in |
| P02 phone requests 20 dinner dishes | UI showed seven available and a minimum of ten. No room existed after the rejected attempt | Pass for below-minimum shortage |
| P02 phone requests 20 lunch dishes | Backend stored requested count and pool count 20/20 from release 1.1.0. Preferences showed live copy | Pass for 20-dish setup |
| Setup cancellation | Phone canceled its 20-dish room through the confirmation UI before the main two-client scenario | Pass for this cancellation |
| P03 cold native link | Phone restored its session and opened join preview. The primary room had one member before confirm and two afterward. Receipt showed “Đã vào phòng” with no observed blocked-link warning | Pass for cold-link join and live receipt |
| P04 primary roster 2 and requested count 11 | AVD host started. Phone automatically displayed Round 1. Server locked roster two and retained the 11-card pool | Pass for the two-member transition |
| P06/P08 only host submits R1 | Server accepted one host ballot. On waiting timeout, the phone automatically displayed Round 2 without sending a ballot, reloading or opening a QA vote route | Pass for this timeout transition |
| P08/P09 only host submits R2 | On waiting timeout, both clients opened the same winner with one point. Server reached DECIDED with one persisted result and two ballots from the host only | Pass for unsent-member result delivery |
| P01/P15 limited restart | Force-stop/reopen on the phone restored Home. Anonymous-account count and persisted-result digest matched before and after | Pass for valid-session and terminal persistence. Pending submit and offline replay untested |
| P11 Inbox | Phone opened the native Inbox route after restart and read “Kết quả phòng đã sẵn sàng” | Pass for authorized result Inbox read. Remote push untested |

The primary scenario used 11 dishes. The phone also exercised the
20-dish and below-minimum setup cases. The native 10-dish lower-bound
case, larger rosters, edit/start races, preference privacy, additional
R2 boundaries and the other remaining matrix cases still need execution.
Native QR, real FCM, live Places, Figma parity and the full accessibility
matrix remain outstanding. The GM-25 and GM-26 source fixes await their
own review and integration before this can establish target-main acceptance.
The application corrections are published separately as
[GM-25 PR #168](https://github.com/ThanhTris/IE307/pull/168), commit
`232ae4c`, and [GM-26 PR #169](https://github.com/ThanhTris/IE307/pull/169),
commit `3351c54`. The recorded source patch corresponds to their
application changes. Receive both reviewed revisions before the next
target-main pilot.
The phone's original display-power setting was restored after testing.
Owned API forwards, AVD, QA worker, Supabase stack and network were
removed, and temporary room references were cleared. A final fetch
still reported main `7913585`. Repository, task-index, nine GM-33
tool tests and whitespace checks passed.

## Native candidate refresh on 2026-11-11

Main remained `7913585` after fetch. The USB transport was enumerated as
`unauthorized`, so this run used two independently authenticated Android
API 37 AVDs. The phone requires confirmation of the USB debugging prompt
before standalone installation or physical-device checks can proceed.

| Input or case | Actual result |
| --- | --- |
| Backend | Owned run `gm33-native-1111`, 28 migrations, catalogue 1.1.0, current GM-32 runtime inventory. Seal `c9d18a2ab78aed180e3b837a25d9780eed254d2fa324e1a7a4ed351cf35b4f53` |
| App | Expo 58.0.23, embedded JS in a local debug-signed arm64 release-mode APK. Main mobile source plus isolated GM-25 and GM-26 candidate patches. APK SHA-256 `94f8312a5a5ed7b895fd1cd8e95cd2a7365fcb516d9760efb5268a379de4d1ee`; combined source patch SHA-256 `aac12d35698d6ad131bffaeb72b52372c24fde1f0691e6affb8b30b118ee21b3` |
| P02–P04 | Host created ten lunch dishes. Cold app link led the member through confirm to a two-member lobby. Both clients entered Round 1 after host Start |
| P06/P08 | Only host submitted R1. Backend accepted one ballot, expired the waiting period and opened R2. Both clients displayed Round 2, including the member who had not submitted. No manual refresh or vote-route override was used |
| P08/P09 | Only host submitted R2. After timeout the server reached `DECIDED`. Both clients displayed the same winner and score. Backend contained one result and two ballots belonging to one caller; no ballot was synthesized for the member |
| P01/P15 limited restore | After force-stop and reopening client C, Home loaded. Anonymous-account count and the persisted-result digest matched before and after. Pending-submit/offline replay was not exercised |
| GM-26 regressions | 37 focused tests and full mobile suite passed. Full suite had 1,516 passing tests and one skipped. TypeScript, ESLint and architecture checks passed |
| GM-33 tooling | Nine tests passed. The POSIX directory-mode assertion is conditional on `os.name != 'nt'`, addressing the review comment. Windows execution remains untested on this Mac |
| Python regression | 688 tests ran, six skipped, no failures |

The GM-25 and GM-26 application fixes are separate local branches.
Their combined APK is QA integration evidence. Acceptance and merge of
those task changes, physical-device cases, remote providers and Figma
parity remain pending. PR #166 was still open when routes were checked;
reconcile the route matrix once its product cleanup reaches main.
The owned worker, Supabase stack and network were stopped. Both owned
AVDs and their temporary forwards were closed, and temporary room
references were removed. The phone remained unauthorized at the last check.

## Standalone APK and GM-25 follow-up on 2026-11-10

A local debug-signed, arm64 release-mode APK was built from main
`79135856eb673bedc47ceae033c851d2791e36a5` with its JS bundle embedded.
Its SHA-256 is `698b8974b415c47af2fcf53b5a897ebbffdf5c8910c82abbdd5b84a20cacb573`.
A second APK used the same baseline plus the local
`codex/gm-25-live-lobby-followup` source patch and an untracked,
loopback-only Android network configuration for owned QA.

| Input or case | Actual result |
| --- | --- |
| Provenance | Expo 58.0.23, two Android API 37 AVDs, run `gm33-native-1110`, 28 migrations and catalogue 1.1.0. QA seal `14e6a6a9c2c7c38773ab059e433eb1a7dc37587f475f41e8c91c637394e51cc2` |
| APK and source patch | APK SHA-256 `63ae1430b900ac41fb361fe6e161830e6cdf6296ee7206b9b30594d21303874b`. App source patch SHA-256 `977bdd420d119d505df5d93500be43d972aeabc6083d30275b1bf928f7966ee6` |
| P02 setup | Two independent guests authenticated. Host requested ten lunch dishes and backend stored ten distinct dishes from release 1.1.0. Setup and preferences showed live copy |
| P03 cold link | Android delivered the app's join URI on cold start. Preview showed one member and left backend membership unchanged. Confirm moved membership to two and the receipt read “Đã vào phòng” |
| P04 member transition | Host started from the lobby. Backend locked roster two and entered `ROUND_1`. Both AVDs showed voting without a member reload or explicit vote route |
| P06/P07 one of two submits | Host sent a complete ballot and the UI reported early finish locked at one of two. The backend was still in `WAITING_1` at 61.1 seconds and was in `ROUND_2` at the next sample at 63.1 seconds |
| P08 member who did not submit | Host displayed Round 2. The member who had not submitted remained on the Round 1 screen after the timeout and a later read. This is a separate GM-26 UI–API regression |
| USB install | Play Protect required interaction during install. No USB standalone execution was established for this run |

These checks are an AVD regression of the GM-25 candidate. The earlier
USB Expo Go results remain separate. Private Android checkpoints stay
under ignored `.work/gm33/`.

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
