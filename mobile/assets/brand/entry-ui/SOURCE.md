# GM-09 assets received as PNG exports

Received from the user's authorized Figma export in
`.work/figma-reference/gm-09/` on 2026-11-02 (local date). These files are small
illustration/icon masks, never screenshots used as app UI. Original exports
remain ignored; their SHA256 and dimensions are in the GM-09 PNG reference manifest.

Source `02 - Components/02 · Icon.png` (7768 × 432): isolate the existing ink
of each glyph, remove the grey export matte (#F2F2F2), preserve antialias coverage
and natural aspect ratio. Native `Image` uses `contain` and theme tint.

| File | Original glyph x bounds (inclusive); y search 190..359 | Rendered slot |
| --- | --- | --- |
| sun.png |2665..2710|28 × 28 tutorial meal|
| rice.png |2844..2883|28 × 28 tutorial meal|
| moon.png |3019..3058|28 × 28 tutorial meal|
| snack.png |3197..3236|28 × 28 tutorial meal|
| wallet.png |3372..3411|28 × 28 tutorial budget|
| coins.png |3548..3588|28 × 28 tutorial budget|
| box.png |3722..3765|28 × 28 tutorial budget|
| infinity.png |3898..3941|28 × 28 tutorial budget|
| leaf.png |5837..5875|28 × 28 tutorial card, top40/right64|
| qr.png |7066..7109|64 × 64 join entry/capability panel|
| hourglass.png |7609..7670|40 × 40 expired-room state|

`hand.png`: ink from `02 - Components/11 · Hướng dẫn thao tác.png`,
rectangle x225/y565/w130/h140 (dark single-tap hand). Displayed at60 × 60
with white tint plus native arrow/×2 text. Same drawing, not an emoji.

`tutorial-bowl.png`: large ink drawing from T06 in
`03 - Màn hình/18 · Hướng dẫn lần đầu · Bản chạy.png`. T06 frame crop is
x5000/y352/w824/h1830; within it bowl rectangle x312/y540/w200/h196.
Remove the warm #ECF8EB matte. Displayed96 × 96 inside a180 × 180 native
warm circle. This is a tutorial illustration, not a food photograph.

Masks retain #043B22 RGB and alpha coverage. Icon crops add4px padding and
center the glyph in a square; app geometry does not stretch it. Assets were
composited on white for visual inspection because the image viewer ignores
transparent RGB when displaying these masks directly. No remote asset URL,
generated artwork, new library, native module or package change.
