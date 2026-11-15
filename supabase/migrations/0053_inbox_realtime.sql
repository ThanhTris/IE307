-- ADR-026 (amended 2026-11-14): notifications arrive as soon as they are written, without the app asking every 10 s.
-- The app listens to Supabase Realtime `postgres_changes` (INSERT) on public.inbox for its own rows. The row carries
-- no message text (ids, read flag, timestamps); the app then reads the inbox through list_partner_inbox as before.
-- Additive: SELECT for authenticated is still limited by the existing RLS policy gm17_inbox_self (own rows only,
-- not expired); writes stay RPC-only.
begin;

grant select on public.inbox to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inbox') then
    alter publication supabase_realtime add table public.inbox;
  end if;
end $$;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.29.0', 'dish-session-v4/roadmap-v2/GM-07.B-supplement', '1.1.0', '1.1.0', 'ADR-026/0053_inbox_realtime');

commit;
