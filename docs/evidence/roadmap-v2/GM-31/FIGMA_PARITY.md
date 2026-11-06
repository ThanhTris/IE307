# GM-31 Figma parity matrix

Figma design screenshots/context could not be accessed in this session. Node IDs below are taken from the checked-in task map; actual screenshot comparisons are Not run and no visual parity is claimed.

| Frame/state | App route / implementation | Expected behavior | Actual comparison / status |
| --- | --- | --- | --- |
| `277:2140` continue session | Existing room/voting route with durable outbox | Restore session, refetch canonical snapshot; no stale auto-send | Android screenshot and process restart Not run |
| `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768` | Session/cache recovery routes (confirm exact nested frame labels in Figma) | Show valid current state; stale cache never changes server result | Figma context unavailable; comparison Not run |
| `801:9695` history first-load error | `/gm28/history` · `LiveHistoryScreen` | Error and retry; no fabricated rows | Screenshot comparison Not run |
| `801:9846` offline with saved history | `/gm28/history` | Show authorized cached rows, fetchedAt and stale label | Screenshot comparison Not run |
| `801:9775` offline without saved history | `/gm28/history` | Error and retry without empty-as-authoritative confusion | Screenshot comparison Not run |

Compare at 412dp, 320/360dp and 200% text; record system bars and preserve accessibility/current theme. Consent revoke, delete and TTL must take effect; cached data cannot grant access.
