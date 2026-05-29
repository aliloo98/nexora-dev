-- Nexora - synchronisation complete du budget mensuel
-- Source de verite V1: un snapshot JSONB par utilisateur et par mois.

create extension if not exists pgcrypto;

create table if not exists public.monthly_budget_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_budget_states_month_key_format
    check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint monthly_budget_states_user_month_unique
    unique (user_id, month_key)
);

create index if not exists monthly_budget_states_user_month_idx
  on public.monthly_budget_states (user_id, month_key);

create or replace function public.set_monthly_budget_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists monthly_budget_states_set_updated_at on public.monthly_budget_states;
create trigger monthly_budget_states_set_updated_at
before update on public.monthly_budget_states
for each row
execute function public.set_monthly_budget_states_updated_at();

alter table public.monthly_budget_states enable row level security;

drop policy if exists "monthly_budget_states_select_own" on public.monthly_budget_states;
create policy "monthly_budget_states_select_own"
on public.monthly_budget_states
for select
using (auth.uid() = user_id);

drop policy if exists "monthly_budget_states_insert_own" on public.monthly_budget_states;
create policy "monthly_budget_states_insert_own"
on public.monthly_budget_states
for insert
with check (auth.uid() = user_id);

drop policy if exists "monthly_budget_states_update_own" on public.monthly_budget_states;
create policy "monthly_budget_states_update_own"
on public.monthly_budget_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "monthly_budget_states_delete_own" on public.monthly_budget_states;
create policy "monthly_budget_states_delete_own"
on public.monthly_budget_states
for delete
using (auth.uid() = user_id);
