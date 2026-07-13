begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(23);

select extensions.ok(
  pg_catalog.to_regclass('public.budget_categories') is not null,
  'budget_categories exists'
);

select extensions.results_eq(
  $$
    select count(*)
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'budget_categories'
      and constraint_type = 'PRIMARY KEY'
  $$,
  array[1::bigint],
  'budget_categories has one composite primary key'
);

select extensions.ok(
  pg_catalog.to_regclass('public.budget_categories_user_position_idx') is not null,
  'budget category ordering index exists'
);

select extensions.ok(
  (
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_catalog.pg_class as c
    where c.oid = 'public.budget_categories'::pg_catalog.regclass
  ),
  'budget_categories has forced RLS'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as t
    where t.tgrelid = 'public.budget_categories'::pg_catalog.regclass
      and t.tgname = 'budget_categories_set_updated_at'
      and not t.tgisinternal
  ),
  'budget_categories timestamp trigger exists'
);

select extensions.ok(
  pg_catalog.has_table_privilege('authenticated', 'public.budget_categories', 'select'),
  'authenticated users have explicit table access'
);

select extensions.ok(
  not pg_catalog.has_table_privilege('anon', 'public.budget_categories', 'select'),
  'anonymous users have no table access'
);

insert into auth.users (id, email)
values
  ('50000000-0000-4000-8000-000000000005', 'category-a@example.invalid'),
  ('60000000-0000-4000-8000-000000000006', 'category-b@example.invalid');

insert into public.budget_categories (
  user_id,
  id,
  name,
  type,
  position,
  is_default,
  updated_at
)
values
  (
    '50000000-0000-4000-8000-000000000005',
    'shared_category',
    'Primary income',
    'income',
    10,
    true,
    '2100-01-01 00:00:00+00'
  ),
  (
    '60000000-0000-4000-8000-000000000006',
    'shared_category',
    'Household income',
    'income',
    10,
    true,
    '2100-01-01 00:00:00+00'
  );

select extensions.results_eq(
  $$
    select count(*)
    from public.budget_categories
    where id = 'shared_category'
  $$,
  array[2::bigint],
  'the same category id can belong to two users'
);

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';

select extensions.results_eq(
  $$ select count(*) from public.budget_categories $$,
  array[1::bigint],
  'category owner A reads only owner A rows'
);

select extensions.lives_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'var_custom_123e4567-e89b-12d3-a456-426614174000',
      'Flexible spending',
      'variable_expense',
      20
    )
  $$,
  'category owner A can insert an owner A category'
);

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '60000000-0000-4000-8000-000000000006',
      'private_category',
      'Private category',
      'fixed_expense',
      30
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "budget_categories"',
  'category owner A cannot insert a category for owner B'
);

select extensions.results_eq(
  $$
    update public.budget_categories
    set name = 'Changed by another user'
    where user_id = '60000000-0000-4000-8000-000000000006'
    returning id
  $$,
  $$ select null::text where false $$,
  'category owner A cannot update owner B categories'
);

select extensions.results_eq(
  $$
    delete from public.budget_categories
    where user_id = '60000000-0000-4000-8000-000000000006'
    returning id
  $$,
  $$ select null::text where false $$,
  'category owner A cannot delete owner B categories'
);

select extensions.results_eq(
  $$
    update public.budget_categories
    set name = 'Updated income'
    where id = 'shared_category'
    returning name
  $$,
  $$ values ('Updated income'::text) $$,
  'category owner A can rename an owner A category'
);

select extensions.results_eq(
  $$
    update public.budget_categories
    set is_active = false
    where id = 'shared_category'
    returning is_active
  $$,
  array[false],
  'category owner A can disable an owner A category'
);

select extensions.results_eq(
  $$
    delete from public.budget_categories
    where id = 'var_custom_123e4567-e89b-12d3-a456-426614174000'
    returning id
  $$,
  $$ values ('var_custom_123e4567-e89b-12d3-a456-426614174000'::text) $$,
  'category owner A can delete an owner A custom category'
);

reset role;

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'Invalid Category',
      'Invalid id',
      'income',
      30
    )
  $$,
  '23514',
  null,
  'category ids with unsafe characters are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'blank_name',
      '   ',
      'income',
      30
    )
  $$,
  '23514',
  null,
  'blank category names are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'invalid_type',
      'Invalid type',
      'transfer',
      30
    )
  $$,
  '23514',
  null,
  'unsupported category types are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'negative_position',
      'Negative position',
      'fixed_expense',
      -1
    )
  $$,
  '23514',
  null,
  'negative category positions are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.budget_categories (user_id, id, name, type, position)
    values (
      '50000000-0000-4000-8000-000000000005',
      'shared_category',
      'Duplicate',
      'income',
      40
    )
  $$,
  '23505',
  null,
  'category ids are unique within one user namespace'
);

select extensions.ok(
  (
    select updated_at < '2100-01-01 00:00:00+00'::timestamptz
    from public.budget_categories
    where user_id = '50000000-0000-4000-8000-000000000005'
      and id = 'shared_category'
  ),
  'category updated_at is controlled by the database clock'
);

delete from auth.users
where id = '60000000-0000-4000-8000-000000000006';

select extensions.results_eq(
  $$
    select count(*)
    from public.budget_categories
    where user_id = '60000000-0000-4000-8000-000000000006'
  $$,
  array[0::bigint],
  'deleting an auth user cascades to budget categories'
);

select * from extensions.finish();

rollback;
