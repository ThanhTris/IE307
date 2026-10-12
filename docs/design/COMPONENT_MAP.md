# GM-05 component map

Contract: `food-v1/roadmap-v2/GM-05.1`. Source: `docs/specs/UI_DESIGN_SPECIFICATION.md`, `docs/specs/UI_SPEC.md`, and `design/prototypes/gi-cung-duoc.html`. This map describes reusable React Native primitives; it does not claim that screens or native integrations are complete.

| Prototype / UI need | React Native component | Source | Props / events | Required states and limits |
| --- | --- | --- | --- | --- |
| appbar / brand / friends / inbox / avatar | `AppHeader` | `mobile/src/shared/ui/components.tsx` | title, badges, `onPressBrand`, `onFriends`, `onInbox`, `onProfile` | Buttons are labelled and 48dp; no navigation or API inside |
| primary / quiet / secondary / danger action | `AppButton` | same | label, variant, disabled/loading, `onPress` | Loading and disabled expose state; no implicit submit |
| text / code / context input | `FormField` | same | label, value, `onChangeText`, hint/error, keyboard props | Label is always present; error uses alert role; keyboard/secure behavior is caller-owned |
| `.chip`, preference option | `Chip` | same | label, selected, disabled, `onPress` | Selected state has text/check and accessibility state; no vote semantics |
| `.flashcard`, dish summary | `DishCard` | same | view-only `DishCardData`, selected vote, `onVote`, `onPress` | Artwork fallback; price/source strings are supplied by caller; vote action remains draft/caller-owned |
| `.friends-row` | `AvatarRow` | same | avatar items, status, `onAdd` | Horizontal scroll; status has text label and is decorative only |
| `.roomcode` | `RoomCode` | same | six-character code, `onCopy` | Displays server code; copy action is injected; does not authorize membership or generate QR |
| context section | `ContextSummary` | same | public anchor, meal/time/radius/service labels | Only supplied confirmed context is displayed; no GPS/API call |
| loading/error/empty/stale banner | `StatusNotice` | same | title/message/tone/action | Tone includes text; retry/refetch action injected |
| bottom sheet / confirmation dialog | `SheetDialog` | same | visible/title/children/`onClose` | Modal has Android back handler; caller provides explicit confirmation content |

Tokens live in `mobile/src/shared/theme/tokens.ts`: light/dark colors, spacing, typography, radius and 48dp control minimum. `useShellTheme` exposes token aliases for the GM-02 shell. Components accept colors from the composition root and do not import API clients, feature screens, native permissions or domain logic.

## Example route

Open Expo Go at `/foundation`, then choose `Mở component mẫu GM-05`, or deep-link to `/components`. `ComponentPreviewScreen` composes header, notice, form, chips, context, room code, avatars, dish card, buttons and a sheet using synthetic fixture data. The fixture is labelled in the UI and is not a verified food dataset or production room.

GM-09 can reuse these components with mock API DTO-to-view mapping. GM-25/30 can later inject real repositories and native QR/link behavior without changing component contracts. GM-09 does not need to wait for those integration tasks.
