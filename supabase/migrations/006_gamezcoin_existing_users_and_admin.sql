-- Backfill Gamezcoin rows for auth users that existed before the Gamezcoin trigger was installed.
insert into public.gamezcoin_profiles(user_id, display_name, referral_code)
select
  u.id,
  coalesce(nullif(split_part(coalesce(u.email,''),'@',1),''), 'Người chơi'),
  upper(substr(replace(u.id::text,'-',''),1,8))
from auth.users u
on conflict (user_id) do nothing;

insert into public.gamezcoin_wallets(user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- Bootstrap the current confirmed Gamezcoin owner account as admin when it exists.
insert into public.gamezcoin_admins(user_id)
select u.id
from auth.users u
where lower(u.email)=lower('mabasuke23@gmail.com')
  and u.email_confirmed_at is not null
on conflict (user_id) do nothing;
