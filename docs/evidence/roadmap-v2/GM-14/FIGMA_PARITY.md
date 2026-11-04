# GM-14 Figma parity — supplement 2026-11-04

## Comparison status

Figma node screenshots/design context could not be retrieved in this environment: no Figma connector is available and the linked design file was inaccessible through the available browser route. No app screenshot or visual parity is claimed. This document records the missing evidence explicitly for owner review.

| Figma node | Intended state | App route / fixture | Figma image | App image | Result |
| --- | --- | --- | --- | --- | --- |
| `330:3076` | Friends | `/features` → GM-14 friends | Not retrieved | Not captured | Not run |
| `330:3077` | Inbox | `/features` → GM-14 inbox | Not retrieved | Not captured | Not run |
| `330:3079` | History | `/features` → GM-14 history | Not retrieved | Not captured | Not run |
| `330:3081` | History detail | GM-14 history detail sheet | Not retrieved | Not captured | Not run |
| `330:3083` | Profile | `/profile` mock route | Not retrieved | Not captured | Not run |
| `330:3085` | Settings/accessibility | `/settings` mock route | Not retrieved | Not captured | Not run |
| G01–G03 | Friend/inbox/history variants | GM-14 friends/inbox/history | Not retrieved | Not captured | Not run |

## Implemented behavior ready for visual review

- Friend search filters only the existing friend list locally and remains available during loading/error.
- History shows connected/offline-with-session-cache/offline-without-cache states, disables changes offline, confirms delete, and exposes details using current contract fields only.
- Guest profile/settings are mock previews; no live account linking or auth action is performed.
- No NO_CONSENSUS reason or Top 3 is invented when the current `HistoryItem` contract does not provide it.

## Required follow-up before visual AC can pass

Open the listed nodes and mock routes on Android at 412dp, 320/360dp, and 200% font scale. Save paired screenshots with viewport, state, fixture, app revision, and record every discrepancy. Check TalkBack and safe areas on device. Keep the result/outcome fields hidden until an approved producer contract supplies them.
