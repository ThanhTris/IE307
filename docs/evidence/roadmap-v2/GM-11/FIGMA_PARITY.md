# GM-11 Figma parity — supplement 2026-11-04

## Comparison status

Figma node screenshots/design context could not be retrieved in this environment: no Figma connector is available and the linked design file was inaccessible through the available browser route. No app screenshot or visual parity is claimed. This document records the missing evidence explicitly for owner review.

| Figma node | Intended state | App route / fixture | Figma image | App image | Result |
| --- | --- | --- | --- | --- | --- |
| `68:429` | Lobby host/member | `/features` → GM-11 lobby; mock roster 1/2/3/20 | Not retrieved | Not captured | Not run |
| `330:3070` | Host/member lobby | Same | Not retrieved | Not captured | Not run |
| `76:853` | Lobby situations | `/features` → GM-11 status; loaded/offline/expired/stale | Not retrieved | Not captured | Not run |
| `321:1663` | Compact room member | GM-11 lobby member view | Not retrieved | Not captured | Not run |

## Implemented behavior ready for visual review

- Ready/reset-ready controls and ready-derived member presence were removed from the active lobby flow.
- Host-only start/context/cancel actions and member leave behavior remain explicit.
- Mock roster fixtures cover 1, 2, 3, and 20 members; full roster disables mock invite.
- Android Back in `LOBBY` opens host cancel/member leave confirmation; Back dismisses an open confirmation.

## Required follow-up before visual AC can pass

Open the listed nodes and the mock routes on Android at 412dp, 320/360dp, and 200% font scale. Save paired screenshots with viewport, state, fixture, app revision, and record every discrepancy. Check TalkBack and safe areas on device. Do not infer visual acceptance from component tests or the existing brand board.
