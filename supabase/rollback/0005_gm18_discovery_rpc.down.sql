-- Administrator-only rollback after stopping GM-18 consumers. No food/core data
-- is removed. No CASCADE: unexpected SQL dependencies must block the rollback.
begin;
drop function public.get_discovery_context(text,text);
drop function public.preview_food_pool(text,jsonb,text,text,text,text,jsonb,jsonb,jsonb);
drop function public.get_result_offerings(text,text);
drop function gm18_api_private.authorize(text);
drop function gm18_api_private.error(text,int);
drop function gm18_api_private.read_snapshot();
drop function gm18_api_private.project_pool(jsonb,jsonb,timestamptz);
drop function gm18_api_private.taxonomy_ids_valid(jsonb,text);
drop table gm18_api_private.read_windows;
drop table gm18_api_private.policy;
drop schema gm18_api_private;
commit;
