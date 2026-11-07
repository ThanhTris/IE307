# GM-31 Figma parity

Design references are taken from the task map. No app screenshots or Figma visual comparison were captured; parity is Not run.

| Frame/state | Implementation | Expected behavior | Status |
| --- | --- | --- | --- |
| `277:2140` continue session | Room/voting routes + durable outbox | Restore session and reconcile canonical server state before retry | AVD screenshot/process restart Not run |
| `368:11605`, `368:12586`, `368:12644`, `323:3581`, `382:7201`, `559:8768` | Session/cache recovery states | Show current authorized state without stale replay | Figma comparison Not run |
| `801:9695` history error | `/history` | Retry without fabricated rows | Owned by GM-28; screenshot Not run |
| `801:9846` offline history | `/history` | Show authorized cache timestamp/stale state | Durable integration belongs to GM-31; screenshot Not run |
| `801:9775` empty offline state | `/history` | Explain unavailable cache and offer retry | Owned by GM-28; screenshot Not run |

Required viewport checks: 412dp and 360dp widths, 200% text, system bars recorded separately.
