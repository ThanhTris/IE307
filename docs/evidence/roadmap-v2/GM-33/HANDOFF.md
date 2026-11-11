# GM-33 pilot handoff

The GM-33 worktree is based on main `7913585`, which includes the merged
[GM-32 PR #163](https://github.com/ThanhTris/IE307/pull/163) and the earlier
[GM-40 PR #164](https://github.com/ThanhTris/IE307/pull/164). It receives
the [GM-32 handoff](../GM-32/HANDOFF.md) and
[regression run inventory](../GM-32/manifest-regression/RUNS.json).

The authorized USB run on 2026-11-11 exercised a standalone APK on
the API 35 phone with an independent API 37 AVD and owned QA backend.
The latest [checks](CHECKS.md) record native setup, join, lobby, timeout,
result, restart and Inbox assertions alongside remaining mandatory cases.

Receive the application corrections through
[GM-25 PR #168](https://github.com/ThanhTris/IE307/pull/168), commit
`232ae4c`, and [GM-26 PR #169](https://github.com/ThanhTris/IE307/pull/169),
commit `3351c54`. The tested APK combines their source changes over
main `7913585`. Both PRs need their own review and integration.
Real camera QR, FCM, Places, Figma/accessibility and the unexecuted
boundary cases still block GM-33 acceptance.

## Prepare the test run

### Build a local Android APK

Use a disposable checkout of the target revision for generated Android
files. Install the locked mobile dependencies and generate the Android
project before assembling an embedded JavaScript bundle.

```sh
cd mobile
npm ci
CI=1 npx --no-install expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The local generated release variant uses the debug signing configuration.
The APK is under `app/build/outputs/apk/release/`. An APK built with no QA
public key opens the mock composition. For live QA, use a freshly verified
owned API origin and publishable key at bundle time. If using ADB reverse
with a plain HTTP origin, scope any generated Android cleartext exception
to loopback in the disposable build. Record the APK checksum, app source
revision and any local source patch. The QA URL and key are tied to that
run. The [standalone build checks](CHECKS.md) distinguish this local
artifact from the APK with all Stage 3B capabilities.

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
     --case P06 --client A --checkpoint after-ack --figma-node 638:9369
   ```

   Capture first verifies the installed APK's checksum against the supplied
   standalone APK, then saves `app.png` and `capture.json` to
   `.work/gm33/captures/<run-id>/P06-A-after-ack/`. Use separate checkpoints
   for client B and for reconnect or a later state. Supply a standalone APK
   installed as one package file. Split installs require separate build
   provenance. The report records physical display width and font scale.
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
- The live setup frame shows sample-data copy when it receives the live
  gateway. Send the reproduced case to the GM-10/25 setup owner with the
  source revision and observed persisted room counts.
- The live join receipt shows “Đã vào phòng mẫu” after a real member join.
  Review the receipt in the GM-25/30 room-entry flow. Recheck the link
  warning on the standalone build because the reproduction used Expo Go.
- The member remains in the lobby when the host starts, even after a
  manual reload while the server is in `ROUND_1`. Route this to the GM-25
  lobby integration owner. The vote QA route can isolate later cases.
  Verify that both members enter voting naturally before accepting P04.
- GM-29 supplies push setup and app routing. Use the QA provider and build
  configuration for physical delivery; producer AVD or fake-provider runs
  only cover their recorded modes.
- GM-31 supplies storage/recovery. Verify actual device SecureStore and
  SQLite with an installed native build.
- GM-32 supplies revision-specific server evidence. GM-33 verifies the
  corresponding app requests and user-visible behavior on the pilot build.

See [current checks](CHECKS.md) for observed preparation results.
