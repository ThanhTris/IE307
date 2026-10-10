-- GM-08 operational journal. Food wire1.1.0/schema0.1.0 unchanged.
-- Trusted local postgres admin only; no client RPC/login/membership grants.
begin;
create schema gm08_private;
revoke all on schema gm08_private from public, anon, authenticated, gm06_publisher;
create table gm08_private.import_receipts (
  bundle_sha256 text primary key check(bundle_sha256 ~ '^[0-9a-f]{64}$'),
  dataset_version text not null unique,
  review_sha256 text not null check(review_sha256 ~ '^[0-9a-f]{64}$'),
  state text not null check(state in ('published','rolled_back')),
  before_rows jsonb not null check(jsonb_typeof(before_rows)='object'),
  after_rows jsonb not null check(jsonb_typeof(after_rows)='object'),
  published_at timestamptz not null default clock_timestamp(),
  rolled_back_at timestamptz,
  check((state='rolled_back') = (rolled_back_at is not null))
);
alter table gm08_private.import_receipts enable row level security;
alter table gm08_private.import_receipts force row level security;
revoke all on gm08_private.import_receipts from public, anon, authenticated, gm06_publisher;
commit;
