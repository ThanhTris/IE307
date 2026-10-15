# GM-23 — Plan

- Contract: `food-v1/roadmap-v2/GM-23.1`
- Upstream: `ce7b87a` (GM-21 merged on main; GM-20/22 inputs retained)
- Schema: `0.7.0`; migration: `supabase/migrations/0025_notifications.sql`.
- Scope: inbox keyset, device ownership/ACL, trusted Expo sender, delivery
  lease/retry/receipt metadata. No native remote push claim in this task.

The migration is numbered 0025 because GM-21 owns 0024_history_integration.sql on the updated main.
All positive rows are synthetic and disposable; the application database is
not reset or promoted.
