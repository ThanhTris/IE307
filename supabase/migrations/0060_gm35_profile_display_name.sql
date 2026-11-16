-- GoTrue owns the authenticated write. Project the validated display name to social reads.
begin;

create function gm22_private.sync_account_display_name() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare
  display_value text := btrim(new.raw_user_meta_data->>'display_name');
begin
  if new.is_anonymous or jsonb_typeof(new.raw_user_meta_data->'display_name') is distinct from 'string'
    or length(display_value) not between 1 and 24 or display_value ~ '[[:cntrl:]]' then
    return new;
  end if;

  update public.profiles
    set display_name = display_value, version = version + 1
    where user_id = new.id and display_name is distinct from display_value;
  return new;
end;
$$;

revoke all on function gm22_private.sync_account_display_name() from public, anon, authenticated;

create trigger gm35_sync_account_display_name
  after update of raw_user_meta_data on auth.users
  for each row
  when ((old.raw_user_meta_data->'display_name') is distinct from (new.raw_user_meta_data->'display_name'))
  execute function gm22_private.sync_account_display_name();

commit;
