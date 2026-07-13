begin;

create schema if not exists private;

revoke all on schema private
from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

comment on function public.set_updated_at()
is 'Sets updated_at from the database clock for Nexora tables.';

revoke execute on function public.set_updated_at()
from public, anon, authenticated;

commit;
