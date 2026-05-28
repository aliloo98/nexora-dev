-- Nexora Phase 2: Transactions, Accounts, Categories, Internal Transfers
-- Use this file in the Supabase SQL editor to create the Phase 2 schema.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('bank','cash','credit_card','savings','investment','other')),
  currency text not null default 'EUR',
  balance numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts(user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income','transfer','uncategorized')),
  parent_category_id uuid references public.categories(id) on delete set null,
  color text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_user_id_idx on public.categories(user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid references public.accounts(id),
  counterparty_account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id),
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  transaction_type text not null check (transaction_type in ('expense','income','transfer','internal_transfer')),
  label text not null,
  note text,
  transaction_date date not null default current_date,
  internal_transfer boolean not null default false,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  analytics_ignore boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  source_origin text not null default 'manual',
  sync_status text not null default 'pending',
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_user_category_idx on public.transactions(user_id, category_id);
create index if not exists transactions_user_account_idx on public.transactions(user_id, account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_on_accounts
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger set_updated_at_on_categories
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_updated_at_on_transactions
before update on public.transactions
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

create policy if not exists "accounts_select_own_rows"
on public.accounts
for select
using (auth.uid() = user_id);

create policy if not exists "accounts_insert_own_rows"
on public.accounts
for insert
with check (auth.uid() = user_id);

create policy if not exists "accounts_update_own_rows"
on public.accounts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "accounts_delete_own_rows"
on public.accounts
for delete
using (auth.uid() = user_id);

alter table public.categories enable row level security;

create policy if not exists "categories_select_own_rows"
on public.categories
for select
using (auth.uid() = user_id);

create policy if not exists "categories_insert_own_rows"
on public.categories
for insert
with check (auth.uid() = user_id);

create policy if not exists "categories_update_own_rows"
on public.categories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "categories_delete_own_rows"
on public.categories
for delete
using (auth.uid() = user_id);

alter table public.transactions enable row level security;

create policy if not exists "transactions_select_own_rows"
on public.transactions
for select
using (auth.uid() = user_id);

create policy if not exists "transactions_insert_own_rows"
on public.transactions
for insert
with check (auth.uid() = user_id);

create policy if not exists "transactions_update_own_rows"
on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "transactions_delete_own_rows"
on public.transactions
for delete
using (auth.uid() = user_id);

-- Internal transfers are represented on the same table
-- with internal_transfer = true and linked_transaction_id.
-- This allows later analytics filtering and avoids counting
-- a single user-to-user movement as both income and expense.
