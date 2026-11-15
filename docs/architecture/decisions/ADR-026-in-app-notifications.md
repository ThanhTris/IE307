# ADR-026 — In-app notifications, first-run permissions and opt-in history

- Status: **Accepted by Trí on 2026-11-15 in chat**. PR #167 is explicitly approved as a combined cross-task change; implementation still requires passing verification before merge.
- Scope: mobile app and the canonical B-supplement runtime (`list_partner_inbox`, friend invitations).
- Runtime: `0052_inbox_friend_accepted.sql` (schema 0.28.0) and `0053_inbox_realtime.sql` (schema 0.29.0), applied to the
  local QA database only. Amended 2026-11-14 (decision 2): push through Realtime instead of a 10-second read.

## Context

Testing on phones showed that notifications only appeared after the person opened the inbox, and then only after a long
wait. The cause is in the app, not the tunnel: the inbox was read once at start, when the app returned to the
foreground and on demand, with no timer. There was no notification at all for "your friend request was accepted" (the
app guessed it by comparing friend lists, which fails when the sender is offline). Notifications reused the toast, which
the project reserves for the result of the user's own action. The history screen stayed empty because the server only
keeps history for people who agreed, and the app had no place to agree. Permissions were asked only when a feature was
first used, with no first-run request.

## Decision

1. **Notifications are server events.** `FRIEND_ACCEPTED` joins `FRIEND_INVITED`, `ROOM_INVITED` and
   `ROOM_RESULT_READY`. A trigger on `friend_invitations` (pending → accepted) writes the event and the inbox row for the
   person who sent the invitation, once (`dedupe_key = friend-accepted:<invitation>`). `list_partner_inbox` is wrapped
   to say what happened in plain words: a friend request names the sender, an accepted request names who accepted, an
   invite to eat reads "<name> rủ bạn đi ăn", a result reads "Đã chốt món · Nhóm chọn: <dish>" or "Chưa chốt được món".
   The wire shape is unchanged; the only new type is `friend_accepted` with `{ invitationId }`.
2. **The server pushes, the app does not keep asking.** Notifications are rare, so the app does not read on a timer.
   Supabase Realtime is enabled (`supabase/config.toml`); `0053` publishes `public.inbox` and lets `authenticated` read it,
   still limited by RLS `gm17_inbox_self` to the account's own rows (the row has no message text, only ids and times).
   While the app is in the foreground it keeps one WebSocket (platform WebSocket, Phoenix protocol, no new library)
   subscribed to INSERTs on its own inbox rows; each push triggers one `list_partner_inbox` read (debounced 300 ms).
   It also reads at sign-in, on return to the foreground and when the connection comes back (to catch rows written while
   it was down). Only while the connection is down does it read every 30 seconds. In the background the socket is
   closed. Notifications already unread when the app opened become one summary banner; open lists refresh quietly.
   Push while the app is closed is a separate step (FCM, development build).
3. **Banner, not toast.** `NotificationBanner` is a separate white card with a bell, queued, tappable, swipe up to dismiss.
   Toasts keep only API errors and create / add / edit / delete results (the `notification` toast tone is removed). No banner
   is shown over the inbox list or for the result of the room the person is already in.
4. **Round 2 notice.** When round 1 has no winner, the vote screen shows "Chưa chốt được món · Còn N món vào vòng 2 ·
   Mỗi người loại tối đa K món" (K = ceil 30%, ADR-023) and moves on after a 5-second countdown, or at once from the button.
5. **First-run permissions.** After the first sign-in on a phone the app shows one screen asking for Notifications,
   Camera and Location, with a skip button. A refusal is never final: each feature asks again when it is used, and after the
   phone stops showing the question the app offers "Mở Cài đặt". Remote notifications are not available in Expo Go and are
   reported as unavailable.
6. **History is opt-in.** The account choice (`update_history_consent`, scope `personal`) is off until the person turns it
   on, on the first-run screen or with the switch on the history screen. Rooms finished while it is off are not saved and
   cannot be recovered afterwards.

## Consequences

- Foreground latency is under a second on QA (measured 437 ms from the invite to the pushed row). Nothing is read while
  nothing happens. Push while the app is closed still needs a development build and FCM (stage 3B).
- The running QA stack was created with Realtime off; `.work/e2e/32-qa-realtime.mjs` adds the container (run by `!phone`).
  New stacks get it from the config. CI (`scripts/dish_v4_ci.py`) keeps Realtime excluded, it does not need it.
- Evidence: SQL tests `ADR-026_inbox_friend_accepted.test.sql` (11/11) and `ADR-026_inbox_realtime.test.sql` (6/6), QA e2e
  `.work/e2e/33-test-inbox-realtime.mjs` (push arrives, other accounts get nothing), `.work/e2e/31-test-notifications.mjs`
  (friend request, accepted request, invite to eat, decided and no-consensus results, history after consent, snack
  ranking), and Jest tests for the banner, polling, permissions and the round 2 notice.
- Not run: SQL/domain parity CI, a test on a physical phone.
