-- GM-51: admit versioned hosted releases through the existing private catalogue.
begin;
alter table dish_v3_private.catalogues
    drop constraint catalogues_test_only_check,
    add constraint catalogues_hosted_version_check
        check (test_only or id ~ '^dish-catalogue-v1:[0-9]+[.][0-9]+[.][0-9]+:gm18[.]2$');
insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.31.10', 'release-v1/2026-11-20/GM-51.1', '1.1.0', '1.1.0', 'GM-40/0026; GM-47/35c60f1');
commit;
