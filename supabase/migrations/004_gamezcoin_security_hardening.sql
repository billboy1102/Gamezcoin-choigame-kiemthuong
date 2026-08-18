-- Security hardening after Supabase database advisor review.
create or replace function public.gamezcoin_make_referral_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
$$;

revoke all on function public.gamezcoin_make_referral_code() from public, anon, authenticated;
