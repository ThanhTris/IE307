# GM-02 — Figma parity evidence

Checked: 2026-10-26. Figma file: `3Ysh0mOAEkAgA5DgZPSC1j`. Figma MCP returned rendered node context and screenshots but did not expose a file revision ID; the check timestamp and image hashes below pin the evidence that was read.

| Node | What was inspected | Evidence | Scope decision |
| --- | --- | --- | --- |
| `298:2309` | Entry/welcome screen; Inter family and 400/500/600/700 weights | [Screenshot](figma/298-2309-entry.png), SHA-256 `9dc093e2071dd7e33e68ae4ef03cd28c0529745ef9ce400695478b927a4f0fd4` | GM-02 provides the font runtime and navigation foundation. Full welcome/login product UI remains with the screen task. |
| `2:16` | Palette: green `#46C34F`, cream `#FFFCF3`, sage `#B9CB9B` | [Screenshot](figma/2-16-palette.png), SHA-256 `5119738c42ed7e47d3ae092c638b2332a285a80684361da3b79815a41d9660d7` | Tokens and component-wide palette remain with GM-05; no global redesign in GM-02. |
| `9:77` | Button typography sample, 14/20 Semibold | [Screenshot](figma/9-77-button.png), SHA-256 `af989636449c85798b8b2814cf7ae2705e2a6cfe804a7af6ae59854868cf92c0` | Mapping exposes Semibold to GM-05. GM-02 only demonstrates the four font weights on `/foundation` and the shell. |

Inter 4.1 static TTFs and SIL Open Font License are in `mobile/assets/fonts/`; upstream source URLs and per-file SHA-256 values are recorded in `mobile/assets/fonts/SOURCE.md`. The app-side screenshot comparison on an Android device remains **Not run** until Expo Go is opened on the device; a Figma screenshot is not evidence that the app rendered it.
