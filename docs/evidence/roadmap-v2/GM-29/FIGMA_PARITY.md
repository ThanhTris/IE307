# GM-29 Figma parity matrix

Figma page inspection and screenshots were unavailable in this session. The node references below come from the checked-in UI task map; no pixel-parity claim is made. Screenshots, exact viewport and reviewer decisions remain required before acceptance.

| Frame/state | App route / implementation | Data/expected behavior | Actual comparison / status |
| --- | --- | --- | --- |
| `382:8859` permission request | `/push-settings` · `PushSettingsScreen` | Request Android notification permission; denied state keeps Inbox usable | App screenshot and Figma comparison Not run |
| `380:1440` permission surface | `/push-settings` | Grant/deny and Android settings affordance | Native screenshot Not run |
| `286:2245` notification inbox | `/inbox` → settings action | Canonical inbox remains accessible | Screenshot comparison Not run |
| `277:2140` continue session | Push tap lifecycle | Restore auth, refetch canonical inbox/ACL, then route | Real push and screenshot Not run |
| `1015:10152` deleted/no longer authorized | Existing safe state route after refetch | Never authorize/join from notification payload | Server/device case Not run |

Required comparison: 412dp content width, 320/360dp, standard and 200% text; record Android system bars separately. Dark redesign remains deferred per scope; preserve current theme behavior and accessibility.
