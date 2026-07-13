begin;

create table public.budget_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  type text not null,
  position integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint budget_categories_pkey
    primary key (user_id, id),
  constraint budget_categories_id_format
    check (
      pg_catalog.length(id) between 1 and 128
      and id ~ '^[a-z0-9][a-z0-9_-]*$'
    ),
  constraint budget_categories_name_format
    check (
      name = pg_catalog.btrim(name)
      and pg_catalog.length(name) between 1 and 120
    ),
  constraint budget_categories_type_valid
    check (type in ('income', 'fixed_expense', 'variable_expense')),
  constraint budget_categories_position_non_negative
    check (position >= 0)
);

comment on table public.budget_categories
is 'Per-user budget category definitions used by BudgetCategoriesService.';

create index budget_categories_user_position_idx
on public.budget_categories (user_id, position, id);

drop trigger if exists budget_categories_set_updated_at
on public.budget_categories;

create trigger budget_categories_set_updated_at
before insert or update on public.budget_categories
for each row
execute function public.set_updated_at();

alter table public.budget_categories enable row level security;
alter table public.budget_categories force row level security;

revoke all on table public.budget_categories
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.budget_categories
to authenticated, service_role;

drop policy if exists budget_categories_select_own
on public.budget_categories;

create policy budget_categories_select_own
on public.budget_categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists budget_categories_insert_own
on public.budget_categories;

create policy budget_categories_insert_own
on public.budget_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists budget_categories_update_own
on public.budget_categories;

create policy budget_categories_update_own
on public.budget_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists budget_categories_delete_own
on public.budget_categories;

create policy budget_categories_delete_own
on public.budget_categories
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
