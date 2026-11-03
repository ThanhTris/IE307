# Result reference assets — GM-13.2

Isolated artwork from user-supplied Figma PNG exports, 2026-11-03.
Scope: UI mock/reference, not production catalogue approval or Google map data.
Original hashes are pinned in the GM-13 figma-update INPUT_MANIFEST.json.

Reproduce from repository root:

```powershell
./mobile/scripts/extract-result-assets.ps1 -ReferenceRoot .work/figma-reference -OutputPath mobile/assets/brand/result
```

| Output | Source | Source rectangle x/y/w/h | Rendering |
| --- | --- | --- | --- |
| pho.png | gm-09 Components/09 Bục kết quả/Bản đồ | 120/296/240/240 | Circular alpha, dynamic dish slot, contain, never tinted |
| rice.png | Same | 426/296/204/204 | Circular alpha, same slot |
| bun.png | Same | 714/296/204/204 | Circular alpha, same slot |
| laurel.png | Same | 140/838/46/86, padding2 | Alpha recovered against green block; 50×90, contain; tint only this decorative glyph |
| empty-bowl.png | gm-10 Screens/11 Vinh danh/Kết quả/Bản đồ | 10104/744/440/440 | Isolated bowl illustration, contain, never tinted |
| map-illustration.png | Same | 2096/1552/720/240 | Roads/markers only, no baked place names/buttons; mock map backdrop, never a real tile map |

No full-screen screenshot is used as UI. Source exports/crops remain ignored.
Photo keys are supplied by mock composition only; real null artwork stays
an explicit fallback, and API artwork/attribution belongs to its received
licensed projection. Do not turn these reference photos into catalogue data.
UI columns use responsive sizes; celebration image uses its own bounded slot.
The three circular PNGs retain their source borders. Mock composition uses a
1.08 image scale inside a circular clip to exclude those baked borders; the
outer component draws a uniform 2px ring using the actual winner flag. This
also applies to the mock celebration. Real artwork defaults to scale1 and
is not zoomed automatically. Source PNG bytes and extraction remain unchanged.
Pixel alpha/ink and rendered proportions must be checked independently from
Jest's native Image mock. Native same-viewport acceptance remains step7.
