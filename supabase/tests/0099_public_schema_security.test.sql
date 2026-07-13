begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  array[0::bigint],
  'every public table has RLS enabled'
);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relforcerowsecurity
  $$,
  array[0::bigint],
  'every public table has RLS forced'
);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and (
        pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('%I.%I', n.nspname, c.relname),
          'select'
        )
        or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('%I.%I', n.nspname, c.relname),
          'insert'
        )
        or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('%I.%I', n.nspname, c.relname),
          'update'
        )
        or pg_catalog.has_table_privilege(
          'anon',
          pg_catalog.format('%I.%I', n.nspname, c.relname),
          'delete'
        )
      )
  $$,
  array[0::bigint],
  'anon has no DML privilege on public tables'
);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1
        from pg_catalog.pg_constraint as constraint_record
        where constraint_record.conrelid = c.oid
          and constraint_record.contype = 'p'
      )
  $$,
  array[0::bigint],
  'every public table has a primary key'
);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1
        from pg_catalog.pg_policy as policy_record
        where policy_record.polrelid = c.oid
      )
  $$,
  array[0::bigint],
  'every public table has at least one RLS policy'
);

select extensions.results_eq(
  $$
    select count(*)
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    left join pg_catalog.pg_depend as dependency
      on dependency.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass
      and dependency.objid = p.oid
      and dependency.deptype = 'e'
    where n.nspname = 'public'
      and dependency.objid is null
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as setting
        where setting like 'search_path=%'
      )
  $$,
  array[0::bigint],
  'every public function has a fixed search_path'
);

select * from extensions.finish();

rollback;
