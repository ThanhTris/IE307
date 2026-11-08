-- QA rollback. No catalogue/pool/result data or prior API is removed.
begin;
drop function public.get_dish_catalogue(jsonb);
drop function public.preview_dish_pool(jsonb);
drop function gm18_api_private.dish_read(jsonb,boolean);
drop function gm18_api_private.dish_card(jsonb);
delete from public.schema_versions where schema_version='0.11.0' and contract_id='dish-catalogue/roadmap-v2/GM-18.2';
commit;
