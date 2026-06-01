-- Phase 13: Couples - Collaborative couple mode
-- Entities for shared couple budget, goals, and debts

-- Table: couples
-- Represents a relationship between two users forming a household
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  user_id_1 uuid not null references public.users(id) on delete cascade,
  user_id_2 uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'dissolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraint: cannot form couple with self
  constraint couple_different_users check (user_id_1 < user_id_2),
  -- Ensure unique couple pair
  constraint couples_unique_pair unique (user_id_1, user_id_2)
);

create index if not exists couples_user_id_1_idx on public.couples(user_id_1);
create index if not exists couples_user_id_2_idx on public.couples(user_id_2);

-- Table: couple_invitations
-- Manages the workflow of couple invitations and responses
create table if not exists public.couple_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.users(id) on delete cascade,
  invitee_id uuid references public.users(id) on delete cascade,
  invitee_email text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  invitation_code text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraint: Either invitee_id or invitee_email must be set
  constraint invitation_recipient_check check (invitee_id is not null or invitee_email is not null)
);

create index if not exists couple_invitations_inviter_idx on public.couple_invitations(inviter_id);
create index if not exists couple_invitations_invitee_idx on public.couple_invitations(invitee_id);
create index if not exists couple_invitations_status_idx on public.couple_invitations(status);
create index if not exists couple_invitations_code_idx on public.couple_invitations(invitation_code);

-- Table: shared_items
-- Controls granular sharing of items (private vs shared)
-- Applicable to: revenues, expenses, goals, debts
create table if not exists public.shared_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  item_id uuid not null,
  item_type text not null check (item_type in ('transaction', 'category', 'goal', 'debt', 'account')),
  is_shared boolean not null default false,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_items_couple_idx on public.shared_items(couple_id);
create index if not exists shared_items_item_type_idx on public.shared_items(item_type);
create index if not exists shared_items_couple_type_idx on public.shared_items(couple_id, item_type);

-- Updated_at triggers
create trigger set_updated_at_on_couples
before update on public.couples
for each row execute function public.set_updated_at();

create trigger set_updated_at_on_couple_invitations
before update on public.couple_invitations
for each row execute function public.set_updated_at();

create trigger set_updated_at_on_shared_items
before update on public.shared_items
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.couples enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.shared_items enable row level security;

-- Policies: couples
create policy if not exists "couples_select_own_rows"
on public.couples
for select
using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy if not exists "couples_insert_own_rows"
on public.couples
for insert
with check (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy if not exists "couples_update_own_rows"
on public.couples
for update
using (auth.uid() = user_id_1 or auth.uid() = user_id_2)
with check (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy if not exists "couples_delete_own_rows"
on public.couples
for delete
using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Policies: couple_invitations
create policy if not exists "couple_invitations_select_own_rows"
on public.couple_invitations
for select
using (auth.uid() = inviter_id or auth.uid() = invitee_id);

create policy if not exists "couple_invitations_insert_own_rows"
on public.couple_invitations
for insert
with check (auth.uid() = inviter_id);

create policy if not exists "couple_invitations_update_own_rows"
on public.couple_invitations
for update
using (auth.uid() = inviter_id or auth.uid() = invitee_id)
with check (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Policies: shared_items
create policy if not exists "shared_items_select_own_couple"
on public.shared_items
for select
using (
  couple_id in (
    select id from couples where auth.uid() = user_id_1 or auth.uid() = user_id_2
  )
);

create policy if not exists "shared_items_insert_own_couple"
on public.shared_items
for insert
with check (
  created_by = auth.uid() and
  couple_id in (
    select id from couples where auth.uid() = user_id_1 or auth.uid() = user_id_2
  )
);

create policy if not exists "shared_items_update_own_couple"
on public.shared_items
for update
using (
  couple_id in (
    select id from couples where auth.uid() = user_id_1 or auth.uid() = user_id_2
  )
)
with check (
  couple_id in (
    select id from couples where auth.uid() = user_id_1 or auth.uid() = user_id_2
  )
);

create policy if not exists "shared_items_delete_own_couple"
on public.shared_items
for delete
using (
  couple_id in (
    select id from couples where auth.uid() = user_id_1 or auth.uid() = user_id_2
  )
);
