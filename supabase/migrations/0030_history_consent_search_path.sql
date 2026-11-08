-- Harden the v4 consent wrapper without changing its body, grants or contract.
-- All referenced application functions are already schema-qualified. The extra
-- public search path is unnecessary for this SECURITY DEFINER entrypoint.
begin;

alter function public.update_history_consent(text,text,jsonb)
  set search_path = pg_catalog;

commit;
