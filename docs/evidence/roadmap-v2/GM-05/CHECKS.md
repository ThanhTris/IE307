# GM-05 checks — shared UI components

## Supplement 2026-10-27 — components used by the updated Home

The Home Figma frame now consumes the shared `AppHeader`, `AppButton` with stacked icon support, and `AvatarRow`; GM-05 also exports reusable `BrandBanner` and `AppBottomNavigation` components for its dining illustration and four-tab navigation. Components accept theme/font styles and route callbacks rather than embedding API behavior. The targeted shared-component and Home route/review-feedback suites pass **46/46 tests**; strict typecheck and architecture guard pass. The Android export includes the Figma assets. Updated Home visual verification on emulator is **Not run**.

This supersedes the later 2026-10-27 paragraph that said the Home layout remained GM-09 work: the actual screen composition is GM-09, and this supplement records which shared components it reuses. It does not complete GM-05 or claim pixel parity.

## Supplement 2026-10-27 — shared brand update on PR #137

The current branch updates shared light tokens to the approved Figma palette, replaces the AppHeader ramen mark with the official G logo asset, and applies Figma pressed colors to primary/secondary AppButton states. `sharedComponents.test.tsx` asserts the palette; targeted result is 9/9 tests, typecheck passes, and lint has zero errors (four pre-existing warnings). Android visual verification after this patch is Not run. This records shared-component changes only; GM-05 remains subject to its own task gate/review, and the Home screen composition remains GM-09 scope.

Status: implementation branch, Expo Go visual check confirmed by Trí in chat on 2026-10-12; awaiting final PR review. Tested code commit: `8f6f363` (`fix(gm-05): track the rendered dish image source`).

Base: `origin/main` `9188c736def7e125266f8cce2314b9f1f5c31b81`; contract `food-v1/roadmap-v2/GM-05.1`; input GM-02 shell and GM-04 field contract. PR #105 is not used as GM-05 evidence; its scope is GM-07 API/mock/loading.

| AC / case | Input → expected → actual | Result |
| --- | --- | --- |
| Tokens | Import `designTokens`, light/dark colors, spacing/radius/type; no new dependency | Pass by typecheck and source review |
| Component map | UI spec/prototype elements → 10 reusable components with props/events/limits | Pass; `docs/design/COMPONENT_MAP.md` |
| Controls | AppButton disabled/loading, FormField label/error, Chip selected, accessible labels | Pass; `sharedComponents.test.tsx` |
| Dish card | View props only, tags/price/venue, WANT/OK/NO actions, missing artwork fallback and retry after source/imageUrl changes | Pass; `sharedComponents.test.tsx` covers both source-only and dual-source cases |
| Room/context/social | RoomCode, ContextSummary, AvatarRow, StatusNotice display supplied state | Pass; `sharedComponents.test.tsx` |
| Sheet/dialog | `SheetDialog` modal with Android back handler and explicit close action | Implemented; route interaction not separately asserted |
| Preview route | `/foundation` → `Mở component mẫu GM-05` → `/components`; fixture labelled and Home/card composed | Pass; 3 route tests |
| Accessibility/layout code | touch controls min 48dp including Chip, labels/hints/states, safe-area screen, fallback text | Pass by source review and manual Expo check; device model/screenshot metadata not supplied |
| Full mobile | typecheck, lint, Jest, architecture | Pass after final rerun; 8 suites / 297 tests; output in `MOBILE_CHECK.txt` |
| Expo Go Android visual | Open route on real device, dark/font200/TalkBack/overflow | Pass; Trí confirmed component preview is usable in Expo Go on 2026-10-12. Device model/screenshot not recorded |
| Live dependency gate | `task_readiness --task GM-05 --gate merge --base-ref origin/main` | Previous recorded result `READY_FOR_MERGE_REVIEW`; refresh currently blocked by missing `read:project` credential; see PLAN.md |

Known lint baseline: 4 warnings in existing `contracts.ts`/`index.ts`; no lint errors from GM-05 after removing unused import. No production API/native/data claim is made.
