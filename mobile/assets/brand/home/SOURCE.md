# Home/continue assets — GM-09 step 2

**2026-11-02 correction:** back/create/join PNGs below were opaque. Their alpha
has been repaired; join additionally receives the correct enter glyph from the
user's component export. Natural sizes/render slots are unchanged. The original
hashes below remain historical; see [current provenance](../ALPHA_REPAIR_2026-11-02.md).

Received 2026-11-01 from the user's authorized Figma Draft
`H2bFJnOVGfxFHHPK3Aqtrq`. Full design contexts: Home `33:3`, continue `277:2140`,
guest expiry `277:2190`. Assets are individual Figma PNG exports, not screen
screenshots used as UI. Downloaded with curl as instructed by Figma MCP.

| File | Source node | Native/render slot | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| friends-dining-slot.png | 34:822 | 166×116, contains source crop/offset exactly | 27218 | 65f3a0361f556dd3d68bd661c6a578089a7bba484875e8d5458087474b53546c |
| back.png | 23:412 | 24×24 | 308 | 7f4a88d3bb06b48e4362de5e617d93e9329e208b717b0de606067e813596387b |
| create.png | 187:910 | 32×32 | 376 | 8c8cd597995afa82d2ffd618a64fd45340434eaea06c181bd89315e77a7d71f4 |
| join.png | 187:915 | 32×32 | 370 | 429400002698b9a850ca8f0a07f2cf4ae76ef966eb86e28d9d5c5ec25dc6b8ab |

Home passes the cropped illustration to the existing BrandBanner component in
its 166×116 slot, alongside the flexible title and 24dp left padding. At 412dp
content width (364dp after margins), title width is 174dp as in Figma. The
previous full illustration remains available for other consumers; its default
component behavior is unchanged. Home uses the two 32dp icons in stacked
AppButtons; other buttons default to their existing 24dp icons. Continue/expiry
headers use the 24dp Back asset through AppHeader's optional source prop.

Existing master logo/bell/navigation/plus/lightning assets retain provenance in
the parent SOURCE.md; friend avatars remain dynamic names/initials without
invented online presence. Fake Android system-bar artwork is not rendered.
Native screenshot comparison/effective device geometry is still Not run.
