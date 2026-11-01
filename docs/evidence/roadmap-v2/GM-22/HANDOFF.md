# GM-22 — handoff

## Current admission supplement — GM-22.2 (2026-10-30)

The original GM-22.1/0.4.0 evidence below is historical and remains intact.
The current forward migration is `0037_gm22_invitation_admission.sql`, schema
`0.14.0`, based on GM-19/20 migrations `0034–0035` and GM-21 migration `0036`
from main `621acccf777c8a2538012641ce525cba0e6ae3ce`. PR #145 checks passed
18/18 on `2a6902d`. See the isolated, version-pinned
[GM-22.2 handoff](admission-v4/HANDOFF.md), [checks](admission-v4/CHECKS.md),
and [manifest](admission-v4/MANIFEST.json). The current QA run passed SQL
35/35, HTTP 75/75, Bruno 12/12 and GM-21 history 80/80. The Python regression
has one Windows symlink privilege error, recorded as Fail. The supplement keeps the GM-22.1
RPC/DTO contract, routes v4 invitations through GM-19 admission, retains v3
capacity 20 and decision-v2 capacity 8. Current server/Bruno result and cleanup
status are only those recorded in the supplement files. Android consumer remains
with GM-28; terminal sender/event bridge remains with GM-23.

Owner/reviewer: Trí / ThanhTris. Contract `food-v1/roadmap-v2/GM-22.1`, schema
`0.4.0`. Do not mark Done until Trí reviews the final revision.

Migration: `supabase/migrations/0022_social.sql`. RPCs are
`get_my_social_identity`, `list_friends`, `invite_partner`, `accept_partner`,
`reject_partner`, `unfriend`, `invite_to_room`, `accept_room_invite`,
`reject_room_invite`, and `list_partner_inbox`. They require the GM-07 JWT and
use `friend_code`/partner or invitation IDs; no user directory or profile-edit
API is exposed. Room accept returns the existing `JoinRoomResponse` and creates
`ready=false` membership only after recipient confirmation.

Disposable reproduction:

```powershell
$env:PYTHONUTF8='1'
node scripts/gm22_http_check.mjs --bruno
```

The runner creates its own database/PostgREST gateway on loopback `54332`, three
namespaced guest JWTs, and synthetic positive catalogue rows. The clean server
run passed SQL `19/19` assertions and HTTP `14/14` scenario groups. The
`--bruno` mode writes a private runtime environment for manual desktop import;
select `supabase/tests/bruno/GM-22` in Bruno and choose
`environments/Local.runtime.private.bru`, then stop with
`node scripts/gm22_http_stop.mjs`. The desktop Runner was executed on the
imported collection with all 10 requests selected: **10 passed, 0 failed, 0
skipped**. Expected state responses included `409` for duplicate/replayed
invites, `401` for missing JWT, and `403` for a non-recipient. Cleanup drops
only that owned database and its namespaced guests. Retained-mode stop was
exercised and returned `stopped:true, cleaned:true`; stop or cleanup failures
now return a non-zero result and preserve runtime state for diagnosis. No app
DB reset or real dataset publication is performed.

GM-28 receives Android UI/inbox/confirmation and device network configuration;
GM-23 receives sender/delivery handling. Android is not claimed as tested here.

### v4-compatible SQL boundary tests — 2026-10-27

Run `supabase/tests/database/GM-22_social.test.sql` after all target migrations. The suite has 29 assertions and checks event semantics instead of requiring the legacy constraint name `events_social_shape`. It accepts both legacy and v4 result references separately, rejects malformed shapes, and retains actual friend-invitation RPC assertions. Local current-schema evidence is 29/29 (47/47 across all database TAP files); see CHECKS for transport and coverage limits. No event API, grants or task status changes accompany this test fix.
