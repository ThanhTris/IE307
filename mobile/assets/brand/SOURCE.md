# Brand asset sources

**2026-11-02 correction:** monochrome icons below had a baked export matte.
Runtime files now carry transparent alpha; the table preserves original receipt
hashes. See [alpha repair and current manifest](ALPHA_REPAIR_2026-11-02.md).

The current UI logo was supplied by the project owner on 2026-11-05. React Native renders the vector SVG; the accompanying square PNG is used for the native launcher icon, which Expo config requires as a raster image. The prior Figma logo export below is retained for historical evidence and is no longer used by the app.

| Current logo asset | Source | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `gi-cung-duoc-logo.svg` | Project owner, 2026-11-05 | 59,021 | `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7` |
| `gi-cung-duoc-icon.png` | Project owner companion image, 2026-11-05 | 79,027 | `0d42164aa1cc45d4d11f3e5c4901de029cecb1dd4f09bbecf1ff0b2248cd91cb` |

The remaining image assets in the table below were exported from the approved Gì Cũng Được Figma file `3Ysh0mOAEkAgA5DgZPSC1j` on 2026-10-27 and are bundled locally. Temporary Figma URLs are not runtime sources.

| File | Figma node | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `gcd-logo-master.png` | `22:394` | 1,516 | `a72e07d837c48e8306c196d0d175dc3b0e3f8f134ceacf8e39026b91ab9a148c` |
| `friends-dining.png` | `34:822` (inside banner `34:820`) | 862,711 | `16bd1bb058acc7ab3906ef24be903011e65f0ac74eccb5fe93f7d5e9a7b432ab` |
| `icons/bell.png` | `23:409` | 663 | `1f4b93f9672a922418d016cba2598c397fd823ee3462b24d680ef3ac5be7100a` |
| `icons/home.png` | `23:394` | 627 | `5104d2f09a23d2ef9815aa47659e2c439ba9b6b4fe39be314e0ce6bd872de60e` |
| `icons/friends.png` | `23:397` | 713 | `840a9052798393bed34d27b6202c36d521eab078685b9835a9ff986613e051f7` |
| `icons/history.png` | `23:401` | 828 | `90e086cbf810a648cb2c9120822236108e8d97cb3fa055908e664f279deed836` |
| `icons/profile.png` | `23:405` | 663 | `f34e9272626fdbf0e21804e418adcbe4ded8515c080236284d9bc92c327b9c48` |
| `icons/plus.png` | `34:799` | 258 | `96ae02b9a357fc374aca0eaa7400e830cdeedeacadbbcafc77ff73421bf17686` |
| `icons/enter.png` | `34:800` | 378 | `6e3bb6af73079ebaa5506d4bf27ff36765f281df4ca399b7ed66bec1acb9dc1c` |
| `icons/lightning.png` | `34:801` | 489 | `bb411cd71db338d29e94ce06ebd817c346ec6148968e4edcf1939cfe69bf645b` |

The exported brand banner illustration is the source artwork from the approved Home frame. It replaces the previous ramen-emoji illustration in the Home composition; it is not user-generated content.
