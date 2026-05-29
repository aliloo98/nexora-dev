-- Phase 12: user_app_settings table for generic per-user app settings

create table if not exists user_app_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  key text not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint per user/key
create unique index if not exists user_app_settings_user_key_idx on user_app_settings (user_id, key);

-- Enable RLS and policy to ensure users can only access their own rows
alter table user_app_settings enable row level security;

-- Policy: users may insert/select/update/delete only their own rows
create policy user_app_settings_policy on user_app_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to update updated_at on row change
create or replace function user_app_settings_update_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_app_settings_updated_at
  before update on user_app_settings
  for each row
  execute procedure user_app_settings_update_timestamp();
