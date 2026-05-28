-- Nexora Phase 3A: Budget categories dynamiques
-- Script preparatoire uniquement. Ne modifie pas les entrees budget existantes.
-- A executer plus tard dans Supabase SQL editor quand la feature UI sera branchee.

create table if not exists public.budget_categories (
  id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','fixed_expense','variable_expense')),
  position integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists budget_categories_user_type_position_idx
on public.budget_categories(user_id, type, position);

create index if not exists budget_categories_user_active_idx
on public.budget_categories(user_id, is_active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_budget_categories on public.budget_categories;
create trigger set_updated_at_on_budget_categories
before update on public.budget_categories
for each row execute function public.set_updated_at();

alter table public.budget_categories enable row level security;

drop policy if exists "budget_categories_select_own_rows" on public.budget_categories;
create policy "budget_categories_select_own_rows"
on public.budget_categories
for select
using (auth.uid() = user_id);

drop policy if exists "budget_categories_insert_own_rows" on public.budget_categories;
create policy "budget_categories_insert_own_rows"
on public.budget_categories
for insert
with check (auth.uid() = user_id);

drop policy if exists "budget_categories_update_own_rows" on public.budget_categories;
create policy "budget_categories_update_own_rows"
on public.budget_categories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "budget_categories_delete_own_rows" on public.budget_categories;
create policy "budget_categories_delete_own_rows"
on public.budget_categories
for delete
using (auth.uid() = user_id);

-- Mapping des anciennes lignes vers categories par defaut.
-- Les ids ci-dessous sont volontairement les data-key historiques de index.html.
-- Cela permettra de brancher l'UI dynamique sans casser les calculs actuels.
--
-- Revenus:
-- rev_ali, rev_megane, rev_excep
--
-- Charges fixes:
-- loyer, credit, assauto, gasoil, elec, eau, psy, diete, itou, sante,
-- impots, box, tel_ali, tel_meg, stream, ps, cb, impfix
--
-- Depenses variables:
-- courses, tabac, sport, ongles, cadeaux, impvar
--
-- TODO Phase 3B: inserer les categories par defaut au login si Supabase est vide.
-- TODO Phase 3B: brancher l'interface de renommage sur budget_categories.name.
-- TODO Phase 3B: brancher le bouton ajouter une ligne sur budget_categories insert.
-- TODO Phase 3B: brancher le bouton masquer une ligne sur is_active=false.
-- TODO Phase 3C: ajouter household_id ou budget_scope pour le mode couple/foyer.
-- TODO Phase 3C: ajouter les categories partagees avec roles et permissions.
