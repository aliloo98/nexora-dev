begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(18);

select extensions.ok(
  pg_catalog.to_regclass('public.user_app_settings') is not null,
  'user_app_settings exists'
);

select extensions.ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_app_settings'
      and column_name = 'data_version'
      and data_type = 'smallint'
  ),
  'user_app_settings has a smallint data_version'
);

select extensions.ok(
  (
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_catalog.pg_class as c
    where c.oid = 'public.user_app_settings'::pg_catalog.regclass
  ),
  'user_app_settings has forced RLS'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as t
    where t.tgrelid = 'public.user_app_settings'::pg_catalog.regclass
      and t.tgname = 'user_app_settings_set_updated_at'
      and not t.tgisinternal
  ),
  'user_app_settings timestamp trigger exists'
);

select extensions.ok(
  pg_catalog.has_table_privilege('authenticated', 'public.user_app_settings', 'select'),
  'authenticated users have explicit table access'
);

select extensions.ok(
  not pg_catalog.has_table_privilege('anon', 'public.user_app_settings', 'select'),
  'anonymous users have no table access'
);

insert into auth.users (id, email)
values
  ('30000000-0000-4000-8000-000000000003', 'settings-a@example.invalid'),
  ('40000000-0000-4000-8000-000000000004', 'settings-b@example.invalid');

insert into public.user_app_settings (user_id, key, data, updated_at)
values
  (
    '30000000-0000-4000-8000-000000000003',
    'nexora_goals_v1',
    '[{"id":"goal-a","amount":500}]'::jsonb,
    '2100-01-01 00:00:00+00'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    'nexora_goals_v1',
    '[{"id":"goal-b","amount":800}]'::jsonb,
    '2100-01-01 00:00:00+00'
  );

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000003';

select extensions.results_eq(
  $$ select count(*) from public.user_app_settings $$,
  array[1::bigint],
  'settings owner A reads only owner A rows'
);

select extensions.lives_ok(
  $$
    insert into public.user_app_settings (user_id, key, data)
    values (
      '30000000-0000-4000-8000-000000000003',
      'nexora_bill_schedules',
      '[]'::jsonb
    )
  $$,
  'settings owner A can insert an owner A row'
);

select extensions.throws_ok(
  $$
    insert into public.user_app_settings (user_id, key, data)
    values (
      '40000000-0000-4000-8000-000000000004',
      'nexora_debts_v1',
      '[]'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "user_app_settings"',
  'settings owner A cannot insert a row for owner B'
);

select extensions.results_eq(
  $$
    update public.user_app_settings
    set data = '[]'::jsonb
    where user_id = '40000000-0000-4000-8000-000000000004'
    returning key
  $$,
  $$ select null::text where false $$,
  'settings owner A cannot update owner B rows'
);

select extensions.results_eq(
  $$
    delete from public.user_app_settings
    where user_id = '40000000-0000-4000-8000-000000000004'
    returning key
  $$,
  $$ select null::text where false $$,
  'settings owner A cannot delete owner B rows'
);

select extensions.results_eq(
  $$
    update public.user_app_settings
    set data = '[{"id":"goal-a","amount":600}]'::jsonb
    where key = 'nexora_goals_v1'
    returning key
  $$,
  $$ values ('nexora_goals_v1'::text) $$,
  'settings owner A can update an owner A row'
);

select extensions.results_eq(
  $$
    delete from public.user_app_settings
    where key = 'nexora_bill_schedules'
    returning key
  $$,
  $$ values ('nexora_bill_schedules'::text) $$,
  'settings owner A can delete an owner A row'
);

reset role;

select extensions.throws_ok(
  $$
    insert into public.user_app_settings (user_id, key, data)
    values ('30000000-0000-4000-8000-000000000003', 'invalid-key', '{}'::jsonb)
  $$,
  '23514',
  null,
  'setting keys outside the Nexora namespace are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.user_app_settings (user_id, key, data, data_version)
    values (
      '30000000-0000-4000-8000-000000000003',
      'nexora_ai_settings_v1',
      '{}'::jsonb,
      0
    )
  $$,
  '23514',
  null,
  'setting data versions must be positive'
);

select extensions.throws_ok(
  $$
    insert into public.user_app_settings (user_id, key, data)
    values ('30000000-0000-4000-8000-000000000003', 'nexora_goals_v1', '{}'::jsonb)
  $$,
  '23505',
  null,
  'one setting row per user and key is enforced'
);

select extensions.ok(
  (
    select updated_at < '2100-01-01 00:00:00+00'::timestamptz
    from public.user_app_settings
    where user_id = '30000000-0000-4000-8000-000000000003'
      and key = 'nexora_goals_v1'
  ),
  'setting updated_at is controlled by the database clock'
);

delete from auth.users
where id = '40000000-0000-4000-8000-000000000004';

select extensions.results_eq(
  $$
    select count(*)
    from public.user_app_settings
    where user_id = '40000000-0000-4000-8000-000000000004'
  $$,
  array[0::bigint],
  'deleting an auth user cascades to settings'
);

select * from extensions.finish();

rollback;
