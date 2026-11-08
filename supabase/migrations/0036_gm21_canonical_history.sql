-- GM21.3: receive GM20.4's pinned writer/reader, close consent/delete retention gaps.
-- No result backfill, new wire version, creation activation or legacy rewrite.
begin;
create schema gm21_canonical_private;
revoke all on schema gm21_canonical_private from public,anon,authenticated,service_role,gm06_publisher;
alter default privileges in schema gm21_canonical_private revoke execute on functions from public;

-- Same lock order as the producer and retention worker, including direct QA SQL.
create function gm21_canonical_private.serialize_write() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 return null;
end $$;
create trigger gm21_canonical_history_epoch before insert or delete on gm06_canonical.histories
 for each statement execute function gm21_canonical_private.serialize_write();
create trigger gm21_canonical_audience_epoch before insert or delete on gm06_canonical.history_audience
 for each statement execute function gm21_canonical_private.serialize_write();
create trigger gm21_canonical_settings_epoch before insert or update or delete on gm21_private.settings
 for each statement execute function gm21_canonical_private.serialize_write();

-- Detachment preserves EXISTING history links; it must never become a new global grant.
-- Keep the consent locked through commit and the deferred original model constraints.
create function gm21_canonical_private.attached_audience() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare detached boolean;
begin
 select c.retention_detached into detached from public.consents c where c.id=new.consent_id for update;
 if not found or detached then
  raise sqlstate '23514' using message='GM21_DETACHED_CONSENT';
 end if;
 return new;
end $$;
create trigger gm21_canonical_attached_audience before insert on gm06_canonical.history_audience
 for each row execute function gm21_canonical_private.attached_audience();

-- Receipt rows intentionally survive a payload purge. Granting a scope again does
-- not recreate the deleted entry or retroactively change a room's start snapshot.
create function gm21_canonical_private.revoke_scope() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare person uuid; scope_value text;
begin
 if tg_op='DELETE' then person:=old.user_id; scope_value:=old.scope;
 elsif not new.enabled then person:=new.user_id; scope_value:=new.scope;
 else return new; end if;
 delete from gm06_canonical.histories h where h.scope=scope_value
  and exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and a.user_id=person);
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger gm21_canonical_scope_revoke after insert or update of enabled or delete on gm21_private.settings
 for each row execute function gm21_canonical_private.revoke_scope();

create function gm21_canonical_private.consent_changed() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 delete from gm06_canonical.histories h
 where exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and a.consent_id=new.id)
 and not gm06_canonical.history_visible(h.history_id,new.user_id,statement_timestamp());
 return new;
end $$;
create trigger gm21_canonical_consent_changed
 after update of enabled,revoked_at,expires_at,granted_at,room_id,retention_detached on public.consents
 for each row execute function gm21_canonical_private.consent_changed();

-- Keep the existing consent API/ACK/legacy semantics and restore its trusted guard.
alter function public.update_history_consent(text,text,jsonb) rename to update_history_consent_before_gm21_canonical;
revoke all on function public.update_history_consent_before_gm21_canonical(text,text,jsonb) from public,anon,authenticated,service_role,gm06_publisher;
create function public.update_history_consent("requestId" text default null,scope text default null,consent jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare answer jsonb; previous_guard text:=current_setting('dish_v4.writer',true);
begin
 answer:=public.update_history_consent_before_gm21_canonical("requestId",scope,consent);
 perform set_config('dish_v4.writer',coalesce(previous_guard,'off'),true);
 return answer;
exception when others then
 perform set_config('dish_v4.writer',coalesce(previous_guard,'off'),true);
 raise;
end $$;

-- Existing clients can erase the ID returned by the canonical capability as well.
-- The old API validates/authenticates/rate-limits/locks and owns the stable ACK.
-- Other owners, hidden IDs and absent IDs remain the same successful no-op.
alter function public.delete_history(text,text) rename to delete_history_before_gm21_canonical;
revoke all on function public.delete_history_before_gm21_canonical(text,text) from public,anon,authenticated,service_role,gm06_publisher;
create function public.delete_history("requestId" text default null,history_id text default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare answer jsonb;
begin
 answer:=public.delete_history_before_gm21_canonical("requestId",history_id);
 if answer->'ok'='true'::jsonb then
  delete from gm06_canonical.histories h where h.history_id=$2::uuid
   and exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and a.user_id=auth.uid())
   and exists(select 1 from gm20_canonical_private.result_round_rows m where m.result_id=h.result_id);
 end if;
 return answer;
end $$;
revoke all on function public.update_history_consent(text,text,jsonb),public.delete_history(text,text) from public,anon,service_role,gm06_publisher;
grant execute on function public.update_history_consent(text,text,jsonb),public.delete_history(text,text) to authenticated;
revoke all on all functions in schema gm21_canonical_private from public,anon,authenticated,service_role,gm06_publisher;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
 values('0.13.0','dish-session-v4/roadmap-v2/GM-21.3','1.1.0','1.1.0','GM20.4/0035/PR143/e3f7058; GM07.B-supplement/PR138');
commit;
