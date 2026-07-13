begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.ok(
  pg_catalog.to_regnamespace('private') is not null,
  'private schema exists'
);

select extensions.ok(
  pg_catalog.to_regprocedure('public.set_updated_at()') is not null,
  'set_updated_at trigger function exists'
);

select extensions.results_eq(
  $$
    select p.prorettype::pg_catalog.regtype::text
    from pg_catalog.pg_proc as p
    where p.oid = pg_catalog.to_regprocedure('public.set_updated_at()')
  $$,
  $$ values ('trigger') $$,
  'set_updated_at returns trigger'
);

select extensions.ok(
  not (
    select p.prosecdef
    from pg_catalog.pg_proc as p
    where p.oid = pg_catalog.to_regprocedure('public.set_updated_at()')
  ),
  'set_updated_at is security invoker'
);

select extensions.ok(
  not pg_catalog.has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select extensions.ok(
  not pg_catalog.has_function_privilege('anon', 'public.set_updated_at()', 'execute'),
  'anon cannot execute set_updated_at directly'
);

select * from extensions.finish();

rollback;
