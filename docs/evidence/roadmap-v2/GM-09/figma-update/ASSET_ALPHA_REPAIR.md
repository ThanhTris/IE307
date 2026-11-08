# GM-09 — actual-device opaque asset repair

2026-11-02, branch `codex/gm-09-figma-update`, base8fb5fb5, owner Tuấn/reviewer Trí.
User supplied two actual Expo Go screenshots showing a large cream rectangle
over Welcome and solid icon tiles on Home. Inputs remain ignored in
`.work/gm09-error-screens/`; no personal screenshot is committed.

Start gate: live GitHub Project at2026-11-02T06:26:29Z, `READY_TO_CLAIM`.
This is only a dependency/artifact check, not human approval.

## Diagnosis and correction

All11 legacy monochrome icon files and both welcome-ring files contained only
fully opaque pixels. React Native tint applies to all nontransparent pixels,
so opaque grey/cream/green image mattes became filled squares. Welcome rendered
the untinted cream matte at the ring's full334 × 390/207 × 240 bounds.

Recover glyph/stroke coverage and save real32-bit RGBA PNGs. Retain file paths,
natural dimensions and callsites: header bell/back, Home CTAs/lightning,
friend-add icon, bottom tabs and welcome decorations. Keep tint for dark/light
themes. The banner illustration and logo are multicolor artwork and unchanged.
Home join also had the wrong plus artwork, now replaced by the exact enter
glyph from the received component PNG in its existing32px slot.

[Asset provenance](../../../../../mobile/assets/brand/ALPHA_REPAIR_2026-11-02.md)
documents matte/foreground, coverage recovery, source crop and native slots.
[Manifest](ASSET_ALPHA_MANIFEST.json) pins before/after hashes and alpha counts.
Historical step manifests remain unchanged.

## Verification boundaries

Final results:14 Node PNG checks Pass;36 Jest suites/797 tests Pass in57.308s;
TypeScript and source/tests/scripts ESLint Pass; architecture and installed Expo
check Pass with offline limitation. Final Android export contains
entry-6363d30c7094b01f5080317d8087367f.hbc (3.6MB).
Full Python:657 tests,650 passed/6 skipped/1 existing WinError1314 symlink error
in139.488s; no assertion failures. [Sanitized check summary](ASSET_ALPHA_CHECKS.json).
[Asset compositing proof](asset-alpha-before-after.png) compares the actual
before/after files and uses the same alpha-based tint semantics as native Image;
it is explicitly labeled as an asset check, not a post-fix Android screenshot.

Thirteen pixel-level assertions initially failed against the original files.
The committed Node test uses only built-in fs/zlib/assert, decodes the actual
PNG filters and checks transparent background plus retained antialiased ink.
It runs separately from Jest, avoiding Node ambient-type/package changes to the
React Native project. Final14 cases also check that create/join masks differ.

The first broad Jest run overlapped build/tooling work and had a5s router-test
timeout (809 Pass/1 Fail while the temporary13 asset cases were still in Jest).
No timeout/test assertion was relaxed; verification reruns the final Jest suite
alone after asset work is complete. The Node cases remain a separate14-test run.

The visual proof is an asset compositor over cream/green, not an app screenshot
or Android acceptance. Original screenshot reports demonstrate the pre-fix
failure only. The machine has no Android SDK/ADB, so a post-fix native screenshot,
font-scale/TalkBack/keyboard/device-layout verification remains **Not run**.

No React Native runtime code, package/config, API, schema, migration, ballot
logic or real/mock routing is changed. No Task Done/approval or Figma write.
Commit locally per the user's standing instruction; no GitHub push.

## Recheck on the same phone

Stop Metro (`Ctrl+C`) and start from repo root with
`npm --prefix mobile start -- --clear`. Close/reopen Expo Go and scan the new QR
to reload the asset bundle. Keep the current mock/real configuration unchanged.
Check Welcome in dark/light: no cream rectangle, only faint ornament rings.
Check Home: bell, plus, enter, lightning, add-friend and four bottom tabs show
their glyphs, with proper active/inactive colors. Use the same viewport as the
reported device screenshots; asset compositing alone is not a device retest.
