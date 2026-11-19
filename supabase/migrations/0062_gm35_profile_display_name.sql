-- Keep the social profile current when GoTrue accepts a display name edit.
begin;

create function gm22_private.sync_account_display_name() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare
  name_value text := btrim(new.raw_user_meta_data->>'display_name');
begin
  if jsonb_typeof(new.raw_user_meta_data->'display_name') is distinct from 'string'
    or char_length(name_value) not between 1 and 24
    or name_value ~ '[[:cntrl:]]' or name_value !~ '[^[:space:]]' then
    return new;
  end if;

  update public.profiles
  set display_name = name_value, version = coalesce(version, 0) + 1
  where user_id = new.id and display_name is distinct from name_value;
  return new;
end $$;

revoke all on function gm22_private.sync_account_display_name() from public, anon, authenticated, service_role;

create trigger gm35_sync_account_display_name
  after update of raw_user_meta_data on auth.users
  for each row
  when ((old.raw_user_meta_data->'display_name') is distinct from (new.raw_user_meta_data->'display_name'))
  execute function gm22_private.sync_account_display_name();

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.31.7', 'roadmap-v2/GM-35/profile-display-name', '1.1.0', '1.1.0', 'GM-22/0022; base 0061');

commit;
