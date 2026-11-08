# GM-02 — Figma parity evidence

## Home composition follow-up — 2026-10-27

The earlier entry marked the Home layout as still old. That is superseded by the current working-tree implementation: [Figma frame 330:3067](../GM-09/figma/330-3067-home.png) is now composed in `Gm25HomeScreen` using the shared header/button/avatar components and reusable banner/bottom-navigation components. Logo, banner and icon export provenance is in [`mobile/assets/brand/SOURCE.md`](../../../../mobile/assets/brand/SOURCE.md). Automated component/route tests and Android JS export pass; this exact updated Home has **not** been visually captured on Android, so full parity remains unverified.

The screenshots `android-emulator-home-100.png` and `android-emulator-home-200.png` below are pre-patch and must not be used as evidence for the updated composition.

## Android comparison — 2026-10-27

The approved light palette is now applied to shared theme tokens, the shared header now uses the official G mark, and button pressed states use the approved colors. This is a partial visual update. The retained Android captures below are from before the code patch and must not be read as screenshots of the new source. The Home card layout, ramen illustration, content, and bottom navigation still differ from the approved frame, so full Figma parity is not established.

| Artifact | Observation |
| --- | --- |
| [Figma entry frame](figma/298-2309-entry.png) | Approved green welcome/entry visual with G mark |
| [Figma palette](figma/2-16-palette.png) | Green/cream/sage palette |
| [Android Home at 100%](android-emulator-home-100.png) | Pre-patch baseline: old orange Home with ramen emoji |
| [Android Home at 200%](android-emulator-home-200.png) | Pre-patch baseline at large font scale |
| [Logo export](../../../../mobile/assets/brand/gcd-logo-master.png) | Official G mark exported from Figma node `22:394`; source/hash in `mobile/assets/brand/SOURCE.md` |

The current patch brings shared color and branding closer to Figma. GM-09 still owns the Home screen composition and its matching artwork/navigation; GM-05 owns the complete shared component system. No screen-level parity is claimed from token/component checks alone.

Checked: 2026-10-26. Figma file: `3Ysh0mOAEkAgA5DgZPSC1j`. Figma MCP returned rendered node context and screenshots but did not expose a file revision ID; the check timestamp and image hashes below pin the evidence that was read.

| Node | What was inspected | Evidence | Scope decision |
| --- | --- | --- | --- |
| `298:2309` | Entry/welcome screen; Inter family and 400/500/600/700 weights | [Screenshot](figma/298-2309-entry.png), SHA-256 `9dc093e2071dd7e33e68ae4ef03cd28c0529745ef9ce400695478b927a4f0fd4` | GM-02 provides the font runtime and navigation foundation. Full welcome/login product UI remains with the screen task. |
| `2:16` | Palette: green `#46C34F`, cream `#FFFCF3`, sage `#B9CB9B` | [Screenshot](figma/2-16-palette.png), SHA-256 `5119738c42ed7e47d3ae092c638b2332a285a80684361da3b79815a41d9660d7` | Tokens and component-wide palette remain with GM-05; no global redesign in GM-02. |
| `9:77` | Button typography sample, 14/20 Semibold | [Screenshot](figma/9-77-button.png), SHA-256 `af989636449c85798b8b2814cf7ae2705e2a6cfe804a7af6ae59854868cf92c0` | Mapping exposes Semibold to GM-05. GM-02 only demonstrates the four font weights on `/foundation` and the shell. |

Inter 4.1 static TTFs and SIL Open Font License are in `mobile/assets/fonts/`; upstream source URLs and per-file SHA-256 values are recorded in `mobile/assets/fonts/SOURCE.md`. The app-side screenshot comparison on an Android device remains **Not run** until Expo Go is opened on the device; a Figma screenshot is not evidence that the app rendered it.
