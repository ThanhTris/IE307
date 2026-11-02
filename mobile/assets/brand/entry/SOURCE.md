# GM-09 entry artwork

**2026-11-02 correction:** the two received PNGs had a baked cream matte and
displayed as an opaque rectangle on Android. Their runtime alpha is now repaired
while retaining the faint white stroke, original dimensions and placements.
Hashes below identify original receipt; see [current repair](../ALPHA_REPAIR_2026-11-02.md).

Exported on 2026-10-31 from the owner-provided Figma copy `H2bFJnOVGfxFHHPK3Aqtrq`, using `download_assets` for individual decoration nodes. PNG exports preserve the source artwork and allow Android `Image` consumption without an SVG/native dependency. They are not screenshots of the screen.

| Asset | Figma node | Natural size / rendered slot | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `welcome-ring-large.png` | [298:2311](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=298-2311) | 334 × 390 | 3887 | `17a3a78925bab13d4ba1a65a6315270f8250f54a426bae0d866b52a69f3a71a1` |
| `welcome-ring-small.png` | [298:2312](https://www.figma.com/design/H2bFJnOVGfxFHHPK3Aqtrq?node-id=298-2312) | 207 × 240 | 2460 | `3d1019d62afc60b2d4069fcfbc6197ab1dcfef2d1a4ab41151666391b17e5e90f` |

The logical ellipse nodes are 390×390 and 240×240. Figma's PNG export clips them at the 412dp parent frame: x78→412 and x205→412. `WelcomeScreen` places those clipped exports at x78/x205 with the measured 334×390 / 207×240 dimensions; it does not stretch the cropped PNGs back into squares. The large G and ribbons are text/rectangle layers in Figma, implemented with native Text/View. Logo uses the existing exact `gcd-logo-master.png` from node `22:394`; provenance/hash remain in [the parent source ledger](../SOURCE.md). Guest's 72dp logo container contains the source's 44dp mark, as returned by design context; the bitmap is not stretched to 72dp.

Android renders its own system status/navigation bars; the Figma status icon asset is not drawn as a second fake system bar. Temporary asset URLs are not retained in runtime or this ledger. The screenshots in GM-09 evidence are comparison references only. Effective rendered geometry still requires Android visual verification; the source/slot inspection above does not claim that check passed.
