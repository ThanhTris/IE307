# GM-23 — Plan

- Contract: `food-v1/roadmap-v2/GM-23.1`
- Upstream: `991de6620715d1219da900499f4aa2d683b01bb4` (GM-20.3 + GM-22.1)
- Schema: `0.6.0`; migration: `supabase/migrations/0024_notifications.sql`.
- Scope: inbox keyset, device ownership/ACL, trusted Expo sender, delivery
  lease/retry/receipt metadata. No native remote push claim in this task.

The migration is numbered 0024 because GM-20 owns 0023_finalize.sql on main.
All positive rows are synthetic and disposable; the application database is
not reset or promoted.
