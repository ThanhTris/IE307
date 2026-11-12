# GM-33 pilot handoff

The GM-33 worktree was rebased onto main `c7bb6aa` on 2026-11-12. It includes
[GM-32 PR #163](https://github.com/ThanhTris/IE307/pull/163),
[GM-40 PR #164](https://github.com/ThanhTris/IE307/pull/164), product cleanup
#166 and the merged GM-25 #168 / GM-26 #169 corrections. It receives
the [GM-32 handoff](../GM-32/HANDOFF.md) and
[regression run inventory](../GM-32/manifest-regression/RUNS.json).

The authorized USB run on 2026-11-11 exercised a standalone APK on
the API 35 phone with an independent API 37 AVD and owned QA backend.
The latest [checks](CHECKS.md) record native setup, join, lobby, timeout,
result, restart and Inbox assertions alongside remaining mandatory cases.

Receive the reviewed corrections through
[GM-25 PR #168](https://github.com/ThanhTris/IE307/pull/168), merged as
`5321490`, and [GM-26 PR #169](https://github.com/ThanhTris/IE307/pull/169),
merged as `c7bb6aa`. No separate app patch is required. Mobile source on
this branch matches the producer-tested app revision `91ba58a`; the
producer's new APK/AVD evidence is received evidence, not a new USB pass.
The earlier USB APK combines older candidates over main `7913585` and
must not be relabelled as a test of the updated main.
Real camera QR, FCM, Places, Figma/accessibility and the unexecuted
boundary cases still block GM-33 acceptance.

## Prepare the test run

### Current USB receipt — 2026-11-12

Run `gm33-usbmain-1112` verified the current main mobile tree on the API 35
phone and an independent API 37 AVD. APK/app source is `7a13ba3`; APK
SHA-256 is `6e389d7c136561bfbced1f29e7dea9617bf8e651c3a3624c445961d02bcbf18c`.
The capture utility's later source fingerprint is recorded per checkpoint;
only tooling/docs changed after the app source was pinned.

Phone 20-dish lunch setup, seven-dish dinner shortage, cold native join,
natural lobby-to-R1, both unsent-member timeout transitions, persisted
result, force-stop restore and result Inbox read were exercised. P05 also
saved/refetched separate Cơm/Lẩu preferences on both clients and audited
real snapshot field names without publishing headers/tokens/payloads.
Receive [current checks](CHECKS.md#main-refresh-and-physical-usb-rerun--2026-11-12),
[redacted run metadata](CURRENT_RUN_2026-11-12.json) and
[preference assertions](PREFERENCE_PRIVACY_2026-11-12.json).

Capture now rejects an APK that lacks the verified QA origin in its
embedded bundle and blocks foreign focused windows. It supports vendor
focus metadata and Hermes string-pool layout. Thirteen tool tests pass;
full Python runs 693 tests with six skipped, and the unchanged mobile tree
passes typecheck/lint/architecture and 1,366 Jest tests (one skipped).

This is still a partial Stage 3B handoff. Native push settings opens but
EAS/FCM is not configured; real camera is blocked by the current GM-30
adapter/config; live Places QA configuration is absent. The full visual,
accessibility and unexecuted boundary/recovery matrix remains required.
Keep GM-33 unapproved/not Done and do not merge on the basis of the
dependency/file gate alone.

### Build a local Android APK

Use a disposable checkout of the target revision for generated Android
files. Install the locked mobile dependencies and generate the Android
project before assembling an embedded JavaScript bundle.

```sh
cd mobile
npm ci
CI=1 npx --no-install expo prebuild --platform android --no-install
cd android
./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks -PreactNativeArchitectures=arm64-v8a
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The local generated release variant uses the debug signing configuration.
The APK is under `app/build/outputs/apk/release/`. Without a QA public key,
the app shows a backend configuration error; product cleanup removed the
mock composition. For live QA, use a freshly verified
owned API origin and publishable key at bundle time. If using ADB reverse
with a plain HTTP origin, scope any generated Android cleartext exception
to loopback in the disposable build. Record the APK checksum, app source
revision and any local source patch. The QA URL and key are tied to that
run. The [standalone build checks](CHECKS.md) distinguish this local
artifact from the APK with all Stage 3B capabilities.
Set the QA URL and publishable key in the environment of both Gradle
commands. A changed environment alone may leave the JS bundle task
UP-TO-DATE when reusing generated Android files; explicitly rerun that
task before assembly. Capture rejects an APK whose embedded bundle lacks
the verified manifest's loopback QA origin. This is a stale-build guard,
not a substitute for proving successful Auth/RPC traffic on that run.

### Run the pilot

1. Fetch `main` and run `python scripts/task_readiness.py --task GM-33`.
   Verify GM-40 is Done on the Project and that both delivered revisions
   are on main. Capture the native APK/build provenance for this source,
   including SDK and the pinned package lock.
2. Use the received GM-03 runner to start one disposable QA project. Retain
   the sealed manifest, distinct ports and the owned run ID. Use Node 24
   and the [Expo baseline](../../../project/EXPO_BASELINE.md). Run preflight
   with that manifest to verify source, live services, worker and data.
   The preflight checks the GM-32 report from the Git revision and compares
   the migration hashes, installed function inventory, schema versions and
   catalogue identities to the verified GM-03 runtime. If these differ,
   run the received regression against the new runtime and record its
   evidence before treating it as the tested build.
   The canonical app flow requires the GM-20 creation capability on the
   owned QA stack. Follow the [canonical writer QA setup](../GM-20/canonical-writer/HANDOFF.md)
   to opt in for that disposable run.

   ```sh
   python scripts/gm33_preflight.py --qa-manifest .work/qa/<run-id>/manifest.json
   ```

3. Use an approved native test build with real camera and QA FCM
   configuration. Confirm live Places uses a restricted QA key. Supply
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` via
   the QA build configuration. Keep keys, build signing materials and
   `google-services.json` private. Use a trusted QA HTTPS origin or a
   dedicated loopback forward on the authorized device.

   ```sh
   adb -s <serial> reverse tcp:<qa-api-port> tcp:<qa-api-port>
   # Use http://127.0.0.1:<qa-api-port> as the app API URL for this run.
   # Use a separate forward if the build requires Metro.
   adb -s <serial> reverse --remove tcp:<qa-api-port>
   npm run qa:stop -- --run-id <run-id>
   ```

4. Use synthetic users and inspect the contract and available QA catalogue
   before voting. Keep app and server evidence from the same run. Record
   Figma frame screenshots and app screenshots against
   [the visual matrix](FIGMA_PARITY.md) and collect private working
   artifacts in `.work/gm33/`. Share redacted evidence only.

   With the pilot app foregrounded on a selected authorized USB phone:

   ```sh
   python scripts/gm33_capture.py \
     --qa-manifest .work/qa/<run-id>/manifest.json \
     --serial <serial> --apk <local-standalone.apk> \
     --case P06 --client A --checkpoint after-ack --figma-node 330:3072
   ```

   Capture first verifies the installed APK's checksum against the supplied
   standalone APK and checks the embedded JS for the verified QA origin,
   then saves `app.png` and `capture.json` to
   `.work/gm33/captures/<run-id>/P06-A-after-ack/`. Use separate checkpoints
   for client B and for reconnect or a later state. Supply a standalone APK
   installed as one package file. Split installs require separate build
   provenance. The report records the embedded bundle hash, physical
   display width and font scale.
   Measure content width separately if insets or cutouts reduce it. Compare
   redacted screenshot copies to Figma. Record the matching HTTP response
   summary and server assertion manually. A capture is Unreviewed until
   the case has been assessed.
5. Before opening or updating a PR for review, run
   `python scripts/task_readiness.py --task GM-33 --gate merge --base-ref origin/main --verify-outputs`.
   Hand actual results, gaps and the reviewed build back to GM-34.

## Received capabilities

- After USB authorization, run `gm33-usb-1111b` exercised the local
  GM-25/GM-26 candidates on the physical API 35 phone and an independent
  AVD. Native cold join, lobby-to-vote, both unsent-member timeout
  transitions, restart and result Inbox read passed for the recorded
  scenarios. Phone setup also passed 20 lunch dishes and seven-dish
  dinner shortage. See [USB checks](CHECKS.md#authorized-usb-phone-retry-on-2026-11-11).
  Camera, remote providers, Figma, accessibility and the remaining
  boundary cases continue to require their own evidence.
- The 2026-11-11 run verified the GM-25 and GM-26 corrections together
  in a standalone APK on two AVDs. The USB phone was `unauthorized`.
  Confirm its USB debugging prompt before resuming the physical pilot.
  The app candidates are published in PRs #168 and #169. Receive their reviewed revisions
  before treating those fixes as integrated on main.
- GM-27/30 own winner and Places integration. The current camera adapter
  always returns denied and the Expo config blocks CAMERA. Real QR capture
  requires a native camera implementation/configuration from GM-30 before
  P13 can pass. Manual entry and labeled simulated QR remain separate cases.
- Historical P02/P03 sample copy and P04 stuck-lobby failures are addressed
  upstream by product cleanup #166 and GM-25 #168, both now on main.
  Current join confirm enters own preferences through `/room/setup`;
  there is no separate receipt route. Use normal product navigation,
  never a removed QA vote route, to verify the refreshed build.
- GM-29 supplies push setup and app routing. Use the QA provider and build
  configuration for physical delivery; producer AVD or fake-provider runs
  only cover their recorded modes.
  `/push-settings` exists and opens on the native build. The checked build
  reports missing EAS Project ID; real QA FCM delivery remains unexecuted.
- GM-31 supplies storage/recovery. Verify actual device SecureStore and
  SQLite with an installed native build.
- GM-32 supplies revision-specific server evidence. GM-33 verifies the
  corresponding app requests and user-visible behavior on the pilot build.

See [current checks](CHECKS.md) for observed preparation results.
