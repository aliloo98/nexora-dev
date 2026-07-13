begin;

create table public.user_app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  data jsonb not null,
  data_version smallint not null default 1,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_app_settings_key_format
    check (
      pg_catalog.length(key) between 1 and 128
      and key ~ '^nexora_[a-z0-9_]+$'
    ),
  constraint user_app_settings_data_version_positive
    check (data_version > 0),
  constraint user_app_settings_user_key_unique
    unique (user_id, key)
);

comment on table public.user_app_settings
is 'Versioned per-user JSON settings synchronized by UserAppSettingsService.';

drop trigger if exists user_app_settings_set_updated_at
on public.user_app_settings;

create trigger user_app_settings_set_updated_at
before insert or update on public.user_app_settings
for each row
execute function public.set_updated_at();

alter table public.user_app_settings enable row level security;
alter table public.user_app_settings force row level security;

revoke all on table public.user_app_settings
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.user_app_settings
to authenticated, service_role;

drop policy if exists user_app_settings_select_own
on public.user_app_settings;

create policy user_app_settings_select_own
on public.user_app_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_app_settings_insert_own
on public.user_app_settings;

create policy user_app_settings_insert_own
on public.user_app_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_app_settings_update_own
on public.user_app_settings;

create policy user_app_settings_update_own
on public.user_app_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_app_settings_delete_own
on public.user_app_settings;

create policy user_app_settings_delete_own
on public.user_app_settings
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
