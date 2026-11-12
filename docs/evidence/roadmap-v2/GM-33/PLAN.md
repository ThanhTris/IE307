# GM-33 preparation and pilot plan

Prepare Stage 3B preflight, evidence capture and the frame/state matrix in a dedicated worktree.
The pilot receives the reviewed GM-32 server regression handoff and the
approved GM-40 catalogue. Both must be on the integration target. Keep task
ownership separate so the GM-32 PR can land first.

1. Read the live Project gate and verify the revision of the upstream artifacts
   on current main. Check ADB sees an authorized physical USB device. Verify
   a separate GM-03 QA manifest before exercising the app. Compare its
   migration and function hashes, schema and catalogue to the evidence
   received from GM-32.
2. Use the received Figma node map to plan frame/state comparisons. Resolve
   actual child frames, capture the design revision and screenshots, and
   compare with the same state/data/role and content width in the native app.
   Capture only the selected USB pilot APK after verifying its installed hash.
   Force the embedded JS bundle to rebuild when the QA endpoint changes;
   verify the expected QA origin in the APK and retain its bundle hash.
3. Run the two-identity scenarios and the 2/4/8-client cases. Record observed
   app, HTTP and server state together. Keep backend-only and emulator evidence
   separate from the physical Android run.
4. Send product gaps back to the owning task. Record Pass/Fail/Not run per
   case, then run the merge gate and request Trí's review of the same revision.
