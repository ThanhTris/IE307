-- Disposable QA only. Production rollback: disable the unintegrated feature and
-- retain storage until a reviewed backup/reconcile plan. Never discard retained data.
begin;
do $$ begin
 if exists(select 1 from gm06_canonical.results) or exists(select 1 from gm06_canonical.account_preferences)
 or exists(select 1 from gm06_canonical.room_preferences) or exists(select 1 from gm06_canonical.price_observations) then
  raise sqlstate '23514' using message='GM06_CANONICAL_ROLLBACK_NONEMPTY';
 end if;
end $$;
drop function gm17_private.cleanup();
alter function gm17_private.cleanup_before_gm06_canonical() rename to cleanup;
drop trigger gm06_canonical_keep_consent on public.consents;
drop trigger gm06_canonical_keep_result_ref on gm17_private.result_refs;
drop trigger gm06_canonical_keep_room_ref on gm17_private.room_refs;
drop function gm06_canonical.keep_consent();
drop function gm06_canonical.keep_reference();
drop table gm06_canonical.history_audience;
drop table gm06_canonical.histories;
drop table gm06_canonical.history_receipts;
drop table gm06_canonical.result_members;
drop table gm06_canonical.results;
drop table gm06_canonical.account_preferences;
drop table gm06_canonical.room_preferences;
drop table gm06_canonical.price_observations;
drop function gm06_canonical.latest_price(text,uuid);
drop function gm06_canonical.price_guard();
drop function gm06_canonical.preference_guard();
drop function gm06_canonical.valid_preferences(uuid[],uuid[],text,jsonb,jsonb);
drop function gm06_canonical.same_transaction();
drop function gm06_canonical.check_history();
drop function gm06_canonical.history_visible(uuid,uuid,timestamptz);
drop function gm06_canonical.history_receipt();
drop function gm06_canonical.check_member_count();
drop function gm06_canonical.register_result();
drop function gm06_canonical.immutable();
drop function gm06_canonical.valid_terminal(jsonb,jsonb,uuid,text,text,integer,integer);
drop function gm06_canonical.valid_card(jsonb);
drop function gm06_canonical.valid_price(jsonb);
drop function gm06_canonical.unique_uuids(uuid[]);
drop schema gm06_canonical;
-- Shared minimal registry IDs are deliberately retained, never reused/deleted here.
delete from public.schema_versions where schema_version='0.9.0' and contract_id='GM06.2-canonical-storage';
commit;
