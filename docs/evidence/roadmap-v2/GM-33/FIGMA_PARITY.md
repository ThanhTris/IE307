# GM-33 Figma parity matrix

Source inventory is the repository's
[Figma task map](../../../design/UI_FIGMA_TASK_MAP.json), revision
`ui-figma-final/2026-10-25`. The listed IDs are entry points from the
map and the received consumer handoffs. Resolve the actual child frame
for each state in the pilot, and record the Figma revision and screenshot.
Visual parity on the physical Android build is **Not run**. Use the
[checkpoint command](HANDOFF.md#prepare-the-test-run) to associate the
app frame with the exact case, Figma node and verified QA revision.

The 2026-11-10 Expo Go run captured checkpoints from a USB phone and
an AVD at their existing display settings. The design frame could not
be retrieved in that session, and neither display was configured to
the exact 412dp comparison. These captures document observed app
states. Figma parity and the formal accessibility matrix remain
**Not run**. See [the rehearsal checks](CHECKS.md).

| Case | Figma node(s) | Route and fixture/state | Compare |
| --- | --- | --- | --- |
| P01 | `298:2309`, `330:3067`, `330:3069` | `/welcome`, `/`, `/tutorial`; guest, new user, restart | Logo/type, guest action, restore and empty state |
| P02 | `43:106`, `76:851`, `388:7816`, `1015:9957` | `/room/create-entry`, `/room/setup`; 10/20, meal and shortage | Stepper limits, no GPS gate, keyboard and shortage copy |
| P03/P13 | `268:2019`, `275:2088`, `268:2081`, `368:12182` | `/room/join`, `/join/[code]`, `/room/lobby`; scan/deny/confirm/share | Preview, modal, manual action and Back |
| P04 | `68:429`, `330:3070`, `76:853`, `321:1663` | `/room/lobby`; host/member, locked/full and edit | Member count, controls per role, no ready control |
| P05 | `76:852`, `321:1236` | `/room/preferences`; saved, unknown, loading and save error | Chips/labels, retry, stable selection |
| P06/P07 | `330:3071`, `330:3072`, `638:9369` | `/room/vote`; R1, ACK/UNKNOWN and waiting | Controls, timer, host-only enabled state |
| P08 | `330:3073`, `330:3074` | `/room/final-round`; singleton, many, cap reached | Remove controls, disabled state and explanation |
| P09 | `330:3075`, `617:1671`, `617:1428` | `/room/result`, `/room/no-consensus`; dense ties/no winner | Podium, text truncation, actions and reduced motion |
| P10 | `330:3081`, `263:1880`, `801:9695`, `801:9775`, `801:9846` | `/history`; consent/delete/offline/no cache | Scopes, confirmation, stale indicator, empty/error |
| P11 | `330:3076`, `330:3077`, `330:3079` | `/friends`, `/inbox`; empty/invite/expired/unavailable | Role actions, empty/error and retry |
| P12 | `382:8859`, `380:1440`, `286:2245`, `1015:10152` | `/push-settings`, `/inbox`; deny/native tap/expired ref | Settings copy, safe destination and recovery |
| P14 | `379:1478`, `622:8962`, `206:913` | `/room/result`; places loading/denied/empty/ready | Attribution, stable winner, fallback and map |
| P15 | `277:2140`, `368:11605`, `382:7201`, `559:8768` | `/continue-session`, `/`, `/room/vote`; restored/stale/offline | Resume card, status banner, no unsafe retry |

For each row attach both Figma and app evidence at 412dp and default
font scale with the same data and role. Record status/navigation bars
separately. Add actual layout/a11y observations at 320/360dp and font scale
2.0, TalkBack focus/labels and keyboard/Back. A route existing in source is
mapping evidence only. Send each mismatch to its route/component owner with
a screenshot pair and Trí's disposition.
