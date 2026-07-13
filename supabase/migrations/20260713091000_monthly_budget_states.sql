begin;

create table public.monthly_budget_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  data jsonb not null default '{}'::jsonb,
  data_version smallint not null default 1,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint monthly_budget_states_month_key_format
    check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint monthly_budget_states_data_is_object
    check (jsonb_typeof(data) = 'object'),
  constraint monthly_budget_states_data_version_positive
    check (data_version > 0),
  constraint monthly_budget_states_user_month_unique
    unique (user_id, month_key)
);

comment on table public.monthly_budget_states
is 'Canonical per-user monthly budget snapshots synchronized by MonthlyBudgetStateService.';

drop trigger if exists monthly_budget_states_set_updated_at
on public.monthly_budget_states;

create trigger monthly_budget_states_set_updated_at
before insert or update on public.monthly_budget_states
for each row
execute function public.set_updated_at();

alter table public.monthly_budget_states enable row level security;
alter table public.monthly_budget_states force row level security;

revoke all on table public.monthly_budget_states
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.monthly_budget_states
to authenticated, service_role;

drop policy if exists monthly_budget_states_select_own
on public.monthly_budget_states;

create policy monthly_budget_states_select_own
on public.monthly_budget_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists monthly_budget_states_insert_own
on public.monthly_budget_states;

create policy monthly_budget_states_insert_own
on public.monthly_budget_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists monthly_budget_states_update_own
on public.monthly_budget_states;

create policy monthly_budget_states_update_own
on public.monthly_budget_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists monthly_budget_states_delete_own
on public.monthly_budget_states;

create policy monthly_budget_states_delete_own
on public.monthly_budget_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
