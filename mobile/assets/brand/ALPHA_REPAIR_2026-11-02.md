# Corrected alpha for received brand assets

User reported actual Expo Go rendering failures in two screenshots under
`.work/gm09-error-screens/` on2026-11-02. Original exports used by the app had
alpha255 at every pixel: tinted icons rendered as solid squares and welcome
rings drew their complete cream export rectangles over the hero.

This correction removes the flattened export matte from11 monochrome icons and
two welcome-ring PNGs. Dimensions, existing file paths, native render slots and
component `tintColor` behavior remain unchanged. Multi-color logo and dining
illustrations are not converted to masks. The separate `entry-ui/` masks already
have valid alpha and are unchanged.

For flattened color C, background B and foreground F, coverage is recovered as
`clamp(dot(C-B,F-B)/dot(F-B,F-B),0,1)`. Write RGBA8 with F and coverage alpha.
Use floating-point clamping to preserve antialiasing and the rings' faint stroke.
Rounding in a previously flattened8-bit PNG means original alpha cannot be
recovered bit-for-bit; the same visible stroke pixels and natural sizes remain.

| Asset group | Export matte | Foreground |
| --- | --- | --- |
| icons/*.png and home/back.png |#F2F2F2|#043B22|
| home/create.png |#238633|white|
| entry/welcome-ring-*.png |#FFFCF3|white, partial coverage|

`home/join.png` additionally contained a plus instead of the enter glyph.
Replace it using the exact enter drawing from the user's authorized PNG
`02 - Components/02 · Icon.png`:48 × 48 region at x2327/y256. Remove its grey
matte, then resample to the existing32 × 32 asset with high-quality bicubic
filtering. It now matches the join action; no new icon drawing or package.

Current hashes/dimensions/alpha counts and the received error-image hashes are
recorded in the GM-09 [repair manifest](../../../docs/evidence/roadmap-v2/GM-09/figma-update/ASSET_ALPHA_MANIFEST.json).
Earlier SOURCE.md tables and step manifests are historical receipt hashes;
they are not assertions that an opaque original is still the runtime asset.

Verification: `node --test mobile/tests/brandAssetTransparency.test.mjs` decodes
actual PNG scanlines, checks transparent background, nonempty antialiased glyphs,
ring coverage, natural sizes and distinct create/join artwork. React Native Jest
Image mocks alone cannot detect this defect. Native screenshots after repair
still require Expo Go/device confirmation; no new device acceptance is claimed.
