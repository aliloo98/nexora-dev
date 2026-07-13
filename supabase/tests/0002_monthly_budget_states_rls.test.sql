begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(18);

select extensions.ok(
  pg_catalog.to_regclass('public.monthly_budget_states') is not null,
  'monthly_budget_states exists'
);

select extensions.ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monthly_budget_states'
      and column_name = 'data_version'
      and data_type = 'smallint'
  ),
  'monthly_budget_states has a smallint data_version'
);

select extensions.ok(
  (
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_catalog.pg_class as c
    where c.oid = 'public.monthly_budget_states'::pg_catalog.regclass
  ),
  'monthly_budget_states has forced RLS'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as t
    where t.tgrelid = 'public.monthly_budget_states'::pg_catalog.regclass
      and t.tgname = 'monthly_budget_states_set_updated_at'
      and not t.tgisinternal
  ),
  'monthly_budget_states timestamp trigger exists'
);

select extensions.ok(
  pg_catalog.has_table_privilege('authenticated', 'public.monthly_budget_states', 'select'),
  'authenticated users have explicit table access'
);

select extensions.ok(
  not pg_catalog.has_table_privilege('anon', 'public.monthly_budget_states', 'select'),
  'anonymous users have no table access'
);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'owner-a@example.invalid'),
  ('20000000-0000-4000-8000-000000000002', 'owner-b@example.invalid');

insert into public.monthly_budget_states (user_id, month_key, data, updated_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '2026-01',
    '{"income": 2400}'::jsonb,
    '2100-01-01 00:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '2026-02',
    '{"income": 3100}'::jsonb,
    '2100-01-01 00:00:00+00'
  );

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select extensions.results_eq(
  $$ select count(*) from public.monthly_budget_states $$,
  array[1::bigint],
  'owner A reads only owner A snapshots'
);

select extensions.lives_ok(
  $$
    insert into public.monthly_budget_states (user_id, month_key, data)
    values (
      '10000000-0000-4000-8000-000000000001',
      '2026-03',
      '{"income": 1800}'::jsonb
    )
  $$,
  'owner A can insert an owner A snapshot'
);

select extensions.throws_ok(
  $$
    insert into public.monthly_budget_states (user_id, month_key, data)
    values (
      '20000000-0000-4000-8000-000000000002',
      '2026-04',
      '{}'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "monthly_budget_states"',
  'owner A cannot insert a snapshot for owner B'
);

select extensions.results_eq(
  $$
    update public.monthly_budget_states
    set data = '{"income": 9999}'::jsonb
    where user_id = '20000000-0000-4000-8000-000000000002'
    returning month_key
  $$,
  $$ select null::text where false $$,
  'owner A cannot update owner B snapshots'
);

select extensions.results_eq(
  $$
    delete from public.monthly_budget_states
    where user_id = '20000000-0000-4000-8000-000000000002'
    returning month_key
  $$,
  $$ select null::text where false $$,
  'owner A cannot delete owner B snapshots'
);

select extensions.results_eq(
  $$
    update public.monthly_budget_states
    set data = '{"income": 2500}'::jsonb
    where month_key = '2026-01'
    returning month_key
  $$,
  $$ values ('2026-01'::text) $$,
  'owner A can update an owner A snapshot'
);

select extensions.results_eq(
  $$
    delete from public.monthly_budget_states
    where month_key = '2026-03'
    returning month_key
  $$,
  $$ values ('2026-03'::text) $$,
  'owner A can delete an owner A snapshot'
);

reset role;

select extensions.throws_ok(
  $$
    insert into public.monthly_budget_states (user_id, month_key, data)
    values ('10000000-0000-4000-8000-000000000001', '2026-13', '{}'::jsonb)
  $$,
  '23514',
  'new row for relation "monthly_budget_states" violates check constraint "monthly_budget_states_month_key_format"',
  'invalid calendar months are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.monthly_budget_states (user_id, month_key, data)
    values ('10000000-0000-4000-8000-000000000001', '2026-04', '[]'::jsonb)
  $$,
  '23514',
  'new row for relation "monthly_budget_states" violates check constraint "monthly_budget_states_data_is_object"',
  'non-object snapshots are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.monthly_budget_states (user_id, month_key, data)
    values ('10000000-0000-4000-8000-000000000001', '2026-01', '{}'::jsonb)
  $$,
  '23505',
  null,
  'one snapshot per user and month is enforced'
);

select extensions.ok(
  (
    select updated_at < '2100-01-01 00:00:00+00'::timestamptz
    from public.monthly_budget_states
    where user_id = '10000000-0000-4000-8000-000000000001'
      and month_key = '2026-01'
  ),
  'updated_at is controlled by the database clock'
);

delete from auth.users
where id = '20000000-0000-4000-8000-000000000002';

select extensions.results_eq(
  $$
    select count(*)
    from public.monthly_budget_states
    where user_id = '20000000-0000-4000-8000-000000000002'
  $$,
  array[0::bigint],
  'deleting an auth user cascades to monthly snapshots'
);

select * from extensions.finish();

rollback;
