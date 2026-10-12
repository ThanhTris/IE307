# GM-05 checks — shared UI components

Status: implementation branch, awaiting independent review and Expo Go visual check. Tested code commit: `31148c7` (`fix(gm-05): retry changed artwork and meet chip target`).

Base: `origin/main` `9188c736def7e125266f8cce2314b9f1f5c31b81`; contract `food-v1/roadmap-v2/GM-05.1`; input GM-02 shell and GM-04 field contract. PR #105 is not used as GM-05 evidence; its scope is GM-07 API/mock/loading.

| AC / case | Input → expected → actual | Result |
| --- | --- | --- |
| Tokens | Import `designTokens`, light/dark colors, spacing/radius/type; no new dependency | Pass by typecheck and source review |
| Component map | UI spec/prototype elements → 10 reusable components with props/events/limits | Pass; `docs/design/COMPONENT_MAP.md` |
| Controls | AppButton disabled/loading, FormField label/error, Chip selected, accessible labels | Pass; `sharedComponents.test.tsx` |
| Dish card | View props only, tags/price/venue, WANT/OK/NO actions, missing artwork fallback and retry after source change | Pass; `sharedComponents.test.tsx` |
| Room/context/social | RoomCode, ContextSummary, AvatarRow, StatusNotice display supplied state | Pass; `sharedComponents.test.tsx` |
| Sheet/dialog | `SheetDialog` modal with Android back handler and explicit close action | Implemented; route interaction not separately asserted |
| Preview route | `/foundation` → `Mở component mẫu GM-05` → `/components`; fixture labelled and Home/card composed | Pass; 3 route tests |
| Accessibility/layout code | touch controls min 48dp including Chip, labels/hints/states, safe-area screen, fallback text | Pass by source review; TalkBack/device visual not run |
| Full mobile | typecheck, lint, Jest, architecture | Pass after final rerun; 8 suites / 296 tests; output in `MOBILE_CHECK.txt` |
| Expo Go Android visual | Open route on real device, dark/font200/TalkBack/overflow | Not run; blocks final acceptance |
| Live dependency gate | `task_readiness --task GM-05 --gate merge --base-ref origin/main` | Previous recorded result `READY_FOR_MERGE_REVIEW`; refresh currently blocked by missing `read:project` credential; see PLAN.md |

Known lint baseline: 4 warnings in existing `contracts.ts`/`index.ts`; no lint errors from GM-05 after removing unused import. No production API/native/data claim is made.
